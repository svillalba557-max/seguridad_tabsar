import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { Camera, Upload, Send, Info, Loader2, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import { analyzeIncident } from '../services/geminiService';
import { db, collection, addDoc, serverTimestamp, query, where, getDocs, sendNotification, logActivity } from '../lib/firebase';

interface IncidentReportProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function IncidentReport({ user, setView }: IncidentReportProps) {
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState<'bajo' | 'medio' | 'alto' | 'critico'>('bajo');
  
  const siteName = localStorage.getItem(`patrol_site_${user.uid}`) || '';
  
  let sectorOptions = [
    { value: 'OPERACIONES', label: 'Operaciones (Planta)' },
    { value: 'PERIMETRAL', label: 'Seguridad Perimetral' },
    { value: 'SISTEMAS', label: 'Infraestructura / IT' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento General' }
  ];

  if (siteName.includes('[DEPÓSITO]')) {
    sectorOptions = [
      { value: 'STOCK', label: 'Control de Stock / Inventario' },
      { value: 'CAMIONES', label: 'Acceso de Camiones / Logística' },
      { value: 'PORTONES', label: 'Portones Principales' },
      { value: 'ZONA_CARGA', label: 'Zona de Carga y Descarga' }
    ];
  } else if (siteName.includes('[ADMINISTRACIÓN]')) {
    sectorOptions = [
      { value: 'OFICINAS', label: 'Seguridad de Oficinas' },
      { value: 'RECEPCIÓN', label: 'Recepción y Visitas' },
      { value: 'MARKETING', label: 'Área Marketing' },
      { value: 'SISTEMAS_ADM', label: 'Sistemas y Servidores (Adm)' }
    ];
  }

  const [sectorType, setSectorType] = useState(sectorOptions[0].value);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!description) return;
    setLoading(true);
    try {
      // AI Analysis
      const aiResult = await analyzeIncident(description);
      setAnalysis(aiResult);

      // Save to Firestore
      const incidentRef = await addDoc(collection(db, 'incidents'), {
        userId: user.uid,
        description,
        timestamp: serverTimestamp(),
        aiAnalysis: aiResult,
        riskLevel,
        sectorType,
        siteName: siteName, // Explicitly save location tag
        imageUrl: imagePreview,
        location: { lat: 19.4326, lng: -99.1332 } // Mock location
      });

      // Log Activity
      await logActivity({
        userId: user.uid,
        userName: user.name,
        type: 'incident',
        details: `Novedad (${siteName}): ${description.substring(0, 50)}...`,
        incidentId: incidentRef.id,
        sectorName: sectorType,
        locationName: siteName
      });

      // Notify Supervisors
      const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'supervisor']));
      const supervisorDocs = await getDocs(q);
      
      const notificationPromises = supervisorDocs.docs.map(doc => 
        sendNotification(
          doc.id, 
          'Nueva Incidencia', 
          `${user.name} ha reportado una novedad: ${description.substring(0, 50)}...`,
          'incident'
        )
      );
      await Promise.all(notificationPromises);

      setTimeout(() => {
        setView('dashboard');
      }, 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-[var(--bg-main)] min-h-full">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">Nueva Novedad</h2>
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Registro de Incidencias Operativas</p>
      </div>

      <div className="rounded-[2.5rem] bg-[var(--bg-card)] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[var(--border-main)] space-y-8">
        {/* Visual Evidence */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Evidencia Visual</p>
          <div className="grid gap-4">
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageChange} className="hidden" />
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            
            {imagePreview ? (
              <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 bg-[var(--bg-main)]">
                <img src={imagePreview} alt="Preview" loading="lazy" className="w-full h-48 object-cover" />
                <button onClick={() => setImagePreview(null)} className="absolute top-2 right-2 rounded-full bg-slate-900/80 p-2 text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[var(--border-main)] p-10 transition-all hover:border-celeste-dark hover:bg-[var(--bg-main)] group">
                  <div className="rounded-2xl bg-[var(--bg-main)] p-4 text-[var(--text-muted)] group-hover:bg-celeste-light group-hover:text-celeste-dark transition-colors">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-[var(--text-main)] uppercase text-xs">Capturar Imagen</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mt-1">Cámara de Alta Resolución</p>
                  </div>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--bg-main)] px-6 py-4 text-xs font-black text-[var(--text-muted)] transition-all active:scale-95 border border-[var(--border-main)]">
                  <Upload className="h-4 w-4" />
                  SUBIR ARCHIVO
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Descripción Técnica</p>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describa la novedad de manera precisa..."
            className="w-full min-h-[120px] rounded-2xl bg-[var(--bg-main)] p-4 text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] border border-[var(--border-main)] focus:outline-none focus:ring-2 focus:ring-celeste-dark/20 focus:border-celeste-dark transition-all"
          />
        </div>

        {/* Classification */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Nivel de Riesgo</p>
            <select 
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as any)}
              className="w-full rounded-2xl bg-[var(--bg-main)] p-4 text-xs font-black text-[var(--text-main)] border border-[var(--border-main)] focus:outline-none focus:ring-2 focus:ring-celeste-dark/20"
            >
              <option value="bajo">BAJO</option>
              <option value="medio">MEDIO</option>
              <option value="alto">ALTO</option>
              <option value="critico">CRÍTICO</option>
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo de Sector</p>
            <select 
              value={sectorType}
              onChange={(e) => setSectorType(e.target.value)}
              className="w-full rounded-2xl bg-[var(--bg-main)] p-4 text-xs font-black text-[var(--text-main)] border border-[var(--border-main)] focus:outline-none focus:ring-2 focus:ring-celeste-dark/20"
            >
              {sectorOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* AI Analysis Result */}
        {analysis && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-steel-900 p-6 text-white shadow-xl border border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="flex items-center gap-2 mb-3 text-blue-400 relative z-10">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Análisis de Inteligencia</span>
            </div>
            <p className="text-xs text-steel-200 leading-relaxed relative z-10 font-medium">{analysis}</p>
          </motion.div>
        )}

        <button 
          onClick={handleSubmit}
          disabled={loading || !description}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-celeste-gradient py-5 text-xs font-black text-white shadow-xl shadow-blue-500/20 transition-all hover:shadow-2xl active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="h-5 w-5" />
              ENVIAR REPORTE OFICIAL
            </>
          )}
        </button>
      </div>
    </div>
  );
}
