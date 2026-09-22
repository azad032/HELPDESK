interface JwtPayload {
  sub: string;
  exp: number;
}

export function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  base64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const json = atob(base64);
  return JSON.parse(json) as JwtPayload;
}
