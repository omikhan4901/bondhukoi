import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, userService } from '../services/api';

export const AuthContext = createContext();

/**
 * AuthProvider - Manages authentication state globally
 * Wraps the entire app to provide user and auth functions
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAuthenticated = !!user || !!token;

  /**
   * On app startup, check if user is already logged in
   */
  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      setIsLoading(true);
      const savedToken = await AsyncStorage.getItem('authToken');
      const savedRefreshToken = await AsyncStorage.getItem('refreshToken');

      // If we have a refresh token, try to refresh first (in case access token expired)
      if (savedRefreshToken) {
        try {
          console.log('[AuthContext] Attempting to refresh expired access token...');
          const newToken = await authService.refreshAccessToken();
          setToken(newToken);
          // Now fetch user with fresh token
          const response = await userService.getCurrentUser();
          setUser(response.user);
          console.log('[AuthContext] Bootstrap refresh successful');
          return;
        } catch (refreshErr) {
          console.log('[AuthContext] Refresh failed during bootstrap, clearing tokens:', refreshErr.message);
          await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
          setToken(null);
          setUser(null);
          return;
        }
      }

      // If we only have access token (no refresh token), try to verify it
      if (savedToken) {
        setToken(savedToken);
        try {
          const response = await userService.getCurrentUser();
          setUser(response.user);
          console.log('[AuthContext] Bootstrap verification successful');
        } catch (err) {
          console.log('[AuthContext] Token invalid and no refresh token available');
          await AsyncStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        }
      }
    } catch (e) {
      console.error('Bootstrap error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const authContext = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    /**
     * Sign up a new user
     */
    signup: async (name, email, password, university, facebook, instagram) => {
      try {
        setError(null);
        const response = await authService.signup(
          name,
          email,
          password,
          university,
          facebook,
          instagram
        );

        // Store token
        await AsyncStorage.setItem('authToken', response.token);
        setToken(response.token);
        setUser(response.user);

        return { success: true, user: response.user };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      }
    },

    /**
     * Log in with email and password
     */
    login: async (email, password) => {
      try {
        setError(null);
        const response = await authService.login(email, password);

        // Store token
        await AsyncStorage.setItem('authToken', response.token);
        if (response.refreshToken) {
          await AsyncStorage.setItem('refreshToken', response.refreshToken);
        }
        setToken(response.token);
        setUser(response.user);

        return { success: true, user: response.user };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      }
    },



    /**
     * Log out the current user
     */
    logout: async () => {
      try {
        setError(null);
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        // Notify backend to invalidate the refresh token
        await authService.logout(refreshToken);
      } catch (err) {
        // Backend logout failed, but we still clear local state
        console.log('[AuthContext] Backend logout failed, clearing locally anyway:', err.message);
      } finally {
        // ALWAYS clear local tokens and state regardless of backend success/failure
        await AsyncStorage.multiRemove(["authToken", "refreshToken"]);
        setToken(null);
        setUser(null);
        return { success: true };
      }
    },

    /**
     * Update user profile
     */
    updateProfile: async (name, facebook, instagram) => {
      try {
        setError(null);
        const response = await userService.updateProfile(name, facebook, instagram);
        setUser(response.user);
        return { success: true, user: response.user };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      }
    },

    /**
     * Update sharing status
     */
    updateSharingStatus: async (isEnabled) => {
      try {
        setError(null);
        const response = await userService.toggleSharing(isEnabled);
        setUser(response.user);
        return { success: true, user: response.user };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      }
    },

    /**
     * Update privacy preferences
     */
    updatePreferences: async (autoDeleteHistory, allowEveningPings, trackUniversity) => {
      try {
        setError(null);
        const response = await userService.updatePreferences(
          autoDeleteHistory, 
          allowEveningPings, 
          trackUniversity
        );
        setUser(response.user);
        return { success: true, user: response.user };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      }
    },

    /**
     * Refresh user data from API
     */
    refreshUser: async () => {
      try {
        const response = await userService.getCurrentUser();
        setUser(response.user);
        return { success: true, user: response.user };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * Clear error
     */
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}
