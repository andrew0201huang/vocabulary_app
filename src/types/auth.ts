export interface GoogleUser {
  id?: string;
  name: string;
  email: string;
  picture?: string;
}

export interface GoogleAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: number | null;
  user: GoogleUser | null;
  driveFileId: string | null;
}
