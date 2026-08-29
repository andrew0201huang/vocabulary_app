import { useState, useEffect, useCallback } from 'react';
import { AuthState } from '../types/auth';
import { SyncStatus } from '../types/vocabulary';
import { authService } from '../services/googleAuthService';
import { storageService } from '../services/storageService';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => authService.getAuthState());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => storageService.getSyncStatus());
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = authService.subscribe(setAuthState);
    const unsubSync = storageService.subscribeSyncStatus(setSyncStatus);
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  // Local user login / name update (Zero setup required)
  const loginLocal = useCallback((name: string, avatar: string = '⚡') => {
    const profile = authService.setLocalUser(name, avatar);
    authService.saveLocalProfile(profile);
    storageService.setSyncStatus('local_only');
    return profile;
  }, []);

  // Google OAuth Login
  const loginGoogle = useCallback(async (clientId: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await authService.requestGoogleLogin(clientId);
      // Trigger cloud sync
      await storageService.syncWithGoogleDrive();
    } catch (err: any) {
      setAuthError(err.message || 'Google 登入失敗');
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    storageService.setSyncStatus('local_only');
  }, []);

  const syncNow = useCallback(async () => {
    return await storageService.syncWithGoogleDrive();
  }, []);

  return {
    authState,
    user: authState.user,
    authType: authState.authType,
    syncStatus,
    isLoggingIn,
    authError,
    loginLocal,
    loginGoogle,
    logout,
    syncNow,
  };
}
