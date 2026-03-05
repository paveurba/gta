export interface AuthenticatedSession {
  userId: number;
  email: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
