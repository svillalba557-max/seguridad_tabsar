import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { db, collection, query, orderBy, onSnapshot, where, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Clock, 
  User, 
  MapPin, 
  AlertTriangle, 
  FileText, 
  Mail, 
  Sparkles, 
  ChevronRight, 
  Calendar,
  Image as ImageIcon,
  X,
  Send,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { generatePatrolSummary } from '../services/geminiService';

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  type: 'scan' | 'patrol-start' | 'patrol-end' | 'incident' | 'revision_fuera_recorrido';
  sectorId?: string;
  sectorName?: string;
  timestamp: any;
  details?: string;
  duration?: string;
  imageUrl?: string;
}

interface ActivityCenterProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function ActivityCenter({ user, setView }: ActivityCenterProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatrol, setSelectedPatrol] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // Combine activities and reviews for Claudia
    const qActivities = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
    const qReviews = query(collection(db, 'reviews'), orderBy('timestamp', 'desc'));

    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      
      setActivities(prev => {
        const combined = [...logs, ...prev.filter(a => a.type === 'revision_fuera_recorrido')];
        return combined.sort((a, b) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
          return timeB - timeA;
        });
      });
      setLoading(false);
    }, (err) => {
      console.warn('Activities snapshot error:', err);
      setLoading(false);
    });

    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      const reviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'revision_fuera_recorrido',
        details: (doc.data() as any).description
      })) as ActivityLog[];

      setActivities(prev => {
        const combined = [...prev.filter(a => a.type !== 'revision_fuera_recorrido'), ...reviews];
        return combined.sort((a, b) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
          return timeB - timeA;
        });
      });
    }, (err) => {
      console.warn('Reviews snapshot error:', err);
    });

    return () => {
      unsubActivities();
      unsubReviews();
    };
  }, []);

  const handleGenerateSummary = async (patrolActivities: ActivityLog[]) => {
    setIsGenerating(true);
    const start = patrolActivities.find(a => a.type === 'patrol-start');
    const end = patrolActivities.find(a => a.type === 'patrol-end');
    const scans = patrolActivities.filter(a => a.type === 'scan');
    const incidents = patrolActivities.filter(a => a.type === 'incident');

    const data = {
      userName: start?.userName || patrolActivities[0].userName,
      startTime: start?.timestamp?.toDate().toLocaleString() || 'N/A',
      endTime: end?.timestamp?.toDate().toLocaleString() || 'N/A',
      duration: end?.duration || 'En curso',
      scans,
      incidents
    };

    const summary = await generatePatrolSummary(data);
    setAiSummary(summary);
    setIsGenerating(false);
  };

  const handleSendEmail = () => {
    setIsSending(true);
    // Simulate sending email
    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setShowEmailModal(false);
      }, 2000);
    }, 1500);
  };

  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'scan': return <MapPin className="h-4 w-4" />;
      case 'patrol-start': return <Activity className="h-4 w-4" />;
      case 'patrol-end': return <CheckCircle2 className="h-4 w-4" />;
      case 'incident': return <AlertTriangle className="h-4 w-4" />;
      case 'revision_fuera_recorrido': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'scan': return 'bg-blue-100 text-blue-600';
      case 'patrol-start': return 'bg-green-100 text-green-600';
      case 'patrol-end': return 'bg-purple-100 text-purple-600';
      case 'incident': return 'bg-red-100 text-red-600';
      case 'revision_fuera_recorrido': return 'bg-orange-100 text-orange-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-main)]">
      {/* Header */}
      <div className="bg-[var(--bg-card)] px-6 py-6 shadow-sm border-b border-[var(--border-main)]">
        <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">Centro de Actividades</h2>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Claudia Luchini • Referente</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--text-muted)] border-t-transparent" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-card)] rounded-3xl border border-dashed border-[var(--border-main)]">
            <Activity className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)] font-bold uppercase text-[10px]">No hay actividades registradas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-card)] rounded-2xl p-4 shadow-sm border border-[var(--border-main)]"
              >
                <div 
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => activity.type === 'revision_fuera_recorrido' && setSelectedActivity(activity)}
                >
                  <div className="flex gap-3">
                    <div className={`rounded-xl p-2.5 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[var(--text-main)] uppercase">{activity.userName}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--border-main)]" />
                        <span className="text-[9px] font-bold text-[var(--text-muted)]">
                          {activity.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[var(--text-main)] mt-1 opacity-80">{activity.details}</p>
                      {activity.sectorName && (
                        <div className="flex items-center gap-1 mt-1.5 text-[9px] font-black text-celeste-dark uppercase tracking-wider">
                          <MapPin className="h-3 w-3" />
                          {activity.sectorName}
                        </div>
                      )}
                    </div>
                  </div>
                  {activity.imageUrl && (
                    <button className="rounded-lg bg-[var(--bg-main)] p-2 text-[var(--text-muted)] border border-[var(--border-main)]">
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* AI Report Section */}
        <div className="bg-steel-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-steel-900/40 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
          
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="rounded-2xl bg-blue-500/20 p-3 backdrop-blur-md">
              <Sparkles className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Informe de IA</h3>
              <p className="text-[10px] font-bold text-steel-400 uppercase tracking-widest">Análisis Predictivo y Resumen</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl p-6 border border-white/10 relative z-10">
            {aiSummary ? (
              <div className="space-y-6">
                <p className="text-sm leading-relaxed text-steel-200 font-medium">{aiSummary}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowEmailModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-xs font-black transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/20"
                  >
                    <Mail className="h-4 w-4" />
                    ENVIAR REPORTE
                  </button>
                  <button 
                    onClick={() => setAiSummary(null)}
                    className="rounded-2xl bg-white/10 px-6 py-4 text-xs font-black transition-all hover:bg-white/20"
                  >
                    REHACER
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-steel-400 mb-6 font-medium">Genera un informe ejecutivo detallado del último recorrido utilizando el motor de inteligencia artificial.</p>
                <button 
                  onClick={() => handleGenerateSummary(activities.slice(0, 10))}
                  disabled={isGenerating || activities.length === 0}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white text-steel-900 py-4 text-xs font-black transition-all hover:bg-steel-50 active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  GENERAR INFORME EJECUTIVO
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Detail Modal (for Reviews) */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedActivity(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-[2.5rem] bg-[var(--bg-card)] p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedActivity(null)}
                className="absolute right-6 top-6 rounded-full bg-[var(--bg-main)] p-2 text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-6">
                <div className={`w-fit rounded-2xl p-3 mb-4 ${getActivityColor(selectedActivity.type)}`}>
                  {getActivityIcon(selectedActivity.type)}
                </div>
                <h3 className="text-xl font-black text-[var(--text-main)] uppercase">Detalle de Revisión</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase">Reportado por {selectedActivity.userName}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Observaciones</label>
                  <div className="rounded-2xl bg-[var(--bg-main)] p-4 text-sm text-[var(--text-main)] border border-[var(--border-main)]">
                    {selectedActivity.details}
                  </div>
                </div>

                {(selectedActivity as any).images && (selectedActivity as any).images.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Evidencia</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(selectedActivity as any).images.map((img: string, idx: number) => (
                        <img key={idx} src={img} alt="Evidencia" className="rounded-xl w-full h-32 object-cover border border-[var(--border-main)]" />
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedActivity(null)}
                  className="w-full rounded-2xl bg-slate-900 py-4 font-black text-white transition-all active:scale-95"
                >
                  CERRAR DETALLE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmailModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-[2.5rem] bg-[var(--bg-card)] p-8 shadow-2xl"
            >
              <button 
                onClick={() => setShowEmailModal(false)}
                className="absolute right-6 top-6 rounded-full bg-[var(--bg-main)] p-2 text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center mb-8">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-[var(--text-main)] uppercase">Enviar Informe</h3>
                <p className="text-xs font-bold text-[var(--text-muted)] mt-1 uppercase">Claudia Luchini • Referente</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Email Destinatario</label>
                  <input 
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="ejemplo@sarandi.com"
                    className="w-full rounded-2xl bg-[var(--bg-main)] py-4 px-6 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-[var(--border-main)] font-bold"
                  />
                </div>

                <button 
                  onClick={handleSendEmail}
                  disabled={isSending || !emailTo}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-5 font-black text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : sentSuccess ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {sentSuccess ? 'ENVIADO CON ÉXITO' : 'ENVIAR AHORA'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}
