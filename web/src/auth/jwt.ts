interface JwtPayload {
  sub: string;
  exp: number;
}

export function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json) as JwtPayload;
}
