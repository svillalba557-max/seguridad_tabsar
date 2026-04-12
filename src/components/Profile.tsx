import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Settings, Users, ArrowRight, User as UserIcon, Shield, Bell, FileText, LogOut, Sparkles, Image as ImageIcon, Loader2, AlertTriangle, Mail, Calendar, LayoutGrid, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmationModal from './ui/ConfirmationModal';
import { auth, signOut, db, collection, query, where, getDocs, sendNotification } from '../lib/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { generateSecurityAsset } from '../services/geminiService';
import { RONDINES, SUPERVISORES } from '../constants';

import { useDeviceDetection } from '../hooks/useDeviceDetection';

interface ProfileProps {
  user: UserProfile;
  setView: (view: any) => void;
  onLogout: () => void;
}

export default function Profile({ user, setView, onLogout }: ProfileProps) {
  const { deviceType, os } = useDeviceDetection();
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);

  const teamMembers = [...SUPERVISORES, ...RONDINES];
  const isReferente = user.role === 'admin' || user.role === 'supervisor' || user.role === 'ceo' || user.role === 'jefe-seguridad';
  const isClaudia = user.legajo === '528' || user.name?.toLowerCase().includes('claudia');

  const handleLogout = () => {
    localStorage.removeItem('tabsar_legajo');
    onLogout();
  };

  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleAssignRoute = async (member: any) => {
    setAssigning(member.name);
    try {
      // Find the user in Firestore to get their UID
      const q = query(collection(db, 'users'), where('name', '==', member.name));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const targetUserId = querySnapshot.docs[0].id;
        await sendNotification(
          targetUserId,
          'Nueva Ruta Asignada',
          `El supervisor ${user.name} te ha asignado una nueva ruta de patrullaje.`,
          'patrol'
        );
        setMessage({ text: `Ruta asignada a ${member.name}`, type: 'success' });
      } else {
        setMessage({ text: `${member.name} aún no se ha registrado en el sistema.`, type: 'error' });
      }
    } catch (error) {
      console.error('Error assigning route:', error);
      setMessage({ text: 'Error al asignar ruta', type: 'error' });
    } finally {
      setAssigning(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleGenerateImage = async () => {
    setGenerating(true);
    try {
      const prompt = "A high-quality cinematic portrait of a professional security supervisor in a modern industrial setting, realistic, 8k";
      const imageUrl = await generateSecurityAsset(prompt);
      if (imageUrl) setGeneratedImage(imageUrl);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 p-6 bg-[var(--bg-main)]">
      {/* Profile Header */}
      <div className="relative flex flex-col items-center pt-8">
        {user.status && user.status !== 'active' && (
          <div className="absolute top-0 left-0 right-0 flex justify-center">
            <div className="rounded-full bg-orange-100 px-4 py-1.5 text-[10px] font-bold text-orange-700 ring-4 ring-[var(--bg-card)] shadow-sm flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              EN LICENCIA ({user.status.toUpperCase()}) HASTA {new Date(user.leaveEndDate!).toLocaleDateString()}
              {user.leaveReason && <span className="ml-1 opacity-60 italic">• {user.leaveReason}</span>}
            </div>
          </div>
        )}
        {user.isTemporaryReferente && (
          <div className="absolute top-12 left-0 right-0 flex justify-center">
            <div className="rounded-full bg-blue-100 px-4 py-1.5 text-[10px] font-bold text-blue-700 ring-4 ring-[var(--bg-card)] shadow-sm flex items-center gap-2">
              <Shield className="h-3 w-3" />
              REFERENTE TEMPORAL {user.referenteExpiryDate ? `(Vence: ${new Date(user.referenteExpiryDate).toLocaleDateString()})` : '(Permanente)'}
            </div>
          </div>
        )}
        <button 
          onClick={() => setView('settings')}
          className="absolute right-0 top-0 rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)] transition-all active:scale-90"
        >
          <Settings className="h-6 w-6" />
        </button>
        
        <div className="relative">
          <div className="h-32 w-32 overflow-hidden rounded-[40px] border-4 border-[var(--bg-card)] shadow-xl">
            <img 
              src={generatedImage || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="Profile" 
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
              }}
            />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-[10px] font-bold text-green-700 ring-4 ring-[var(--bg-card)]">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            ACTIVE
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-3xl font-bold text-[var(--text-main)]">{user.name || 'Usuario'}</h2>
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
            {user.role === 'ceo' ? 'C.E.O' : (user.role === 'jefe-seguridad' ? 'JEFE DE SEGURIDAD' : (user.role === 'admin' || user.role === 'supervisor' ? 'REFERENTE DEL AREA' : 'SEGURIDAD'))}
          </p>
        </div>
      </div>

      {/* AI Image Generation Feature */}
      <div className="rounded-3xl bg-gradient-to-br from-celeste-dark to-sky-900 p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-celeste-warm" />
          <span className="text-sm font-bold uppercase tracking-wider">Gemini Intelligence</span>
        </div>
        <h3 className="text-xl font-bold mb-2">Generar Activo Visual</h3>
        <p className="text-xs text-celeste-light/80 mb-6 leading-relaxed">
          Genera una imagen de perfil o activo de seguridad de alta calidad usando IA.
        </p>
        
        <div className="flex gap-2 mb-6">
          {(["1K", "2K", "4K"] as const).map((size) => (
            <button
              key={size}
              onClick={() => setImageSize(size)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                imageSize === size ? 'bg-white text-celeste-dark' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        <button 
          onClick={handleGenerateImage}
          disabled={generating}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 font-bold text-celeste-dark transition-all hover:bg-celeste-light active:scale-95 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5" />
              Generar con Gemini
            </>
          )}
        </button>
      </div>

      {/* Team Management */}
      {(user.role === 'admin' || user.role === 'supervisor') && (
        <div className="rounded-3xl bg-[var(--bg-card)] p-6 shadow-sm border border-[var(--border-main)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-main)]">Gestionar Equipo</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">{teamMembers.length} Miembros Totales</p>
            </div>
            <button className="rounded-xl bg-celeste-dark p-3 text-white">
              <Users className="h-6 w-6" />
            </button>
          </div>
          
          <div className="space-y-3">
            {teamMembers.slice(0, 6).map((member, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl bg-[var(--bg-main)] p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} alt={member.name} referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-main)]">{member.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{member.role === 'supervisor' ? 'Referente' : 'Seguridad'}</p>
                  </div>
                </div>
                {member.role === 'guard' && (
                  <button 
                    onClick={() => handleAssignRoute(member)}
                    disabled={assigning === member.name}
                    className="rounded-xl bg-primary-gradient px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {assigning === member.name ? 'Asignando...' : 'Asignar Ruta'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-[var(--bg-card)] p-6 shadow-sm border border-[var(--border-main)]">
          <div className="rounded-lg bg-celeste-light p-2 w-fit mb-3">
            <FileText className="h-4 w-4 text-celeste-dark" />
          </div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Rondas Completadas</p>
          <p className="text-3xl font-bold text-[var(--text-main)] mt-1">{user.completedRounds}</p>
        </div>
        <div className="rounded-3xl bg-[var(--bg-card)] p-6 shadow-sm border border-[var(--border-main)]">
          <div className="rounded-lg bg-red-50 p-2 w-fit mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Alertas Pendientes</p>
          <p className="text-3xl font-bold text-[var(--text-main)] mt-1">{user.pendingAlerts.toString().padStart(2, '0')}</p>
        </div>
      </div>

      {/* App Install QR Code (Only for Referente Claudia) */}
      {(user.legajo === '528' || user.name?.toLowerCase().includes('claudia')) && (
        <div className="rounded-3xl bg-blue-50 p-6 shadow-sm border border-blue-100 flex flex-col items-center justify-center text-center">
          <div className="rounded-xl bg-white p-4 shadow-sm mb-4 inline-block border border-blue-100">
            <QRCodeSVG value={window.location.origin} size={160} level="H" includeMargin={true} fgColor="#1e3a8a" />
          </div>
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-tight">QR de Instalación Directa</h3>
          <p className="text-[10px] text-blue-700 mt-2 font-medium">Ofrezca este código al personal nuevo para que lo escaneen con las cámaras de sus móviles. La aplicación se abrirá sola permitiéndoles instalarla.</p>
        </div>
      )}

      {/* Device Info */}
      <div className="rounded-3xl bg-[var(--bg-card)] p-6 shadow-sm border border-[var(--border-main)]">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Dispositivo Detectado</p>
            <h4 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">{deviceType} • {os}</h4>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(user.role === 'admin' || user.role === 'supervisor') && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Gestión de Seguridad</p>
          <button 
            onClick={() => setView('history')}
            className="flex w-full items-center justify-between rounded-3xl bg-[var(--bg-card)] p-6 shadow-sm border border-[var(--border-main)] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-primary-gradient p-3 text-white shadow-md shadow-celeste-dark/20">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-[var(--text-main)]">Historial de Incidencias</p>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Revisar y filtrar reportes pasados</p>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-[var(--text-muted)]" />
          </button>

          <button 
            onClick={() => setView('shift-report')}
            className="flex w-full items-center justify-between rounded-3xl bg-[var(--bg-card)] p-6 shadow-sm border border-[var(--border-main)] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-primary-gradient p-3 text-white shadow-md shadow-celeste-dark/20">
                <Mail className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-[var(--text-main)]">Reportes de Turno</p>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Enviar informe a gerencia</p>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-[var(--text-muted)]" />
          </button>

          {(user.legajo === '528' || user.name?.toLowerCase().includes('claudia')) && (
            <button 
              onClick={() => setView('admin-panel')}
              className="flex w-full items-center justify-between rounded-3xl bg-slate-900 p-6 shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white/10 p-3 text-white">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-white">Panel de Control</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Tareas y Actualizaciones</p>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-white/50" />
            </button>
          )}
        </div>
      )}

      {/* Settings List */}
      <div className="space-y-4">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Configuración de Cuenta</p>
        <div className="rounded-3xl bg-[var(--bg-card)] overflow-hidden shadow-sm border border-[var(--border-main)] divide-y divide-[var(--border-main)]">
          <ProfileItem 
            onClick={() => setView('settings')}
            icon={<UserIcon className="h-5 w-5" />} 
            title="Ajustes de Perfil" 
            subtitle="Cambiar foto y datos personales" 
          />
          {isReferente && (
            <ProfileItem 
              onClick={() => setView('users')}
              icon={<Users className="h-5 w-5" />} 
              title="Gestión de Personal" 
              subtitle={isClaudia ? "Altas, bajas y administración de equipo" : "Ver estado del personal y licencias"} 
            />
          )}
          <ProfileItem 
            onClick={() => setMessage({ text: 'Opciones de seguridad en desarrollo por §€B∆', type: 'success' })}
            icon={<Shield className="h-5 w-5" />} 
            title="Seguridad y Acceso" 
            subtitle="Configuraciones avanzadas de seguridad" 
          />
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 px-6 py-5 font-bold text-red-500 transition-all active:scale-95"
      >
        <LogOut className="h-5 w-5" />
        Cerrar Sesión
      </button>

      <button 
        onClick={() => setShowClearCacheConfirm(true)}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-100 px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all active:scale-95"
      >
        Limpiar Caché y Reiniciar
      </button>

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
        message="¿Desea limpiar el caché y reiniciar la aplicación? Esto puede resolver problemas de carga."
        confirmText="Limpiar y Reiniciar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Message Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-6 right-6 z-[200] flex items-center justify-between rounded-2xl p-4 text-white shadow-2xl ${
              message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              <p className="text-xs font-bold uppercase">{message.text}</p>
            </div>
            <button onClick={() => setMessage(null)}>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileItem({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex w-full items-center justify-between p-6 transition-colors hover:bg-[var(--bg-main)]"
    >
      <div className="flex items-center gap-4">
        <div className="text-[var(--text-muted)]">{icon}</div>
        <div className="text-left">
          <p className="font-bold text-[var(--text-main)]">{title}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-[var(--text-muted)]" />
    </button>
  );
}
