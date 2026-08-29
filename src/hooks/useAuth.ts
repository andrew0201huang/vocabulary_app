import { useState, useEffect, useCallback } from 'react';
import { GoogleAuthState } from '../types/auth';
import { SyncStatus } from '../types/vocabulary';
import { googleAuthService } from '../services/googleAuthService';
import { storageService } from '../services/storageService';

export function useAuth() {
  const [authState, setAuthState] = useState<GoogleAuthState>(() => googleAuthService.getAuthState());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => storageService.getSyncStatus());
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = googleAuthService.subscribe(setAuthState);
    const unsubSync = storageService.subscribeSyncStatus(setSyncStatus);
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  const login = useCallback(async (clientId?: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await googleAuthService.requestLogin(clientId);
      // Trigger cloud sync
      await storageService.syncWithGoogleDrive();
    } catch (err: any) {
      setAuthError(err.message || 'Google 登入失敗');
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    googleAuthService.logout();
    storageService.setSyncStatus('local_only');
  }, []);

  const syncNow = useCallback(async () => {
    return await storageService.syncWithGoogleDrive();
  }, []);

  return {
    authState,
    syncStatus,
    isLoggingIn,
    authError,
    login,
    logout,
    syncNow,
  };
}
