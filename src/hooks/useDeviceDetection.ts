import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';

export function useDeviceDetection() {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [os, setOs] = useState<OS>('unknown');

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    // OS Detection
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setOs('ios');
    } else if (/android/i.test(userAgent)) {
      setOs('android');
    } else if (/Win/i.test(userAgent)) {
      setOs('windows');
    } else if (/Mac/i.test(userAgent)) {
      setOs('macos');
    } else if (/Linux/i.test(userAgent)) {
      setOs('linux');
    }

    // Device Type Detection
    const width = window.innerWidth;
    if (width < 768) {
      setDeviceType('mobile');
    } else if (width >= 768 && width < 1024) {
      setDeviceType('tablet');
    } else {
      setDeviceType('desktop');
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      if (newWidth < 768) {
        setDeviceType('mobile');
      } else if (newWidth >= 768 && newWidth < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { deviceType, os, isMobile: deviceType === 'mobile', isTablet: deviceType === 'tablet', isDesktop: deviceType === 'desktop', isIOS: os === 'ios', isAndroid: os === 'android' };
}
