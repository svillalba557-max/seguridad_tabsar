import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { db, collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc } from '../lib/firebase';
import { User, Shield, Lock, Hash, Plus, Trash2, UserMinus, UserPlus, Loader2, Camera, Check, X, ChevronLeft, Calendar, UserCheck, AlertCircle, QrCode, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmationModal from './ui/ConfirmationModal';

import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AppTheme } from '../types';

interface SettingsViewProps {
  user: UserProfile;
  setView: (view: any) => void;
  initialTab?: 'profile' | 'users';
}

export default function SettingsView({ user, setView, initialTab }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>(initialTab || 'profile');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // New user form
  const [newName, setNewName] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newLegajo, setNewLegajo] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'supervisor' | 'guard'>('guard');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editRole, setEditRole] = useState<UserProfile['role']>('guard');
  const [editBiometry, setEditBiometry] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);

  // Profile edit
  const [editPhotoURL, setEditPhotoURL] = useState(user.photoURL || '');
  const [editProfileEmail, setEditProfileEmail] = useState(user.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditPhotoURL(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  // Leave management
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<'vacation' | 'sick' | 'shift-change' | 'personal' | 'permission' | 'other'>('vacation');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveDays, setLeaveDays] = useState('7');
  const [delegateUid, setDelegateUid] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [selectedUserForLeave, setSelectedUserForLeave] = useState<UserProfile | null>(null);

  const { theme: currentTheme, setTheme } = useTheme();

  const isReferente = user.role === 'admin' || user.role === 'supervisor' || user.role === 'ceo' || user.role === 'jefe-seguridad';
  const isClaudia = user.legajo === '528' || user.name?.toLowerCase().includes('claudia');

  useEffect(() => {
    if (isReferente && activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleThemeChange = async (newTheme: AppTheme) => {
    setTheme(newTheme);
    try {
      await updateDoc(doc(db, 'users', user.uid), { theme: newTheme });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClaudia) {
      setError('Solo Claudia Luchini puede dar de alta personal.');
      return;
    }
    setActionLoading('adding');
    try {
      const uid = `dni_${newDni}`;
      const newUser: UserProfile = {
        uid,
        name: newName,
        email: newEmail || `${newDni}@seguridad.local`,
        role: newRole,
        dni: newDni,
        legajo: newLegajo,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName}`,
        active: true,
        completedRounds: 0,
        pendingAlerts: 0,
        status: 'active',
      };
      
      await setDoc(doc(db, 'users', uid), newUser);
      setAllUsers([...allUsers, newUser]);
      setShowAddForm(false);
      setNewName('');
      setNewDni('');
      setNewLegajo('');
      setNewEmail('');
    } catch (error) {
      console.error('Error adding user:', error);
      setError('Error al agregar usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserStatus = async (targetUser: UserProfile) => {
    if (!isClaudia) {
      setError('Solo Claudia Luchini puede modificar el estado del personal.');
      return;
    }
    setActionLoading(targetUser.uid);
    try {
      const newStatus = !targetUser.active;
      await updateDoc(doc(db, 'users', targetUser.uid), { active: newStatus });
      setAllUsers(allUsers.map(u => u.uid === targetUser.uid ? { ...u, active: newStatus } : u));
    } catch (error) {
      console.error('Error toggling user status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleDeleteUser = async (uid: string) => {
    if (!isClaudia) {
      setError('Solo Claudia Luchini puede eliminar personal.');
      return;
    }
    setShowDeleteConfirm(uid);
  };

  const confirmDeleteUser = async (uid: string) => {
    setActionLoading(uid);
    try {
      await deleteDoc(doc(db, 'users', uid));
      setAllUsers(allUsers.filter(u => u.uid !== uid));
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setActionLoading(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !isClaudia) return;
    
    setActionLoading(editingUser.uid);
    try {
      const updateData: any = {
        name: editName,
        email: editEmail,
        dni: editDni,
        role: editRole,
        biometryEnabled: editBiometry
      };
      
      // Special protection: No one can demote Claudia except herself (if she wanted to)
      if (editingUser.legajo === '528' && user.legajo !== '528') {
        setError('No tiene permisos para modificar a la Referente General.');
        return;
      }

      await updateDoc(doc(db, 'users', editingUser.uid), updateData);
      setAllUsers(allUsers.map(u => u.uid === editingUser.uid ? { ...u, ...updateData } : u));
      setEditingUser(null);
      // Success toast or message instead of alert
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Error al actualizar usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        photoURL: editPhotoURL,
        email: editProfileEmail
      });
      window.location.reload(); // Refresh to update global user state
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error al actualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetLeave = async () => {
    if (!leaveStartDate) {
      setError('Por favor, seleccione una fecha de inicio.');
      return;
    }

    const start = new Date(leaveStartDate);
    if (isNaN(start.getTime())) {
      setError('La fecha de inicio seleccionada no es válida.');
      return;
    }

    const days = parseInt(leaveDays);
    if (isNaN(days) || days < 1) {
      setError('Por favor, ingrese una cantidad válida de días (mínimo 1).');
      return;
    }

    setActionLoading('leave');
    try {
      const targetUser = selectedUserForLeave || user;
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      
      if (isNaN(end.getTime())) {
        throw new Error('Invalid end date calculated');
      }

      const updateData: any = {
        status: leaveType,
        leaveStartDate: start.toISOString(),
        leaveEndDate: end.toISOString(),
        leaveReason: leaveReason.trim() || null,
      };

      if (delegateUid && targetUser.role === 'supervisor') {
        updateData.delegatedTo = delegateUid;
        // Update the delegated user to be a temporary referente
        await updateDoc(doc(db, 'users', delegateUid), {
          role: 'supervisor',
          isTemporaryReferente: !isPermanent,
          referenteExpiryDate: isPermanent ? null : end.toISOString()
        });
      }

      await updateDoc(doc(db, 'users', targetUser.uid), updateData);
      setShowLeaveModal(false);
      setSelectedUserForLeave(null);
      window.location.reload();
    } catch (error) {
      console.error('Error setting leave:', error);
      setError('Error al registrar licencia');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-celeste-light">
      <header className="flex items-center gap-4 bg-white px-6 py-4 shadow-sm border-b border-celeste-warm">
        <button onClick={() => setView('profile')} className="rounded-full p-2 hover:bg-celeste-light">
          <ChevronLeft className="h-6 w-6 text-slate-900" />
        </button>
        <h2 className="text-xl font-bold text-slate-900">Ajustes</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tabs */}
        {isReferente && (
          <div className="flex rounded-2xl bg-celeste-warm/50 p-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                activeTab === 'profile' ? 'bg-white text-celeste-dark shadow-sm' : 'text-slate-500'
              }`}
            >
              MI PERFIL
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                activeTab === 'users' ? 'bg-white text-celeste-dark shadow-sm' : 'text-slate-500'
              }`}
            >
              GESTIÓN DE PERSONAL
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'profile' ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="h-24 w-24 overflow-hidden rounded-[30px] border-4 border-white shadow-lg">
                      <img src={editPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="h-full w-full object-cover" />
                    </div>
                    <button onClick={() => profileFileInputRef.current?.click()} className="absolute -bottom-2 -right-2 rounded-full bg-celeste-dark p-2 text-white shadow-lg transition-transform active:scale-95">
                      <Camera className="h-4 w-4" />
                    </button>
                    <input type="file" accept="image/*" ref={profileFileInputRef} onChange={handleProfileImageChange} className="hidden" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-steel-900">{user.name || 'Usuario'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {user.role === 'ceo' ? 'C.E.O' : (user.role === 'jefe-seguridad' ? 'JEFE DE SEGURIDAD' : (user.role === 'supervisor' || user.role === 'admin' ? 'REFERENTE DEL AREA' : 'SEGURIDAD'))}
                    </p>
                  </div>
                </div>

                  <div className="space-y-4">
                    {/* Email Input Removed as per UX updates */}                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">URL de Foto de Perfil</label>
                      <input
                        type="text"
                        value={editPhotoURL}
                        onChange={(e) => setEditPhotoURL(e.target.value)}
                        placeholder="https://ejemplo.com/foto.jpg"
                        className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    
                    <button
                      onClick={handleUpdateProfile}
                      disabled={savingProfile}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-gradient py-4 font-bold text-white shadow-md shadow-celeste-dark/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                      Guardar Cambios
                    </button>

                  {/* Clear Cache and Reload */}
                  <div className="pt-4 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Mantenimiento de Aplicación</p>
                    <button
                      onClick={() => setShowClearCacheConfirm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-xs font-bold text-slate-600 transition-all active:scale-95"
                    >
                      LIMPIAR CACHÉ Y REINICIAR
                    </button>
                  </div>

                  {/* Theme Selection */}
                  <div className="space-y-4 pt-6 border-t border-[var(--border-main)]">
                    <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-tight">Personalización Visual</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'light', name: 'Claro', color: 'bg-white' },
                        { id: 'dark', name: 'Oscuro', color: 'bg-slate-900' },
                        { id: 'sand', name: 'Arena', color: 'bg-[#f5f5dc]' },
                        { id: 'feminine', name: 'Femenino', color: 'bg-rose-100', hidden: !user.name?.toLowerCase().includes('claudia') && user.role !== 'admin' }
                      ].filter(t => !t.hidden).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleThemeChange(t.id as AppTheme)}
                          className={`flex items-center gap-3 rounded-2xl p-4 border-2 transition-all ${
                            currentTheme === t.id ? 'border-blue-500 bg-blue-50' : 'border-[var(--border-main)] bg-[var(--bg-card)]'
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-full border border-slate-200 ${t.color}`} />
                          <span className="text-xs font-bold text-[var(--text-main)]">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Gestión de Dispositivos (Solo Claudia y Delegado) */}
                {(user.legajo === '528' || allUsers.find(u => u.legajo === '528')?.delegatedTo === user.uid) && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <Shield className="h-4 w-4 text-celeste-dark" />
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestión de Dispositivos (Device Binding)</h4>
                    </div>
                    <div className="space-y-2">
                      {allUsers.filter(u => u.deviceId).map(u => (
                        <div key={u.uid} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 border border-slate-200">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-slate-900">{u.name} <span className="text-slate-400 font-normal">({u.role})</span></p>
                            <button
                              onClick={async () => {
                                if (window.confirm(`¿Liberar dispositivo de ${u.name}?`)) {
                                  await updateDoc(doc(db, 'users', u.uid), { deviceId: '' });
                                  fetchUsers();
                                }
                              }}
                              className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded"
                            >
                              Liberar Equipo
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400 font-mono truncate">ID: {u.deviceId}</p>
                        </div>
                      ))}
                      {allUsers.filter(u => u.deviceId).length === 0 && (
                        <p className="text-xs text-slate-400 p-2">No hay dispositivos vinculados.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Absence Management for Claudia, Ricardo and Damian */}
                {(user.legajo === '528' || user.legajo === '553' || user.legajo === '541' || user.name?.toLowerCase().includes('claudia') || user.name?.toLowerCase().includes('ricardo') || user.name?.toLowerCase().includes('damian')) && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <Users className="h-4 w-4 text-celeste-dark" />
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Control de Personal</h4>
                    </div>
                    
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Ausencias y Vacaciones</p>
                          <p className="text-[10px] text-slate-500 mt-1">Registra las vacaciones o inasistencias del personal a tu cargo.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('users')}
                        className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                      >
                        GESTIONAR AUSENCIAS
                      </button>
                    </div>
                  </div>
                )}

                {/* Leave Management Section for Referentes */}
                {isReferente && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <Calendar className="h-4 w-4 text-celeste-dark" />
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestión de Licencias</h4>
                    </div>
                    
                    <div className="rounded-2xl bg-orange-50 p-4 border border-orange-100">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-orange-900">¿Vas a estar ausente?</p>
                          <p className="text-[10px] text-orange-700 mt-1">Registra tu licencia y delega tu rol de Referente si es necesario.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLeaveModal(true)}
                        className="mt-4 w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                      >
                        REGISTRAR MI LICENCIA
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Leave Modal */}
              <AnimatePresence>
                {showLeaveModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowLeaveModal(false)}
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl"
                    >
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
                        {selectedUserForLeave ? `Licencia: ${selectedUserForLeave.name}` : 'Registrar Mi Licencia'}
                      </h3>
                      {(user.name?.includes('Claudia Luchini') || user.name?.includes('Ricardo Herrmann') || user.name?.includes('Alaluf Damian')) && !selectedUserForLeave && (
                        <p className="text-[10px] font-bold text-celeste-dark uppercase tracking-wider mb-6">
                          Gestión Especial: {user.role === 'ceo' ? 'C.E.O Ricardo Herrmann' : (user.role === 'jefe-seguridad' ? 'Jefe de Seguridad Alaluf Damian' : 'Referente Claudia Luchini')}
                        </p>
                      )}
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Motivo de Licencia</label>
                          <select
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value as any)}
                            className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                          >
                            <option value="vacation">Vacaciones</option>
                            <option value="sick">Enfermedad</option>
                            <option value="personal">Problemas Personales</option>
                            <option value="permission">Permiso de Inasistencia</option>
                            <option value="shift-change">Cambio de Turno</option>
                            <option value="other">Otros</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Fecha Inicio</label>
                            <input
                              type="date"
                              value={leaveStartDate}
                              onChange={(e) => setLeaveStartDate(e.target.value)}
                              className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Días</label>
                            <input
                              type="number"
                              value={leaveDays}
                              onChange={(e) => setLeaveDays(e.target.value)}
                              className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Detalle / Motivo (Opcional)</label>
                          <textarea
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                            placeholder="Ej: Viaje familiar, Reposo médico..."
                            rows={2}
                            className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none resize-none"
                          />
                        </div>

                        {((selectedUserForLeave?.role === 'supervisor' || selectedUserForLeave?.role === 'admin') || (!selectedUserForLeave && (user.role === 'supervisor' || user.role === 'admin'))) && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Delegar Rol de Referente a:</label>
                            <select
                              value={delegateUid}
                              onChange={(e) => setDelegateUid(e.target.value)}
                              className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                            >
                              <option value="">No delegar</option>
                              {allUsers.filter(u => u.uid !== (selectedUserForLeave?.uid || user.uid) && u.active).map(u => (
                                <option key={u.uid} value={u.uid}>{u.name} ({u.role === 'supervisor' ? 'Referente' : 'Seguridad'})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {delegateUid && (
                          <div className="flex items-center gap-3 px-2 py-2">
                            <input
                              type="checkbox"
                              id="permanent"
                              checked={isPermanent}
                              onChange={(e) => setIsPermanent(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-celeste-dark focus:ring-celeste-dark"
                            />
                            <label htmlFor="permanent" className="text-xs font-bold text-slate-600">Asignación Permanente</label>
                          </div>
                        )}

                        <div className="pt-4 flex flex-col gap-3">
                          <button
                            onClick={handleSetLeave}
                            disabled={actionLoading === 'leave'}
                            className="w-full rounded-2xl bg-primary-gradient py-4 font-bold text-white shadow-lg shadow-celeste-dark/20 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {actionLoading === 'leave' ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'CONFIRMAR LICENCIA Y DELEGACIÓN'}
                          </button>
                          <button
                            onClick={() => setShowLeaveModal(false)}
                            className="w-full rounded-2xl bg-slate-100 py-4 font-bold text-slate-500 transition-all active:scale-95"
                          >
                            CANCELAR
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Add User Button */}
              {isClaudia && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-gradient py-4 font-bold text-white shadow-lg shadow-celeste-dark/30 transition-all active:scale-95"
                >
                  {showAddForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {showAddForm ? 'Cancelar' : 'Agregar Personal'}
                </button>
              )}

              {/* Add User Form */}
              {showAddForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  onSubmit={handleAddUser}
                  className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">DNI</label>
                      <input
                        type="text"
                        required
                        value={newDni}
                        onChange={(e) => setNewDni(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Legajo</label>
                      <input
                        type="text"
                        required
                        value={newLegajo}
                        onChange={(e) => setNewLegajo(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Email (Para validación Google/Biometría)</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="ejemplo@gmail.com"
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Rol</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="guard">SEGURIDAD</option>
                      <option value="supervisor">REFERENTE DEL AREA</option>
                      <option value="jefe-seguridad">JEFE DE SEGURIDAD</option>
                      <option value="ceo">C.E.O / GERENCIA</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading === 'adding'}
                    className="w-full rounded-2xl bg-primary-gradient py-4 font-bold text-white shadow-md shadow-celeste-dark/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {actionLoading === 'adding' ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Confirmar Alta'}
                  </button>
                </motion.form>
              )}

              {/* Users List */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Personal en el Sistema</p>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                  </div>
                ) : (
                  allUsers.map((u) => (
                    <div key={u.uid} className={`flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm border border-slate-100 transition-opacity ${!u.active ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-2xl border-2 border-slate-50">
                          <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} alt={u.name} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{u.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {u.role === 'supervisor' || u.role === 'admin' ? 'REFERENTE' : 'SEGURIDAD'} • DNI: {u.dni || 'N/A'}
                          </p>
                          <p className="text-[10px] text-celeste-dark font-medium">{u.email}</p>
                          {u.status && u.status !== 'active' && (
                            <p className="text-[9px] font-bold text-orange-600 uppercase mt-0.5">
                              En Licencia ({
                                u.status === 'vacation' ? 'Vacaciones' :
                                u.status === 'sick' ? 'Enfermedad' :
                                u.status === 'personal' ? 'Prob. Personales' :
                                u.status === 'permission' ? 'Permiso' :
                                u.status === 'shift-change' ? 'Cambio Turno' : 'Otros'
                              }) hasta {new Date(u.leaveEndDate!).toLocaleDateString()}
                            </p>
                          )}
                          {u.isTemporaryReferente && (
                            <p className="text-[9px] font-bold text-blue-600 uppercase mt-0.5">
                              Referente Temporal {u.referenteExpiryDate ? `hasta ${new Date(u.referenteExpiryDate).toLocaleDateString()}` : '(Permanente)'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {isClaudia && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setEditName(u.name);
                              setEditEmail(u.email || '');
                              setEditDni(u.dni || '');
                              setEditRole(u.role as any);
                              setEditBiometry(u.biometryEnabled || false);
                            }}
                            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition-all active:scale-90"
                            title="Editar Datos"
                          >
                            <User className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserForLeave(u);
                              setShowLeaveModal(true);
                            }}
                            className="rounded-xl bg-celeste-light p-2 text-celeste-dark transition-all active:scale-90"
                            title="Gestionar Licencia"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(u)}
                            disabled={actionLoading === u.uid}
                            className={`rounded-xl p-2 transition-all active:scale-90 ${
                              u.active ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                            }`}
                            title={u.active ? 'Dar de baja' : 'Dar de alta'}
                          >
                            {actionLoading === u.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : u.active ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.uid)}
                            disabled={actionLoading === u.uid}
                            className="rounded-xl bg-red-50 p-2 text-red-600 transition-all active:scale-90"
                            title="Eliminar permanentemente"
                          >
                            {actionLoading === u.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit User Modal */}
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingUser(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-2xl"
              >
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6">
                  Editar Personal
                </h3>
                
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">DNI del Personal</label>
                    <input
                      type="text"
                      required
                      value={editDni}
                      onChange={(e) => setEditDni(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Email de Validación</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Rol</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                    >
                      <option value="guard">SEGURIDAD</option>
                      <option value="supervisor">REFERENTE DEL AREA</option>
                      <option value="jefe-seguridad">JEFE DE SEGURIDAD</option>
                      <option value="ceo">C.E.O / GERENCIA</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 px-2 py-2 bg-blue-50 rounded-2xl border border-blue-100">
                    <input
                      type="checkbox"
                      id="editBiometry"
                      checked={editBiometry}
                      onChange={(e) => setEditBiometry(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                      <label htmlFor="editBiometry" className="text-xs font-black text-blue-900 uppercase tracking-tight">Habilitar Biometría</label>
                      <p className="text-[9px] text-blue-700 font-medium">Permite al usuario validar su identidad mediante biometría.</p>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={actionLoading === editingUser.uid}
                      className="w-full rounded-2xl bg-primary-gradient py-4 font-bold text-white shadow-lg shadow-celeste-dark/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {actionLoading === editingUser.uid ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'GUARDAR CAMBIOS'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="w-full rounded-2xl bg-slate-100 py-4 font-bold text-slate-500 transition-all active:scale-95"
                    >
                      CANCELAR
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete User Confirmation */}
        <ConfirmationModal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => showDeleteConfirm && confirmDeleteUser(showDeleteConfirm)}
          title="Eliminar Personal"
          message="¿Está seguro de que desea eliminar permanentemente a este usuario? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
        />

        {/* Clear Cache Confirmation */}
        <ConfirmationModal
          isOpen={showClearCacheConfirm}
          onClose={() => setShowClearCacheConfirm(false)}
          onConfirm={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
          title="Limpiar Caché"
          message="¿Desea limpiar el caché y reiniciar la aplicación? Esto puede resolver problemas de carga y actualizar el sistema."
          confirmText="Limpiar y Reiniciar"
          cancelText="Cancelar"
          type="danger"
        />

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-6 right-6 z-[200] flex items-center justify-between rounded-2xl bg-red-500 p-4 text-white shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                <p className="text-xs font-bold uppercase">{error}</p>
              </div>
              <button onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
