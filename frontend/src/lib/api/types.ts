export type ApiErrorKind = 'network' | 'authentication' | 'validation' | 'server' | 'http' | 'protocol';

/** Safe application error; never carries response bodies, tokens or raw network exceptions. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: ApiError;
  timestamp?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  userId: number;
  email: string;
  fullName: string;
  role: string;
  classCode: string | null;
  twoFactorRequired?: boolean;
  twoFactorEnabled?: boolean;
}

export interface UserProfileResponse {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  classCode: string | null;
  createdAt: string;
}
