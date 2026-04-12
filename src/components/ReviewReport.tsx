import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { Camera, Upload, Send, X, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, serverTimestamp, sendNotification, logActivity } from '../lib/firebase';

interface ReviewReportProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function ReviewReport({ user, setView }: ReviewReportProps) {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Por favor, ingrese una descripción de la novedad.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Save the review to Firestore
      const reviewData = {
        userId: user.uid,
        userName: user.name,
        description,
        images,
        type: 'revision_fuera_recorrido',
        timestamp: serverTimestamp(),
        status: 'pending'
      };

      const docRef = await addDoc(collection(db, 'reviews'), reviewData);

      // 2. Log Activity
      await logActivity({
        userId: user.uid,
        userName: user.name,
        type: 'incident',
        details: `Nueva revisión fuera de recorrido: ${description.substring(0, 30)}...`,
      });

      // 3. Notify Claudia (Supervisor/Admin)
      await sendNotification(
        'system_supervisor_alert', 
        '⚠️ NUEVA REVISIÓN FUERA DE RECORRIDO',
        `${user.name} ha reportado una novedad: ${description.substring(0, 50)}...`,
        'alert'
      );

      setSuccess(true);
      setTimeout(() => {
        setView('dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Error al enviar el reporte. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-full bg-green-100 p-6 text-green-600 mb-6"
        >
          <CheckCircle2 className="h-16 w-16" />
        </motion.div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Reporte Enviado</h2>
        <p className="text-slate-500 mt-2">La novedad ha sido registrada y Claudia ha sido notificada.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Revisiones</h2>
            <p className="text-slate-500 text-sm font-medium">Novedades fuera de recorrido</p>
          </div>
          <button 
            onClick={() => setView('dashboard')}
            className="rounded-full bg-white p-2 text-slate-400 shadow-sm border border-slate-100 transition-all active:scale-90"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Observations */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
              <FileText className="h-3 w-3" />
              Observaciones / Detalle de lo sucedido
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describa detalladamente la novedad encontrada fuera del recorrido habitual..."
              className="w-full h-40 rounded-3xl bg-white border border-slate-200 p-5 text-sm focus:outline-none focus:ring-2 focus:ring-celeste-dark/20 transition-all resize-none shadow-sm"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
              <Camera className="h-3 w-3" />
              Evidencia Fotográfica
            </label>
            
            <div className="grid grid-cols-3 gap-3">
              <AnimatePresence>
                {images.map((img, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
                  >
                    <img src={img} alt="Evidencia" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white backdrop-blur-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {images.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition-all hover:border-celeste-dark hover:text-celeste-dark active:scale-95"
                >
                  <Upload className="h-6 w-6 mb-1" />
                  <span className="text-[8px] font-bold uppercase">Subir</span>
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-red-600 border border-red-100">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient py-5 font-bold text-white shadow-xl shadow-celeste-dark/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            ENVIAR REVISIÓN
          </button>
        </form>
      </div>
    </div>
  );
}
