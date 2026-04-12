import React, { useState, useEffect } from 'react';
import { UserProfile, Sector, Incident, Patrol } from '../types';
import { db, collection, query, orderBy, limit, onSnapshot, getDocs, auth } from '../lib/firebase';
import { 
  TrendingUp, 
  Users, 
  Shield, 
  AlertTriangle, 
  Activity, 
  Clock, 
  MapPin, 
  ChevronRight, 
  BarChart3, 
  FileText, 
  Bell,
  Search,
  Filter,
  Calendar,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MapComponent from './MapComponent';

interface ExecutiveDashboardProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function ExecutiveDashboard({ user, setView }: ExecutiveDashboardProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePatrols: 0,
    totalIncidentsToday: 0,
    completedRoundsToday: 0,
    activeGuards: 0
  });
  const [delegatedGuardName, setDelegatedGuardName] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // Fetch Sectors
    const fetchSectors = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sectors'));
        setSectors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector)));
      } catch (err) {
        console.warn('Error fetching sectors:', err);
      }
    };
    fetchSectors();

    // Real-time Incidents
    const incidentsQuery = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribeIncidents = onSnapshot(incidentsQuery, (snapshot) => {
      setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
    }, (err) => {
      console.warn('Incidents snapshot error:', err);
    });

    // Real-time Activities
    const activitiesQuery = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      setRecentActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn('Activities snapshot error:', err);
    });

    // Stats Logic
    const fetchStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const activeGuards = usersSnapshot.docs.filter(d => d.data().active && d.data().role === 'guard').length;
        
        const incidentsSnapshot = await getDocs(collection(db, 'incidents'));
        const todayIncidents = incidentsSnapshot.docs.filter(d => {
          const ts = d.data().timestamp;
          const date = ts?.toDate ? ts.toDate() : new Date(ts);
          return date >= today;
        }).length;

        const activitiesSnapshot = await getDocs(collection(db, 'activities'));
        const todayRounds = activitiesSnapshot.docs.filter(d => {
          const data = d.data();
          const ts = data.timestamp;
          const date = ts?.toDate ? ts.toDate() : new Date(ts);
          return date >= today && data.type === 'patrol-end';
        }).length;

        const delegatedUser = usersSnapshot.docs.find(d => d.data().isTemporaryReferente);
        if (delegatedUser) {
          setDelegatedGuardName(delegatedUser.data().name);
        }

        setStats({
          activeGuards,
          activePatrols: Math.max(0, activeGuards - 1), // Simplified logic
          totalIncidentsToday: todayIncidents,
          completedRoundsToday: todayRounds
        });
      } catch (err) {
        console.warn('Error fetching stats:', err);
      }
    };
    fetchStats();

    setLoading(false);

    return () => {
      unsubscribeIncidents();
      unsubscribeActivities();
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] text-slate-200 overflow-hidden font-sans">
      {/* Executive Header - Recipe 1: Technical Dashboard */}
      <header className="flex h-20 shrink-0 items-center justify-between px-8 bg-[#111111] border-b border-white/10 z-50">
        <div className="flex items-center gap-6">
          <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-xl">
            <Shield className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white uppercase leading-none">
              Executive Command
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] mt-1.5">
              {user.role === 'ceo' ? 'Ricardo Herrmann • C.E.O' : 
               (user.role === 'jefe-seguridad' ? 'Alaluf Damian • Jefe de Seguridad' : 
               'Claudia Luchini • Referente General')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-6 mr-8 px-6 border-r border-white/10">
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Estado del Sistema</p>
              <p className="text-xs font-mono text-emerald-400">OPERATIVO 100%</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Última Alerta</p>
              <p className="text-xs font-mono text-slate-300">HACE 12 MIN</p>
            </div>
          </div>
          <button 
            onClick={() => setView('admin-panel')}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[10px] font-black text-black hover:bg-slate-200 transition-all active:scale-95"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            PANEL DE CONTROL
          </button>
          <button className="relative rounded-lg bg-white/5 p-2.5 text-slate-400 hover:text-white transition-all border border-white/10">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-[#111111]"></span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        {delegatedGuardName && (user.legajo === '541' || user.legajo === '553') && (
          <div className="bg-blue-600/20 text-blue-400 p-4 rounded-2xl border border-blue-500/30 text-xs font-bold uppercase flex items-center justify-center tracking-widest shadow-lg">
            ⚠️ Funciones administrativas delegadas temporalmente a {delegatedGuardName}
          </div>
        )}

        {/* Key Performance Indicators - Recipe 8: Clean Utility */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            icon={<Activity className="h-5 w-5" />} 
            label="Patrullas Activas" 
            value={stats.activePatrols} 
            trend="+2"
            trendType="up"
            color="bg-blue-500/10 text-blue-400"
          />
          <KPICard 
            icon={<AlertTriangle className="h-5 w-5" />} 
            label="Incidencias Hoy" 
            value={stats.totalIncidentsToday} 
            trend="-15%"
            trendType="down"
            color="bg-orange-500/10 text-orange-400"
          />
          <KPICard 
            icon={<TrendingUp className="h-5 w-5" />} 
            label="Rondas Completas" 
            value={stats.completedRoundsToday} 
            trend="+5"
            trendType="up"
            color="bg-emerald-500/10 text-emerald-400"
          />
          <KPICard 
            icon={<Users className="h-5 w-5" />} 
            label="Personal Activo" 
            value={stats.activeGuards} 
            trend="Estable"
            trendType="neutral"
            color="bg-indigo-500/10 text-indigo-400"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Real-time Map Monitoring */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                  Monitoreo Táctico en Vivo
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">Visualización geográfica de puntos de control y personal</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-white/5 px-3 py-1.5 text-[10px] font-bold text-slate-400 border border-white/10 hover:bg-white/10 transition-colors">DESCARGAR LOGS</button>
                <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white shadow-lg shadow-blue-600/20">VISTA SATELITAL</button>
              </div>
            </div>
            <div className="h-[450px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group">
              <MapComponent 
                sectors={sectors} 
                onSectorClick={() => {}} 
                currentStep={0} 
              />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-2xl bg-black/60 backdrop-blur-xl p-6 border border-white/10 shadow-2xl flex items-center justify-between">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sectores Seguros</p>
                      <p className="text-xl font-mono text-emerald-400">12 <span className="text-[10px] text-slate-500 ml-1">/ 14</span></p>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Puntos de Riesgo</p>
                      <p className="text-xl font-mono text-orange-400">02</p>
                    </div>
                  </div>
                  <button className="rounded-xl bg-white/10 px-4 py-2 text-[10px] font-bold text-white hover:bg-white/20 transition-colors">
                    DETALLES DE SECTOR
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Alerts - Recipe 1: Technical Dashboard */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Alertas Críticas
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">Eventos que requieren atención inmediata</p>
            </div>
            <div className="space-y-4">
              {incidents.length === 0 ? (
                <div className="rounded-3xl bg-white/[0.02] border border-dashed border-white/10 p-16 text-center">
                  <Shield className="h-12 w-12 text-slate-800 mx-auto mb-4 opacity-20" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sin alertas activas</p>
                </div>
              ) : (
                incidents.map((incident) => (
                  <motion.div 
                    key={incident.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-white/[0.03] p-5 border border-white/10 hover:bg-white/[0.06] transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          incident.riskLevel === 'critico' ? 'text-red-500' :
                          incident.riskLevel === 'alto' ? 'text-orange-500' :
                          'text-blue-500'
                        }`}>
                          NIVEL {incident.riskLevel}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          REF: INC-{incident.id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-1 rounded">
                        {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">{incident.description}</h4>
                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-slate-800 overflow-hidden border border-white/10">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${incident.userId}`} alt="User" loading="lazy" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reporte de Campo</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                  </motion.div>
                ))
              )}
              <button 
                onClick={() => setView('history')}
                className="w-full rounded-xl bg-white/5 py-4 text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/10 uppercase tracking-widest"
              >
                Auditar Historial Completo
              </button>
            </div>
          </div>
        </div>

        {/* Global Activity Log - Recipe 1: Technical Dashboard */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                Registro Maestro de Operaciones
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">Trazabilidad completa de eventos en tiempo real</p>
            </div>
            <button className="flex items-center gap-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors">
              <Download className="h-3.5 w-3.5" />
              EXPORTAR CSV
            </button>
          </div>
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10">
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Operador</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Tipo de Evento</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Ubicación / Sector</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-white/[0.04] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-800 overflow-hidden border border-white/10">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${act.userName}`} alt="User" loading="lazy" />
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{act.userName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded border ${
                        act.type === 'incident' ? 'text-red-400 bg-red-400/5 border-red-400/20' :
                        act.type === 'patrol-start' ? 'text-blue-400 bg-blue-400/5 border-blue-400/20' :
                        'text-emerald-400 bg-emerald-400/5 border-emerald-400/20'
                      }`}>
                        {act.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-slate-600" />
                        <span className="text-xs font-medium text-slate-400">{act.sectorName || 'Punto No Definido'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-[11px] font-mono text-slate-500">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-8 py-5">
                      <button className="text-slate-600 hover:text-white transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive Actions Grid */}
        <div className="space-y-6 pb-12">
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Terminal de Gestión Ejecutiva
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(user.legajo === '528' || user.isTemporaryReferente) && (
              <ExecutiveAction 
                icon={<FileText className="h-5 w-5" />} 
                title="Generar Informe Ejecutivo" 
                desc="Auditoría de turnos y desempeño"
                onClick={() => setView('shift-report')}
              />
            )}
            <ExecutiveAction 
              icon={<Users className="h-5 w-5" />} 
              title="Gestión de Personal" 
              desc="Control de roles y validaciones"
              onClick={() => setView('users')}
            />
            <ExecutiveAction 
              icon={<Calendar className="h-5 w-5" />} 
              title="Planificación" 
              desc="Asignación de objetivos críticos"
              onClick={() => setView('admin-panel')}
            />
            <ExecutiveAction 
              icon={<Filter className="h-5 w-5" />} 
              title="Configuración" 
              desc="Parámetros globales del sistema"
              onClick={() => setView('settings')}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function KPICard({ icon, label, value, trend, trendType, color }: any) {
  return (
    <div className="rounded-3xl bg-white/[0.03] p-6 border border-white/10 shadow-xl relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 h-24 w-24 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-white/[0.05] transition-all"></div>
      <div className="flex items-center justify-between mb-6">
        <div className={`rounded-xl p-3 ${color} border border-white/5`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${
          trendType === 'up' ? 'text-emerald-400 bg-emerald-400/10' : 
          trendType === 'down' ? 'text-red-400 bg-red-400/10' : 
          'text-slate-500 bg-slate-500/10'
        }`}>
          {trendType === 'up' ? <ArrowUpRight className="h-3 w-3" /> : 
           trendType === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
          {trend}
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</p>
      <p className="text-4xl font-mono font-black text-white mt-2 tracking-tighter">{value}</p>
    </div>
  );
}

function ExecutiveAction({ icon, title, desc, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col gap-4 rounded-3xl bg-white/[0.03] p-6 border border-white/10 hover:bg-white/[0.06] transition-all text-left group relative overflow-hidden"
    >
      <div className="rounded-xl bg-white/5 p-3 text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-all w-fit border border-white/5">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-black text-white uppercase tracking-tight">{title}</h4>
        <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">{desc}</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
        Acceder <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  );
}
