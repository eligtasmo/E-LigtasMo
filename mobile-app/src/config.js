import { Platform } from 'react-native';

/**
 * Universal Tactical API Configuration v3.0
 * Hard-wired to Hostinger Production for seamless universal access.
 */
export const getApiUrl = () => {
    // Standard Production Backend
    return 'https://api.eligtasmo.site';
};


const finalApiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.eligtasmo.site';

console.log('[Config] MISSION STATUS: Connected to Backend:', finalApiUrl);

export const API_URL = finalApiUrl;
export const API_ROOT = finalApiUrl; // The root of the tactical domain/IP

export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiaXNoZWVjaGFuMTEiLCJhIjoiY21tbTV5cTVvMjduZTJycHM3NGhqbGJpaSJ9.IPJeEJ6qwGE3C1_dlo5BLw'; 

export const SOCIAL_MDDRMO_PAGE = 'https://www.facebook.com/mddrmosantacruz';
