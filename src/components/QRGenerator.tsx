import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Sector } from '../types';
import { QrCode, Download, List, ShieldCheck, Lock, ChevronLeft, Plus, X, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SECTORES as DEFAULT_SECTORES, APP_LOGO_URL } from '../constants';
import { db, collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from '../lib/firebase';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface QRGeneratorProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function QRGenerator({ user, setView }: QRGeneratorProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorType, setNewSectorType] = useState('SEGURIDAD');
  const [isAdding, setIsAdding] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Only Claudia (Referente) can generate/view QRs
  const isClaudia = user.legajo === '528' || user.name?.toLowerCase().includes('claudia');

  useEffect(() => {
    if (!isClaudia) return;

    const unsubscribe = onSnapshot(collection(db, 'sectors'), (snapshot) => {
      const sectorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sector[];
      
      const hasMockData = sectorsData.some(s => s.name.startsWith("Punto de Control Perimetral"));
      
      if (hasMockData) {
        // Auto-cleanup incorrectly seeded mock data
        performCleanup(sectorsData);
      } else if (sectorsData.length < DEFAULT_SECTORES.length) {
        // Seed missing sectors
        seedMissingSectors(sectorsData);
      } else {
        setSectors(sectorsData);
        if (!selectedSector && sectorsData.length > 0) {
          setSelectedSector(sectorsData[0]);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isClaudia]);

  const seedMissingSectors = async (existingData: Sector[]) => {
    try {
      setLoading(true);
      const existingNames = new Set(existingData.map(s => s.name));
      const newSectors = DEFAULT_SECTORES.filter(sector => !existingNames.has(sector.name));
      
      for (const sector of newSectors) {
        await addDoc(collection(db, 'sectors'), {
          name: sector.name,
          type: sector.type,
          location: sector.location,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error seeding missing sectors:', error);
    }
  };

  const performCleanup = async (existingData: Sector[]) => {
    try {
      setLoading(true);
      for (const sector of existingData) {
        if (sector.name.startsWith("Punto de Control Perimetral")) {
          await deleteDoc(doc(db, 'sectors', sector.id));
        }
      }
    } catch (error) {
      console.error('Error cleaning up sectors:', error);
    }
  };

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName.trim()) return;

    setIsAdding(true);
    try {
      await addDoc(collection(db, 'sectors'), {
        name: newSectorName.trim(),
        type: newSectorType,
        location: { lat: -34.6037, lng: -58.3816 }, // Default location
        createdAt: serverTimestamp()
      });
      setNewSectorName('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding sector:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const downloadPDF = async () => {
    if (!qrRef.current || !selectedSector) return;
    
    const canvas = await html2canvas(qrRef.current);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`QR_${selectedSector.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadAllPDFs = async () => {
    setIsGeneratingPDF(true);
    await new Promise(r => setTimeout(r, 100)); // Allow UI to update loading state
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const elements = document.querySelectorAll('.all-qrs-container > div');
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const canvas = element.querySelector('canvas');
        
        if (!canvas) continue;
        
        const imgData = canvas.toDataURL('image/png');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        if (i > 0) pdf.addPage();
        
        // Background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
        
        // Border
        pdf.setLineWidth(1.5);
        pdf.setDrawColor(15, 23, 42);
        pdf.rect(10, 10, pdfWidth - 20, pdfHeight - 20);

        // Name
        const sectorName = element.getAttribute('data-name') || sectors[i]?.name || 'PUNTO DE CONTROL';
        pdf.setFontSize(28);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(15, 23, 42);
        const splitTitle = pdf.splitTextToSize(sectorName.toUpperCase(), pdfWidth - 40);
        pdf.text(splitTitle, pdfWidth / 2, 40, { align: 'center' });
        
        // QR Image
        const qrSize = 140;
        pdf.addImage(imgData, 'PNG', (pdfWidth - qrSize) / 2, 80, qrSize, qrSize);
        
        // Legal Text
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "normal");
        pdf.text("De uso exclusivo para el personal de Seguridad.", pdfWidth / 2, 250, { align: 'center' });
      }
      
      pdf.save('Todos_los_QRs_Sectores.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!isClaudia) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="rounded-full bg-red-100 p-6">
          <Lock className="h-12 w-12 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Acceso Restringido</h2>
        <p className="text-slate-500">
          Solo la Referente del Área (Claudia Luchini) tiene permisos para generar y descargar códigos QR de sectores.
        </p>
        <button 
          onClick={() => setView('dashboard')}
          className="rounded-xl bg-slate-900 px-8 py-3 font-bold text-white"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="rounded-full p-2 hover:bg-slate-100">
          <ChevronLeft className="h-6 w-6 text-slate-900" />
        </button>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900">Generador de QR</h2>
          <p className="text-slate-500 text-xs">Gestión de acceso por sector industrial.</p>
        </div>
      </div>

      {/* Add Sector Form */}
      {showAddForm && (
        <motion.form
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          onSubmit={handleAddSector}
          className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-4 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Nuevo Punto de Control</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Nombre del Sector</label>
            <input
              type="text"
              required
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              placeholder="Ej: Salida de Emergencia Ramallo"
              className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Tipo de Área</label>
            <select
              value={newSectorType}
              onChange={(e) => setNewSectorType(e.target.value)}
              className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="SEGURIDAD">SEGURIDAD</option>
              <option value="OPERACIONES">OPERACIONES</option>
              <option value="PRODUCCIÓN">PRODUCCIÓN</option>
              <option value="MANTENIMIENTO">MANTENIMIENTO</option>
              <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
              <option value="SERVICIOS">SERVICIOS</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="w-full rounded-2xl bg-primary-gradient py-4 font-bold text-white shadow-md shadow-celeste-dark/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isAdding ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Confirmar Nuevo Punto'}
          </button>
        </motion.form>
      )}

      {/* Sectors List */}
      <div className="rounded-3xl bg-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-900">
            <List className="h-5 w-5" />
            <span className="font-bold">Sectores Disponibles</span>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-[10px] font-bold text-slate-900 shadow-sm border border-slate-200"
          >
            <Plus className="h-3 w-3" />
            NUEVO
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : (
            sectors.map((sector) => (
              <div 
                key={sector.id}
                className={`flex items-center justify-between rounded-2xl p-4 transition-all ${
                  selectedSector?.id === sector.id ? 'bg-white shadow-md' : 'bg-white/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-slate-900 p-3 text-white">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{sector.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {sector.type} • ID: {sector.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSector(sector)}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-bold text-white transition-all active:scale-95"
                >
                  Seleccionar
                </button>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={downloadAllPDFs}
          disabled={isGeneratingPDF}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg transition-all active:scale-95 hover:bg-blue-700 disabled:opacity-50 disabled:active:scale-100"
        >
          {isGeneratingPDF ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {isGeneratingPDF ? 'Generando PDF (Puede tomar unos segundos)...' : 'Generar Todos los QRs (PDF)'}
        </button>
      </div>

      {/* Hidden container for generating all QRs */}
      <div className="all-qrs-container fixed -left-[9999px] top-0">
        {sectors.map((sector) => (
          <div key={sector.id} data-name={sector.name} className="bg-white p-10 text-center border-[8px] border-slate-900 inline-block">
            <div className="mb-6 text-3xl font-black uppercase tracking-tighter text-slate-900">
              {sector.name}
            </div>
            <QRCodeCanvas 
              value={`TABSAR_SEC_${sector.id}`} 
              size={400}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: APP_LOGO_URL,
                x: undefined,
                y: undefined,
                height: 80,
                width: 80,
                excavate: true,
              }}
            />
            <div className="mt-6 text-sm font-bold text-slate-900 uppercase tracking-widest">
              De uso exclusivo para el personal de Seguridad.
            </div>
          </div>
        ))}
      </div>

      {/* QR Detail View */}
      <AnimatePresence mode="wait">
        {selectedSector && (
          <motion.div 
            key={selectedSector.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100 space-y-8 text-center"
          >
            <div ref={qrRef} className="bg-white p-8 rounded-3xl border-4 border-slate-900 inline-block">
              <div className="mb-4 text-xl font-black uppercase tracking-tighter text-slate-900">
                {selectedSector.name}
              </div>
              <QRCodeCanvas 
                value={`TABSAR_SEC_${selectedSector.id}`} 
                size={200}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: APP_LOGO_URL,
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
              <div className="mt-4 text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                De uso exclusivo para el personal de Seguridad.
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={downloadPDF}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 font-bold text-white shadow-lg transition-all active:scale-95"
              >
                <Download className="h-5 w-5" />
                Descargar PDF para Imprimir
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-blue-900">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <p className="text-[10px] font-bold text-left leading-tight">
                Este código QR es único y solo puede ser escaneado por esta aplicación oficial.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
