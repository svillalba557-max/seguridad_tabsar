import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rondas.seguridad',
  appName: 'Rondas de Seguridad',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
