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
    // 1. Web Platform (Immediate priority for dashboard/local dev)
    if (Platform.OS === 'web') {
        const webHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        // If we are on localhost web, we want the API on the SAME host (usually port 80/Apache)
        return `http://${webHost}${BASE_PATH}`;
    }

    // 2. Dynamic Host Resolution (Tunnel/Dev priority for Mobile)
    const host = resolveHost();
    if (host && isPrivateIp(host)) {
        return `http://${host}${BASE_PATH}`;
    }

    // 3. Manual IP Override (Primary fallback for Physical Devices)
    if (MANUAL_API_HOST) {
        return `http://${MANUAL_API_HOST}${BASE_PATH}`;
    }

    // 4. Environment Variable fallback
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // Default Fallbacks
    if (Platform.OS === 'android') {
        return `http://10.0.2.2${BASE_PATH}`;
    }
    return `http://localhost${BASE_PATH}`;
};

const finalApiUrl = getApiUrl();
console.log('[Config] Initializing API_URL:', finalApiUrl);
export const API_URL = finalApiUrl;
export const API_ROOT = API_URL.replace(/\/api$/, '');

export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiaXNoZWVjaGFuMTEiLCJhIjoiY21tbTV5cTVvMjduZTJycHM3NGhqbGJpaSJ9.IPJeEJ6qwGE3C1_dlo5BLw'; 

export const SOCIAL_MDDRMO_PAGE = 'https://www.facebook.com/mddrmosantacruz';

