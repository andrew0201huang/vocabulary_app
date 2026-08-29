export type AuthType = 'local' | 'google';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar: string; // Emoji or image URL
  authType: AuthType;
  createdAt: string;
}

export interface GoogleUser {
  id?: string;
  name: string;
  email: string;
  picture?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  authType: AuthType;
  accessToken: string | null;
  expiresAt: number | null;
  driveFileId: string | null;
}
