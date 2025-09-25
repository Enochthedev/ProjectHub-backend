export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  tokenId: string;
  iat?: number;
  exp?: number;
}
