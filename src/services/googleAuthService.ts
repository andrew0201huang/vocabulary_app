import { GoogleAuthState, GoogleUser } from '../types/auth';

const STORAGE_AUTH_KEY = 'speedvocab_auth_state';
const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

export class GoogleAuthService {
  private tokenClient: any = null;
  private authState: GoogleAuthState = {
    isAuthenticated: false,
    accessToken: null,
    expiresAt: null,
    user: null,
    driveFileId: null,
  };
  private listeners: ((state: GoogleAuthState) => void)[] = [];

  constructor() {
    this.loadPersistedAuth();
  }

  private loadPersistedAuth() {
    try {
      const stored = localStorage.getItem(STORAGE_AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GoogleAuthState;
        // Check if token is still valid (with 5 min safety buffer)
        if (parsed.expiresAt && parsed.expiresAt > Date.now() + 300000 && parsed.accessToken) {
          this.authState = parsed;
        } else {
          // Token expired, clear token but can keep cached user info
          this.authState = {
            ...parsed,
            isAuthenticated: false,
            accessToken: null,
          };
        }
      }
    } catch {
      // ignore
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

  public getAuthState(): GoogleAuthState {
    return { ...this.authState };
  }

  public subscribe(cb: (state: GoogleAuthState) => void): () => void {
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
   * Initialize Google Token Client with GIS
   */
  public initTokenClient(clientId: string, onTokenReceived?: (token: string) => void): boolean {
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

            this.authState.accessToken = response.access_token;
            this.authState.expiresAt = expiresAt;
            this.authState.isAuthenticated = true;

            // Fetch user info
            try {
              const user = await this.fetchUserProfile(response.access_token);
              if (user) {
                this.authState.user = user;
              }
            } catch (err) {
              console.warn('Failed to fetch user profile:', err);
            }

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
  public requestLogin(clientId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!clientId && !this.tokenClient) {
        reject(new Error('請先在設定中輸入 Google Client ID'));
        return;
      }

      if (clientId && !this.tokenClient) {
        const initialized = this.initTokenClient(clientId, (token) => resolve(token));
        if (!initialized) {
          reject(new Error('Google 認證元件尚未載入，請稍後重試或檢查網路連線。'));
          return;
        }
      }

      if (!this.tokenClient) {
        reject(new Error('尚未初始化 Google 登入元件'));
        return;
      }

      try {
        // Prompt user for consent/account selection
        this.tokenClient.requestAccessToken({ prompt: '' });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Fetch User Profile from Google userinfo API
   */
  public async fetchUserProfile(accessToken: string): Promise<GoogleUser | null> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.sub,
        name: data.name || data.email?.split('@')[0] || 'Google User',
        email: data.email,
        picture: data.picture,
      };
    } catch {
      return null;
    }
  }

  /**
   * Sign out and clear cached auth
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
      isAuthenticated: false,
      accessToken: null,
      expiresAt: null,
      user: null,
      driveFileId: null,
    };
    this.saveAuth();
  }
}

export const googleAuthService = new GoogleAuthService();
