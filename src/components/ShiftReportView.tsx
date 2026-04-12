import React, { useState, useEffect } from 'react';
import { UserProfile, Patrol, Incident } from '../types';
import { db, collection, query, where, getDocs, orderBy, limit } from '../lib/firebase';
import { SHIFTS, MANAGEMENT_EMAIL } from '../constants';
import { FileText, Send, Clock, Shield, AlertTriangle, ChevronRight, Loader2, Mail, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfDay, endOfDay, addHours, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateShiftSummary } from '../services/geminiService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ShiftReportViewProps {
  user: UserProfile;
  setView: (view: any) => void;
}

export default function ShiftReportView({ user, setView }: ShiftReportViewProps) {
  const [selectedShift, setSelectedShift] = useState(SHIFTS[0]);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('TODAS');
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [absentUsers, setAbsentUsers] = useState<UserProfile[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    fetchShiftData();
  }, [selectedShift]);

  const fetchShiftData = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const today = startOfDay(new Date());
      let shiftStart: Date;
      let shiftEnd: Date;

      const [startHour, startMin] = selectedShift.start.split(':').map(Number);
      const [endHour, endMin] = selectedShift.end.split(':').map(Number);

      shiftStart = addHours(today, startHour);
      
      if (selectedShift.id === 'night') {
        // Night shift spans two days
        shiftEnd = addHours(today, 24 + endHour);
      } else {
        shiftEnd = addHours(today, endHour);
      }

      // Query patrols
      const pQuery = query(
        collection(db, 'patrols'),
        where('startTime', '>=', shiftStart),
        where('startTime', '<=', shiftEnd),
        orderBy('startTime', 'desc')
      );
      const pSnapshot = await getDocs(pQuery);
      setPatrols(pSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patrol)));

      // Query incidents
      const iQuery = query(
        collection(db, 'incidents'),
        where('timestamp', '>=', shiftStart),
        where('timestamp', '<=', shiftEnd),
        orderBy('timestamp', 'desc')
      );
      const iSnapshot = await getDocs(iQuery);
      const incidentsData = iSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(incidentsData);

      // Fetch user names for incidents
      const userIds = Array.from(new Set(incidentsData.map(i => i.userId)));
      if (userIds.length > 0) {
        const uQuery = query(collection(db, 'users'), where('uid', 'in', userIds));
        const uSnapshot = await getDocs(uQuery);
        const names: Record<string, string> = {};
        uSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          names[userData.uid] = userData.name;
        });
        setUserNames(names);
      }

      // Fetch absent users (those on leave during this shift)
      const uLeaveQuery = query(
        collection(db, 'users'),
        where('status', '!=', 'active')
      );
      const uLeaveSnapshot = await getDocs(uLeaveQuery);
      const absent = uLeaveSnapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => {
          if (!u.leaveStartDate || !u.leaveEndDate) return false;
          const start = new Date(u.leaveStartDate);
          const end = new Date(u.leaveEndDate);
          return (start <= shiftEnd && end >= shiftStart);
        });
      setAbsentUsers(absent);

    } catch (error) {
      console.error('Error fetching shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = selectedSiteFilter === 'TODAS' 
    ? incidents 
    : incidents.filter(i => (i as any).siteName?.includes(`[${selectedSiteFilter}]`));

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const result = await generateShiftSummary({ patrols, incidents: filteredIncidents });
      setSummary(result);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateStr = format(new Date(), 'dd/MM/yyyy');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('REPORTE DE SEGURIDAD INDUSTRIAL', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generado el: ${dateStr} ${format(new Date(), 'HH:mm')}`, 14, 30);
    doc.text(`Supervisor: ${user.name}`, 14, 35);
    doc.text(`Turno: ${selectedShift.name} (${selectedShift.start} - ${selectedShift.end})`, 14, 40);
    doc.text(`Sede Reportada: ${selectedSiteFilter === 'TODAS' ? 'Todas las Sedes' : selectedSiteFilter}`, 14, 45);

    // AI Summary
    let currentY = 55;
    if (summary) {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Resumen Ejecutivo (IA)', 14, currentY);
      currentY += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      const splitSummary = doc.splitTextToSize(summary, pageWidth - 28);
      doc.text(splitSummary, 14, currentY);
      currentY += (splitSummary.length * 5) + 10;
    }

    // Statistics
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Estadísticas del Turno', 14, currentY);
    currentY += 7;

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`- Rondas completadas: ${patrols.length}`, 14, currentY);
    currentY += 5;
    doc.text(`- Incidencias reportadas: ${incidents.length}`, 14, currentY);
    currentY += 5;
    doc.text(`- Personal ausente: ${absentUsers.length}`, 14, currentY);
    currentY += 15;

    // Absent Personnel Table
    if (absentUsers.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Personal Ausente / Licencias', 14, currentY);
      currentY += 5;

      const absentData = absentUsers.map(u => [
        u.name,
        u.status === 'vacation' ? 'Vacaciones' :
        u.status === 'sick' ? 'Enfermedad' :
        u.status === 'personal' ? 'Prob. Personales' :
        u.status === 'permission' ? 'Permiso' :
        u.status === 'shift-change' ? 'Cambio Turno' : 'Otros',
        `${format(new Date(u.leaveStartDate!), 'dd/MM')} al ${format(new Date(u.leaveEndDate!), 'dd/MM')}`,
        u.leaveReason || '-'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Nombre', 'Motivo', 'Período', 'Observaciones']],
        body: absentData,
        headStyles: { fillColor: [100, 116, 139] },
        styles: { fontSize: 8, cellPadding: 3 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Incidents Table
    if (filteredIncidents.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Listado Detallado de Incidencias', 14, currentY);
      currentY += 5;

      const tableData = filteredIncidents.map(inc => [
        inc.timestamp?.toDate ? format(inc.timestamp.toDate(), 'dd/MM HH:mm') : 'N/A',
        inc.description,
        inc.riskLevel.toUpperCase(),
        inc.sectorType || 'N/A',
        userNames[inc.userId] || inc.userId.substring(0, 5)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Fecha/Hora', 'Descripción', 'Riesgo', 'Sector', 'Reportado por']],
        body: tableData,
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 20 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 }
        }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('No se registraron incidencias durante este turno.', 14, currentY);
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`Reporte_Seguridad_${selectedShift.id}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handleSendEmail = () => {
    const subject = `Reporte de Seguridad - ${selectedShift.name} - ${format(new Date(), 'dd/MM/yyyy')}`;
    const body = `
REPORTE DE SEGURIDAD INDUSTRIAL
Turno: ${selectedShift.name} (${selectedShift.start} - ${selectedShift.end})
Fecha: ${format(new Date(), 'dd/MM/yyyy')}
Supervisor: ${user.name}

RESUMEN EJECUTIVO:
${summary || 'No se generó resumen de IA.'}

ESTADÍSTICAS:
- Rondas completadas: ${patrols.length}
- Incidencias reportadas: ${incidents.length}
- Personal ausente: ${absentUsers.length}

${absentUsers.length > 0 ? `PERSONAL AUSENTE:
${absentUsers.map(u => `- ${u.name}: ${u.status} (${format(new Date(u.leaveStartDate!), 'dd/MM')} al ${format(new Date(u.leaveEndDate!), 'dd/MM')})`).join('\n')}
` : ''}

DETALLE DE INCIDENCIAS:
${incidents.length > 0 ? incidents.map(i => {
  const time = i.timestamp?.toDate ? format(i.timestamp.toDate(), 'HH:mm') : 'N/A';
  const reporter = userNames[i.userId] || i.userId.substring(0, 5);
  return `[${time}] ${i.description} | Riesgo: ${i.riskLevel.toUpperCase()} | Sector: ${i.sectorType || 'N/A'} | Reportado por: ${reporter}`;
}).join('\n') : 'Sin incidencias reportadas.'}

Este es un reporte generado automáticamente desde la aplicación Rondas de Seguridad.
    `;

    const mailtoUrl = `mailto:${MANAGEMENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900">Reportes de Turno</h2>
          <p className="text-slate-500">Generación de informes para gerencia.</p>
        </div>
        <button 
          onClick={() => setView('profile')}
          className="rounded-full bg-slate-100 p-2 text-slate-500 transition-all active:scale-90"
        >
          <ChevronRight className="h-6 w-6 rotate-180" />
        </button>
      </div>

      {/* Filters (Sede y Turno) */}
      <div className="flex flex-col gap-3 pb-2">
        <select
          value={selectedSiteFilter}
          onChange={(e) => setSelectedSiteFilter(e.target.value)}
          className="w-full rounded-2xl bg-white p-4 text-xs font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="TODAS">TODAS LAS SEDES</option>
          <option value="PLANTA">PLANTA PRINCIPAL</option>
          <option value="DEPÓSITO">DEPÓSITO (CAMPICHUELO)</option>
          <option value="ADMINISTRACIÓN">ADMINISTRACIÓN (ZEBALLOS 3501)</option>
        </select>

        <div className="flex gap-2 overflow-x-auto">
          {SHIFTS.map((shift) => (
            <button
              key={shift.id}
              onClick={() => setSelectedShift(shift)}
              className={`shrink-0 rounded-2xl px-4 py-3 text-xs font-bold transition-all ${
                selectedShift.id === shift.id 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'bg-white text-slate-500 border border-slate-100'
              }`}
            >
              {shift.name}
              <span className="block text-[10px] opacity-60 font-medium mt-0.5">{shift.start} - {shift.end}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="rounded-xl bg-blue-50 p-2 w-fit mb-3">
            <Shield className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rondas</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{patrols.length}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="rounded-xl bg-red-50 p-2 w-fit mb-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incidencias</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{incidents.length}</p>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-slate-900 p-2 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-slate-900">Resumen Ejecutivo</h3>
          </div>
          {!summary && !loading && (
            <button 
              onClick={handleGenerateSummary}
              disabled={generatingSummary || (patrols.length === 0 && incidents.length === 0)}
              className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-50"
            >
              {generatingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Generar con IA
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : summary ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100"
          >
            {summary}
          </motion.div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs font-medium">Presione "Generar con IA" para obtener un resumen profesional del turno.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid gap-3">
        <button 
          onClick={handleSendEmail}
          disabled={loading || generatingSummary}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-5 font-bold text-white shadow-xl transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"
        >
          <Mail className="h-5 w-5" />
          Enviar a Gerencia
        </button>
        <button 
          onClick={handleDownloadPDF}
          disabled={loading || generatingSummary}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-5 font-bold text-slate-900 border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
        >
          <Download className="h-5 w-5" />
          Descargar PDF
        </button>
      </div>

      {/* Recent Activity in Shift */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Actividad Reciente del Turno</p>
        <div className="space-y-2">
          {incidents.slice(0, 3).map((incident) => (
            <div key={incident.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
              <div className={`rounded-xl p-2 ${incident.riskLevel === 'critico' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{incident.description}</p>
                <p className="text-[10px] text-slate-400">{format(incident.timestamp?.toDate ? incident.timestamp.toDate() : new Date(), 'HH:mm')} • {incident.riskLevel.toUpperCase()}</p>
              </div>
            </div>
          ))}
          {incidents.length === 0 && (
            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sin incidencias en este turno</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
