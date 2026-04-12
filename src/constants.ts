export const RONDINES = [
  { name: 'TERÁN RICARDO MANUEL', role: 'guard', dni: '29738561', legajo: '379' },
  { name: 'ZORZOLI JUAN CARLOS', role: 'guard', dni: '30465648', legajo: '524' },
  { name: 'VILLALBA CARLOS SEBASTIÁN', role: 'guard', dni: '345971175', legajo: '544' },
  { name: 'GÓMEZ LEONARDO MARIO', role: 'guard', dni: '26788444', legajo: '557' },
  { name: 'BARROS NELSON RAMÓN', role: 'guard', dni: '26227925', legajo: '679' },
  { name: 'GÓMEZ FERNANDO MARIANO', role: 'guard', dni: '35161793', legajo: '756' },
];

export const SUPERVISORES = [
  { name: 'Claudia Luchini', role: 'supervisor', dni: '27239211', legajo: '528' },
  { name: 'Ricardo Herrmann', role: 'ceo', dni: '11111111', legajo: '553' },
  { name: 'Alaluf Damian', role: 'jefe-seguridad', dni: '22222222', legajo: '541' },
];

export const SECTORES = [
  { id: 'SEC-001', name: 'Salida de Emergencia Salto 165', type: 'SEGURIDAD', location: { lat: -34.6037, lng: -58.3816 } },
  { id: 'SEC-002', name: 'Sodim Filtrera', type: 'OPERACIONES', location: { lat: -34.6042, lng: -58.3821 } },
  { id: 'SEC-003', name: 'Módulo 1 y 2', type: 'OPERACIONES', location: { lat: -34.6047, lng: -58.3826 } },
  { id: 'SEC-004', name: 'Envasado', type: 'PRODUCCIÓN', location: { lat: -34.6052, lng: -58.3831 } },
  { id: 'SEC-005', name: 'Grupo electrógenos', type: 'MANTENIMIENTO', location: { lat: -34.6057, lng: -58.3836 } },
  { id: 'SEC-006', name: 'Pasillo de RRHH', type: 'ADMINISTRATIVO', location: { lat: -34.6062, lng: -58.3841 } },
  { id: 'SEC-007', name: 'RRHH', type: 'ADMINISTRATIVO', location: { lat: -34.6067, lng: -58.3846 } },
  { id: 'SEC-008', name: 'Sala de Polvos', type: 'PRODUCCIÓN', location: { lat: -34.6072, lng: -58.3851 } },
  { id: 'SEC-009', name: 'Salida de Emergencia Ramallo', type: 'SEGURIDAD', location: { lat: -34.6075, lng: -58.3854 } },
  { id: 'SEC-010', name: 'Oficinas de Supervisión', type: 'SUPERVISIÓN', location: { lat: -34.6077, lng: -58.3856 } },
  { id: 'SEC-011', name: 'Recepción', type: 'ADMINISTRATIVO', location: { lat: -34.6082, lng: -58.3861 } },
  { id: 'SEC-012', name: 'Vestuario Masculino', type: 'SERVICIOS', location: { lat: -34.6087, lng: -58.3866 } },
  { id: 'SEC-013', name: 'Vestuarios Femenino', type: 'SERVICIOS', location: { lat: -34.6092, lng: -58.3871 } },
  { id: 'SEC-014', name: 'Oficina de Administración', type: 'ADMINISTRATIVO', location: { lat: -34.6097, lng: -58.3876 } }
];

export const APP_LOGO_URL = '/vite.svg'; // Using Vite SVG as the application logo

export const SHIFTS = [
  { id: 'morning', name: 'Turno Mañana', start: '06:00', end: '14:00' },
  { id: 'afternoon', name: 'Turno Tarde', start: '14:00', end: '22:00' },
  { id: 'night', name: 'Turno Noche', start: '22:00', end: '06:00' },
];

export const MANAGEMENT_EMAIL = 'gerencia@empresa.com';
