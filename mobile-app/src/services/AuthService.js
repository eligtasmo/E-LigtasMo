import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const SESSION_KEY = 'CURRENT_USER';

const remoteLog = async (message, details) => {
  try {
    await fetch(`${API_URL}/log-mobile-error.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device: Platform.OS + ' ' + Platform.Version,
        message,
        details
      })
    });
  } catch (e) { /* silent fail */ }
};

export const AuthService = {
  login: async (username, password) => {
    try {
      const url = `${API_URL}/login.php`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password }),
      });
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('[AuthService] JSON Parse Error:', responseText.substring(0, 100));
        return { success: false, message: 'Invalid server response' };
      }
      
      if (data.success) {
        const user = {
          id: data.id,
          username: data.username,
          role: data.role,
          full_name: data.full_name,
          token: data.token,
          brgy_name: data.brgy_name,
          email: data.email
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
        data.user = user;
      }
      return data;
    } catch (error) {
      return { success: false, message: 'Network connection failed' };
    }
  },

  register: async (username, password, userData) => {
      try {
          const res = await fetch(`${API_URL}/register.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  username, password,
                  full_name: userData.fullName,
                  email: userData.email,
                  contact_number: userData.phone,
                  gender: userData.gender,
                  brgy_name: userData.address?.barangay,
                  city: userData.address?.city,
                  province: userData.address?.province,
                  role: 'resident'
              })
          });
          return await res.json();
      } catch (e) {
          return { success: false, message: 'Server unreachable' };
      }
  },

  sendOtp: async (email, type = 'signup') => {
    try {
      const response = await fetch(`${API_URL}/request-verification-code.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include', // Maintain session
        body: JSON.stringify({ email, purpose: type })
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.warn('[AuthService] SendOTP failed to parse JSON:', responseText.substring(0, 100));
        return { success: false, error: 'Server error: Invalid response format' };
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error: Unable to reach server' };
    }
  },

  verifyOtp: async (email, code) => {
    try {
      const response = await fetch(`${API_URL}/verify-code.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include', // Maintain session
        body: JSON.stringify({ email, code })
      });
      const responseText = await response.text();
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.warn('[AuthService] verifyOtp failed to parse JSON:', responseText.substring(0, 100));
        return { success: false, error: 'Server error: Invalid response format' };
      }
    } catch (error) {
      return { success: false, error: 'Network error: Unable to reach server' };
    }
  },

  resetPassword: async (email, code, newPassword, confirmPassword) => {
    try {
      const response = await fetch(`${API_URL}/reset_password.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email,
          code,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      return await response.json();
    } catch (e) {
      return { success: false, message: 'Unable to reset password right now' };
    }
  },

  checkSession: async () => {
    try {
      const user = await AsyncStorage.getItem(SESSION_KEY);
      return user ? JSON.parse(user) : null;
    } catch (e) { return null; }
  },

  logout: async () => {
    console.log('[AuthService] Logout process started');
    try {
      try {
        await AsyncStorage.removeItem(SESSION_KEY);
        console.log('[AuthService] SESSION_KEY removed');
      } catch (e) { console.warn('[AuthService] Failed to remove SESSION_KEY'); }

      try {
        await AsyncStorage.clear();
        console.log('[AuthService] AsyncStorage cleared');
      } catch (e) { console.warn('[AuthService] Failed to clear AsyncStorage'); }
      
      if (typeof window !== 'undefined' && window.localStorage) {
        console.log('[AuthService] Web localStorage detected, clearing...');
        window.localStorage.clear();
        console.log('[AuthService] Web localStorage cleared');
      }
      return { success: true };
    } catch (e) {
      console.error('[AuthService] Global Logout Error:', e);
      return { success: false, error: e.message };
    }
  }
};
