import { AuthState, UserProfile } from '../types/auth';

const STORAGE_AUTH_KEY = 'speedvocab_auth_state_v2';
const STORAGE_LOCAL_PROFILES = 'speedvocab_local_profiles';
const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata email profile openid';

const DEFAULT_LOCAL_USER: UserProfile = {
  id: 'user_default',
  name: '一般學習者',
  avatar: '⚡',
  authType: 'local',
  createdAt: new Date().toISOString(),
};

export class AuthService {
  private tokenClient: any = null;
  private authState: AuthState = {
    isAuthenticated: true,
    user: DEFAULT_LOCAL_USER,
    authType: 'local',
    accessToken: null,
    expiresAt: null,
    driveFileId: null,
  };
  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.loadPersistedAuth();
  }

  private loadPersistedAuth() {
    try {
      const stored = localStorage.getItem(STORAGE_AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthState;
        if (parsed.authType === 'google') {
          // Check if Google token is still valid (5 min buffer)
          if (parsed.expiresAt && parsed.expiresAt > Date.now() + 300000 && parsed.accessToken) {
            this.authState = parsed;
          } else {
            // Token expired, fallback to local profile with user's name
            this.authState = {
              isAuthenticated: true,
              user: parsed.user || DEFAULT_LOCAL_USER,
              authType: 'local',
              accessToken: null,
              expiresAt: null,
              driveFileId: parsed.driveFileId,
            };
          }
        } else {
          // Local user profile
          this.authState = {
            isAuthenticated: true,
            user: parsed.user || DEFAULT_LOCAL_USER,
            authType: 'local',
            accessToken: null,
            expiresAt: null,
            driveFileId: null,
          };
        }
      } else {
        this.authState = {
          isAuthenticated: true,
          user: DEFAULT_LOCAL_USER,
          authType: 'local',
          accessToken: null,
          expiresAt: null,
          driveFileId: null,
        };
        this.saveAuth();
      }
    } catch {
      this.authState = {
        isAuthenticated: true,
        user: DEFAULT_LOCAL_USER,
        authType: 'local',
        accessToken: null,
        expiresAt: null,
        driveFileId: null,
      };
    }
  }

  private saveAuth() {
    try {
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(this.authState));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  public subscribe(cb: (state: AuthState) => void): () => void {
    this.listeners.push(cb);
    cb(this.getAuthState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    const current = this.getAuthState();
    this.listeners.forEach(cb => cb(current));
  }

  public setDriveFileId(fileId: string | null) {
    this.authState.driveFileId = fileId;
    this.saveAuth();
  }

  /**
   * Set or update local user profile
   */
  public setLocalUser(name: string, avatar: string = '⚡'): UserProfile {
    const user: UserProfile = {
      id: this.authState.user?.id || ('user_' + Date.now().toString(36)),
      name: name.trim() || '一般學習者',
      avatar,
      authType: 'local',
      createdAt: this.authState.user?.createdAt || new Date().toISOString(),
    };

    this.authState = {
      isAuthenticated: true,
      user,
      authType: 'local',
      accessToken: null,
      expiresAt: null,
      driveFileId: null,
    };

    this.saveAuth();
    return user;
  }

  /**
   * Get list of saved local user profiles
   */
  public getLocalProfiles(): UserProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_LOCAL_PROFILES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return [DEFAULT_LOCAL_USER];
  }

  public saveLocalProfile(profile: UserProfile) {
    try {
      const existing = this.getLocalProfiles();
      const updated = [profile, ...existing.filter(p => p.id !== profile.id)];
      localStorage.setItem(STORAGE_LOCAL_PROFILES, JSON.stringify(updated.slice(0, 10)));
    } catch {
      // ignore
    }
  }

  /**
   * Initialize Google Token Client with GIS
   */
  public initGoogleTokenClient(clientId: string, onTokenReceived?: (token: string) => void): boolean {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      return false;
    }

    try {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_APPDATA_SCOPE,
        callback: async (response: any) => {
          if (response.error) {
            console.error('Google Auth Error:', response.error);
            return;
          }

          if (response.access_token) {
            const expiresIn = Number(response.expires_in) || 3599;
            const expiresAt = Date.now() + expiresIn * 1000;

            let googleProfile: UserProfile = {
              id: 'google_user_' + Date.now().toString(36),
              name: 'Google 學習者',
              avatar: '🌐',
              authType: 'google',
              createdAt: new Date().toISOString(),
            };

            // Fetch Google User Profile
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (res.ok) {
                const data = await res.json();
                googleProfile = {
                  id: data.sub || googleProfile.id,
                  name: data.name || data.email?.split('@')[0] || 'Google User',
                  email: data.email,
                  avatar: data.picture || '🌐',
                  authType: 'google',
                  createdAt: new Date().toISOString(),
                };
              }
            } catch (err) {
              console.warn('Failed to fetch google user info:', err);
            }

            this.authState = {
              isAuthenticated: true,
              user: googleProfile,
              authType: 'google',
              accessToken: response.access_token,
              expiresAt,
              driveFileId: this.authState.driveFileId,
            };

            this.saveAuth();
            onTokenReceived?.(response.access_token);
          }
        },
      });
      return true;
    } catch (e) {
      console.error('Failed to initialize Google token client:', e);
      return false;
    }
  }

  /**
   * Request Google Login
   */
  public requestGoogleLogin(clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!clientId) {
        reject(new Error('未設定 Google Client ID，請先在設定中填寫或使用一般使用者模式。'));
        return;
      }

      if (!this.tokenClient) {
        const initialized = this.initGoogleTokenClient(clientId, (token) => resolve(token));
        if (!initialized) {
          reject(new Error('Google 登入元件尚未載入完成，請確認網路連線或使用一般使用者模式。'));
          return;
        }
      }

      try {
        this.tokenClient.requestAccessToken({ prompt: '' });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Logout / Switch to standard local user
   */
  public logout() {
    if (this.authState.accessToken && (window as any).google?.accounts?.oauth2?.revoke) {
      try {
        (window as any).google.accounts.oauth2.revoke(this.authState.accessToken, () => {});
      } catch {
        // ignore
      }
    }

    this.authState = {
      isAuthenticated: true,
      user: {
        id: 'user_default',
        name: '一般學習者',
        avatar: '⚡',
        authType: 'local',
        createdAt: new Date().toISOString(),
      },
      authType: 'local',
      accessToken: null,
      expiresAt: null,
      driveFileId: null,
    };
    this.saveAuth();
  }
}

export const authService = new AuthService();
// Export legacy alias for compatibility
export const googleAuthService = authService;
