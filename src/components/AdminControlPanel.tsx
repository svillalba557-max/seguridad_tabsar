import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { db, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, getDocs, auth } from '../lib/firebase';
import { Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Info, Send, Loader2, ChevronLeft, LayoutGrid, ListTodo, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  createdAt: string;
}

interface AppUpdate {
  id: string;
  title: string;
  content: string;
  version?: string;
  type: 'feature' | 'fix' | 'announcement';
  timestamp: string;
}

interface AdminControlPanelProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function AdminControlPanel({ user, setView }: AdminControlPanelProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'updates'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'task' | 'update' } | null>(null);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Update Form State
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [updateType, setUpdateType] = useState<'feature' | 'fix' | 'announcement'>('announcement');
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // Fetch Tasks
    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (err) => {
      console.warn('Tasks snapshot error:', err);
    });

    // Fetch Updates
    const updatesQuery = query(collection(db, 'app_updates'), orderBy('timestamp', 'desc'));
    const unsubscribeUpdates = onSnapshot(updatesQuery, (snapshot) => {
      setUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUpdate)));
    }, (err) => {
      console.warn('Updates snapshot error:', err);
    });

    // Fetch Users for assignment
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(snapshot.docs.map(doc => doc.data() as UserProfile).filter(u => u.active));
      } catch (err) {
        console.warn('Error fetching users:', err);
      }
    };
    fetchUsers();

    setLoading(false);

    return () => {
      unsubscribeTasks();
      unsubscribeUpdates();
    };
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setSubmitting(true);

    try {
      const assignedUser = users.find(u => u.uid === taskAssignedTo);
      await addDoc(collection(db, 'tasks'), {
        title: taskTitle,
        description: taskDesc,
        assignedTo: taskAssignedTo || null,
        assignedToName: assignedUser?.name || 'Todo el personal',
        status: 'pending',
        priority: taskPriority,
        createdAt: new Date().toISOString()
      });
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignedTo('');
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateContent.trim()) return;
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'app_updates'), {
        title: updateTitle,
        content: updateContent,
        type: updateType,
        timestamp: new Date().toISOString()
      });
      setUpdateTitle('');
      setUpdateContent('');
      setShowUpdateForm(false);
    } catch (error) {
      console.error('Error adding update:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: currentStatus === 'pending' ? 'completed' : 'pending'
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    try {
      await deleteDoc(doc(db, 'app_updates', updateId));
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting update:', error);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex items-center gap-4 bg-white px-6 py-4 shadow-sm border-b border-slate-100">
        <button onClick={() => setView('dashboard')} className="rounded-full p-2 hover:bg-slate-100">
          <ChevronLeft className="h-6 w-6 text-slate-900" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Panel de Control</h2>
          <p className="text-[10px] font-bold text-celeste-dark uppercase tracking-widest">
            {user.role === 'ceo' ? 'Ricardo Herrmann • C.E.O' : (user.role === 'jefe-seguridad' ? 'Alaluf Damian • Jefe de Seguridad' : 'Claudia Luchini • Gestión Administrativa')}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex rounded-2xl bg-slate-200/50 p-1">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
              activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            TAREAS
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
              activeTab === 'updates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Newspaper className="h-4 w-4" />
            ACTUALIZACIONES
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'tasks' ? (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-900/20 transition-all active:scale-95"
              >
                {showTaskForm ? <ChevronLeft className="h-5 w-5 rotate-90" /> : <Plus className="h-5 w-5" />}
                {showTaskForm ? 'Cerrar Formulario' : 'Nueva Tarea'}
              </button>

              {showTaskForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  onSubmit={handleAddTask}
                  className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Título de la Tarea</label>
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                      placeholder="Ej: Revisión de extintores sector A"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Descripción</label>
                    <textarea
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none resize-none"
                      rows={3}
                      placeholder="Detalles adicionales..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Prioridad</label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as any)}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                      >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Asignar a</label>
                      <select
                        value={taskAssignedTo}
                        onChange={(e) => setTaskAssignedTo(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                      >
                        <option value="">Todo el personal</option>
                        {users.map(u => (
                          <option key={u.uid} value={u.uid}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-primary-gradient py-4 font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Publicar Tarea'}
                  </button>
                </motion.form>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Tareas Recientes</h3>
                {tasks.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                    <ListTodo className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No hay tareas pendientes</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className={`rounded-3xl bg-white p-5 shadow-sm border border-slate-100 space-y-3 transition-opacity ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 rounded-full p-1.5 ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                            task.priority === 'medium' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {task.priority === 'urgent' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{task.title}</h4>
                            <p className="text-xs text-slate-500">{task.description}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setConfirmDelete({ id: task.id, type: 'task' })} 
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Asignado a:</span>
                          <span className="text-[10px] font-bold text-slate-700">{task.assignedToName}</span>
                        </div>
                        <button
                          onClick={() => toggleTaskStatus(task.id, task.status)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-bold transition-all ${
                            task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {task.status === 'completed' ? 'COMPLETADA' : 'PENDIENTE'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="updates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <button
                onClick={() => setShowUpdateForm(!showUpdateForm)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-celeste-dark py-4 font-bold text-white shadow-lg shadow-celeste-dark/20 transition-all active:scale-95"
              >
                {showUpdateForm ? <ChevronLeft className="h-5 w-5 rotate-90" /> : <Plus className="h-5 w-5" />}
                {showUpdateForm ? 'Cerrar Formulario' : 'Nueva Actualización'}
              </button>

              {showUpdateForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  onSubmit={handleAddUpdate}
                  className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Título de la Noticia</label>
                    <input
                      type="text"
                      required
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                      placeholder="Ej: Nueva función de escaneo"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Contenido</label>
                    <textarea
                      required
                      value={updateContent}
                      onChange={(e) => setUpdateContent(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none resize-none"
                      rows={4}
                      placeholder="Escriba el mensaje para el personal..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Tipo</label>
                    <select
                      value={updateType}
                      onChange={(e) => setUpdateType(e.target.value as any)}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none"
                    >
                      <option value="announcement">Anuncio General</option>
                      <option value="feature">Nueva Función</option>
                      <option value="fix">Corrección de Error</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-primary-gradient py-4 font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Publicar Noticia'}
                  </button>
                </motion.form>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Historial de Actualizaciones</h3>
                {updates.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Newspaper className="h-12 w-12 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No hay actualizaciones publicadas</p>
                  </div>
                ) : (
                  updates.map((update) => (
                    <div key={update.id} className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`rounded-lg p-1.5 ${
                            update.type === 'feature' ? 'bg-green-100 text-green-600' :
                            update.type === 'fix' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {update.type === 'feature' ? <Plus className="h-3 w-3" /> : 
                             update.type === 'fix' ? <Info className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {update.type === 'feature' ? 'NUEVA FUNCIÓN' : 
                             update.type === 'fix' ? 'MEJORA' : 'ANUNCIO'}
                          </span>
                        </div>
                        <button 
                          onClick={() => setConfirmDelete({ id: update.id, type: 'update' })} 
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{update.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{update.content}</p>
                      </div>
                      <div className="pt-2 flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                        <Clock className="h-3 w-3" />
                        {new Date(update.timestamp).toLocaleDateString()} • {new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-[2.5rem] bg-white p-8 shadow-2xl text-center space-y-6"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">¿Confirmar Eliminación?</h3>
                <p className="text-sm text-slate-500 mt-2">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-slate-600 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmDelete.type === 'task' ? handleDeleteTask(confirmDelete.id) : handleDeleteUpdate(confirmDelete.id)}
                  className="flex-1 rounded-2xl bg-red-600 py-4 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
