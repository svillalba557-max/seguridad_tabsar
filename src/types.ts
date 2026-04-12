export type AppTheme = 'light' | 'dark' | 'sand' | 'feminine';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'guard' | 'ceo' | 'jefe-seguridad';
  dni?: string;
  legajo?: string;
  photoURL?: string;
  active: boolean;
  completedRounds: number;
  pendingAlerts: number;
  status: 'active' | 'vacation' | 'sick' | 'shift-change' | 'personal' | 'permission' | 'other';
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveReason?: string;
  delegatedTo?: string; // UID of the user delegated to
  isTemporaryReferente?: boolean;
  referenteExpiryDate?: string;
  theme?: AppTheme;
  biometryEnabled?: boolean;
  deviceId?: string;
}

export interface Sector {
  id: string;
  name: string;
  description: string;
  type: string;
  accessLevel: string;
  validity: string;
  qrCode: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface Patrol {
  id: string;
  userId: string;
  sectorId: string;
  startTime: any;
  endTime?: any;
  status: 'in-progress' | 'completed';
  currentStep: number;
  totalSteps: number;
}

export interface Incident {
  id: string;
  userId: string;
  patrolId?: string;
  description: string;
  imageUrl?: string;
  location?: {
    lat: number;
    lng: number;
  };
  timestamp: any;
  aiAnalysis?: string;
  riskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  sectorType?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'incident' | 'patrol' | 'system' | 'alert';
  read: boolean;
  timestamp: any;
}
