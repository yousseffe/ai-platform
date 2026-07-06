export interface JwtPayload {
  email: string;

  sub: string;

  jti: string;

  iat?: number;

  exp?: number;

  roles?: string[];

  status?: string;
}

export interface TokenResponse {
  access_token: string;

  refresh_token: string;
}
