import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db, collection, onSnapshot, query, where } from '../lib/firebase';
import { UserProfile } from '../types';

interface PatrolTrack {
  id: string;
  userId: string;
  userName: string;
  shiftDate: string;
  smoothedPath: { lat: number; lng: number; timestamp?: string }[];
}

interface LiveTrackingMapProps {
  user: UserProfile;
  isPatrolActive: boolean;
}

export default function LiveTrackingMap({ user, isPatrolActive }: LiveTrackingMapProps) {
  const [tracks, setTracks] = useState<PatrolTrack[]>([]);
  const [liveBuffer, setLiveBuffer] = useState<{lat: number, lng: number}[]>([]);
  
  // Dynamic Center (Defaults to Avellaneda till GPS kicks in)
  const [center, setCenter] = useState<[number, number]>([-34.6624, -58.3653]);

  const todayStr = new Date().toDateString();

  useEffect(() => {
    // 1. Subscribe to today's completed paths (Kalman filtered)
    const q = query(
      collection(db, 'patrol_tracks'),
      where('shiftDate', '==', todayStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PatrolTrack[];
      
      setTracks(p);
    });

    return () => unsubscribe();
  }, [todayStr]);

  useEffect(() => {
    // 2. Local GPS Buffering every 5 seconds only if active
    if (!navigator.geolocation || !user) return;
    
    // Load initial buffer if active
    if (isPatrolActive) {
      const existing = localStorage.getItem(`gps_buffer_${user.uid}`);
      if (existing) setLiveBuffer(JSON.parse(existing));
    }

    if (!isPatrolActive) return;

    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          if (accuracy > 50) return; // Drop bad accuracy points
          
          try {
            const bufferStr = localStorage.getItem(`gps_buffer_${user.uid}`);
            const buffer = bufferStr ? JSON.parse(bufferStr) : [];
            
            const newPoint = { lat: latitude, lng: longitude, timestamp: new Date().toISOString() };
            buffer.push(newPoint);
            
            localStorage.setItem(`gps_buffer_${user.uid}`, JSON.stringify(buffer));
            setLiveBuffer(buffer);
            setCenter([latitude, longitude]); // Auto-center map on new GPS fix
          } catch (error) {
            console.error("Error setting local buffer:", error);
          }
        },
        (error) => console.log('GPS Fetch Error:', error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user, isPatrolActive]);

  const userColors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
  
  // Global Satellite View as Default
  const tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const attribution = "Tiles &copy; Esri World Imagery";

  return (
    <div className="h-full w-full bg-slate-100">
      <MapContainer 
        center={center} 
        zoom={17} 
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer attribution={attribution} url={tileUrl} />
        
        {/* Draw Historic Completed Patrols */}
        {tracks.map((track, index) => {
          const color = userColors[index % userColors.length];
          const positions = track.smoothedPath.map(p => [p.lat, p.lng] as [number, number]);
          return (
            <React.Fragment key={track.id}>
              <Polyline 
                positions={positions} 
                color={color} 
                weight={5} 
                opacity={0.8}
                lineCap="round"
                lineJoin="round"
              />
              {positions.length > 0 && (
                <CircleMarker 
                  center={positions[positions.length - 1]} 
                  radius={6} 
                  pathOptions={{ color, fillColor: color, fillOpacity: 1 }}
                >
                  <Popup className="text-xs font-bold">
                    Fin: {track.userName}
                  </Popup>
                </CircleMarker>
              )}
            </React.Fragment>
          );
        })}

        {/* Draw Live Local Buffer Line (Unsmoothed initially, just for the current user to see actively) */}
        {isPatrolActive && liveBuffer.length > 0 && (
          <Polyline 
            positions={liveBuffer.map(p => [p.lat, p.lng] as [number, number])} 
            color="#2563eb" 
            weight={4} 
            dashArray="10, 10" // Dotted line for live tracking preview
            opacity={0.9}
            className="animate-pulse"
          />
        )}
      </MapContainer>
    </div>
  );
}
