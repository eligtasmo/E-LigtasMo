import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const resolveHost = () => {
    try {
        const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || '';
        if (hostUri) {
            // Priority: Use the actual hostUri (especially if it's an ngrok/expo tunnel)
            return hostUri.split(':')[0];
        }
    } catch {}
    try {
        const scriptURL = NativeModules?.SourceCode?.scriptURL;
        if (scriptURL) {
            const match = scriptURL.match(/:\/\/(.[^/:]+)/);
            return match ? match[1] : null;
        }
    } catch {}
    return null;
};

const BASE_PATH = '/eligtasmo%20latest/api';
const MANUAL_API_HOST = '172.20.10.4';

const isPrivateIp = (host) => {
    if (!host) return false;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4.test(host)) return host.includes('exp.direct') || host.includes('ngrok');
    const parts = host.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    return false;
};

const getApiUrl = () => {
    // 1. Check for manual override (useful for dev testing on real devices)
    const host = resolveHost() || MANUAL_API_HOST;

    // 2. Mobile Platform (APK / Expo Go)
    if (Platform.OS !== 'web') {
        // If we are in development/local testing, try the local host IP first
        // But for production APK, we typically want the domain
        if (__DEV__ && host && isPrivateIp(host)) {
             return `http://${host}${BASE_PATH}`;
        }
        
        // Fallback/Production: Use the actual live domain
        return 'https://api.eligtasmo.site';
    }

    // 3. Web Platform
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            if (hostname === 'eligtasmo.site' || hostname === 'www.eligtasmo.site') {
                return 'https://api.eligtasmo.site';
            }
            return `http://${hostname}${BASE_PATH}`;
        }
    }

    return 'https://api.eligtasmo.site';
};

const finalApiUrl = getApiUrl();
console.log('[Config] Initializing API_URL:', finalApiUrl);
export const API_URL = finalApiUrl;
export const API_ROOT = API_URL.replace(/\/api$/, '');

export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiaXNoZWVjaGFuMTEiLCJhIjoiY21tbTV5cTVvMjduZTJycHM3NGhqbGJpaSJ9.IPJeEJ6qwGE3C1_dlo5BLw'; 

export const SOCIAL_MDDRMO_PAGE = 'https://www.facebook.com/mddrmosantacruz';

