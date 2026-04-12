import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sector, Incident } from '../types';
import { db, collection, onSnapshot, query, where } from '../lib/firebase';
import { AlertTriangle } from 'lucide-react';

interface MapComponentProps {
  sectors: Sector[];
  onSectorClick: (sector: Sector) => void;
  currentStep: number;
}

export default function MapComponent({ sectors, onSectorClick, currentStep }: MapComponentProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const center: [number, number] = [-34.6624, -58.3653]; // Avellaneda Center
  
  // Restriction bounds for Avellaneda / Perimeter
  const avellanedaBounds = L.latLngBounds(
    [-34.7000, -58.4000], // South-West
    [-34.6200, -58.3200]  // North-East
  );
  
  // Create coordinates for the route polyline
  const routeCoords: [number, number][] = sectors.map(s => [s.location.lat, s.location.lng]);

  useEffect(() => {
    const q = query(collection(db, 'incidents'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incident[];
      setIncidents(incidentData);
    }, (error) => {
      console.error('Error in incidents snapshot:', error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100">
      <MapContainer 
        center={center} 
        zoom={17} 
        maxBounds={avellanedaBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='Tiles &copy; Esri World Imagery'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        
        {/* Route Polyline */}
        <Polyline 
          positions={routeCoords} 
          color="#1e293b" 
          weight={3} 
          dashArray="10, 10"
          opacity={0.5}
        />

        {/* Sector Markers */}
        {sectors.map((sector, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const sectorIncidents = incidents.filter(inc => inc.sectorType === sector.type);
          const hasCriticalIncident = sectorIncidents.some(inc => inc.riskLevel === 'critico' || inc.riskLevel === 'alto');
          
          const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg ${
              isCompleted ? 'bg-green-500' : isCurrent ? 'bg-celeste-dark animate-pulse' : 'bg-slate-400'
            } text-white text-[10px] font-bold">
              ${index + 1}
              ${sectorIncidents.length > 0 ? `
                <div class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] ring-2 ring-white">
                  ${sectorIncidents.length}
                </div>
              ` : ''}
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          return (
            <Marker 
              key={sector.id} 
              position={[sector.location.lat, sector.location.lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => onSectorClick(sector as Sector),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <p className="font-bold text-slate-900">{sector.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">{sector.type}</p>
                  
                  {sectorIncidents.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <p className="text-[9px] font-black text-red-500 uppercase tracking-tighter flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Incidencias Pendientes
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                        {sectorIncidents.map(inc => (
                          <div key={inc.id} className="rounded bg-red-50 p-1.5 border border-red-100">
                            <p className="text-[10px] font-bold text-slate-900 line-clamp-1">{inc.description}</p>
                            <span className={`text-[8px] font-black uppercase px-1 rounded ${
                              inc.riskLevel === 'critico' ? 'bg-red-500 text-white' :
                              inc.riskLevel === 'alto' ? 'bg-orange-500 text-white' :
                              inc.riskLevel === 'medio' ? 'bg-yellow-500 text-white' :
                              'bg-green-500 text-white'
                            }`}>
                              {inc.riskLevel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => onSectorClick(sector as Sector)}
                    className="w-full rounded-lg bg-primary-gradient px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm"
                  >
                    Ver Detalles
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
