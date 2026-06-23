/**
 * Interface mapping the properties contained inside the decoded JWT token payload.
 */
export interface JwtPayload {
  /**
   * Decoded user email address.
   */
  email: string;
  /**
   * Token subject representing the user UUID.
   */
  sub: string;
  /**
   * Unique JWT ID.
   */
  jti: string;
  /**
   * Issued at Unix timestamp.
   */
  iat?: number;
  /**
   * Expiration Unix timestamp.
   */
  exp?: number;
  /**
   * Platform RBAC roles list.
   */
  roles?: string[];
  /**
   * User status at time of login.
   */
  status?: string;
}

/**
 * Interface representing the access and refresh token pair response.
 */
export interface TokenResponse {
  /**
   * Short-lived bearer token (default 15m) used to access protected endpoints.
   */
  access_token: string;
  /**
   * Long-lived bearer token (default 7d) used to fetch new access tokens.
   */
  refresh_token: string;
}
