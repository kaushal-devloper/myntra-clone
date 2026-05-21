import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (Platform.OS === 'web') {
    // During local development on web, bypass the tunnel to avoid CORS preflight issues with Localtunnel
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return `http://${window.location.hostname}:5000`;
    }
    return envUrl || "http://localhost:5000";
  }

  // Use the public API URL if it's set and not localhost (for mobile tunnels)
  if (envUrl && envUrl.trim() !== '' && !envUrl.includes("localhost")) {
    return envUrl.trim();
  }

  // On native devices, try to get the dev machine IP from expo-constants
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':').shift();
    if (ip && !ip.includes('ngrok') && !ip.includes('loca.lt') && !ip.includes('exp.direct')) {
      // Handle Android emulator localhost issue
      if (Platform.OS === 'android' && (ip === '127.0.0.1' || ip === 'localhost')) {
        return "http://10.0.2.2:5000";
      }
      return `http://${ip}:5000`;
    }
  }

  // Fallback to Android emulator IP or local machine IP
  return Platform.OS === 'android' ? "http://10.0.2.2:5000" : "http://localhost:5000";
};
