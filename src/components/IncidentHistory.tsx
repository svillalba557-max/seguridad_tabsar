import React, { useState, useEffect } from 'react';
import { UserProfile, Incident } from '../types';
import { db, collection, query, where, orderBy, getDocs, limit, auth } from '../lib/firebase';
import { Calendar, Filter, Search, ChevronRight, AlertCircle, Shield, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface IncidentHistoryProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function IncidentHistory({ user, setView }: IncidentHistoryProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchIncidents();
  }, [filterRisk, filterType]);

  const fetchIncidents = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let q = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'), limit(50));

      if (filterRisk !== 'all') {
        q = query(collection(db, 'incidents'), where('riskLevel', '==', filterRisk), orderBy('timestamp', 'desc'), limit(50));
      }
      
      const querySnapshot = await getDocs(q);
      let data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      
      if (filterType !== 'all') {
        data = data.filter(inc => inc.sectorType === filterType);
      }

      setIncidents(data);
    } catch (error) {
      console.warn('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'bajo': return 'bg-green-100 text-green-700 border-green-200';
      case 'medio': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'alto': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'critico': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredIncidents = incidents.filter(inc => 
    inc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900">Historial</h2>
          <p className="text-slate-500">Registro histórico de incidencias y novedades.</p>
        </div>
        <button 
          onClick={() => setView('dashboard')}
          className="rounded-full bg-slate-100 p-2 text-slate-500 transition-all active:scale-90"
        >
          <ChevronRight className="h-6 w-6 rotate-180" />
        </button>
      </div>

      {/* Filters */}
      <div className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            <select 
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full"
            >
              <option value="all">Todos los Riesgos</option>
              <option value="bajo">Riesgo Bajo</option>
              <option value="medio">Riesgo Medio</option>
              <option value="alto">Riesgo Alto</option>
              <option value="critico">Crítico</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <Shield className="h-4 w-4 text-slate-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full"
            >
              <option value="all">Todos los Sectores</option>
              <option value="OPERACIONES">Operaciones</option>
              <option value="PRODUCCIÓN">Producción</option>
              <option value="SEGURIDAD">Seguridad</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="ADMINISTRATIVO">Administrativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-slate-100 p-6 mb-4">
              <Calendar className="h-12 w-12 text-slate-300" />
            </div>
            <p className="font-bold text-slate-900">No se encontraron incidencias</p>
            <p className="text-sm text-slate-400">Intente cambiar los filtros o la búsqueda.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredIncidents.map((incident) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${getRiskColor(incident.riskLevel)}`}>
                      {incident.riskLevel}
                    </div>
                    <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      {incident.sectorType || 'GENERAL'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Clock className="h-3 w-3" />
                    {incident.timestamp?.toDate ? format(incident.timestamp.toDate(), "d MMM, HH:mm", { locale: es }) : 'Reciente'}
                  </div>
                </div>

                <p className="text-sm font-medium text-slate-900 leading-relaxed mb-4">
                  {incident.description}
                </p>

                {incident.aiAnalysis && (
                  <div className="mb-4 rounded-2xl bg-celeste-light/30 p-4 border border-celeste-warm/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-3 w-3 text-celeste-dark" />
                      <span className="text-[10px] font-black text-celeste-dark uppercase tracking-widest">Análisis de IA</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-700 leading-relaxed italic">
                      "{incident.aiAnalysis}"
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-200 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${incident.userId}`} alt="User" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reportado por ID: {incident.userId.substring(0, 5)}</span>
                  </div>
                  <button className="flex items-center gap-1 text-[10px] font-bold text-slate-900 uppercase tracking-widest hover:underline">
                    Ver Detalles
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
