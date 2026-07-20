import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  [key: string]: unknown;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

function sign(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

/**
 * 署名付きセッショントークンを生成する(JWTのような自前実装、外部依存なし)。
 * サーバー側のみで使用する(server-onlyパッケージでクライアント混入を防止)。
 */
export function createSessionToken(
  payload: Record<string, unknown>,
  secret: string,
  maxAgeSeconds: number,
): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const fullPayload: SessionPayload = { ...payload, exp };
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/**
 * トークンの署名と有効期限を検証し、正しければペイロードを返す。
 * 署名不一致・期限切れ・パース失敗はすべてnullを返す(理由を区別しない=情報漏洩防止)。
 */
export function verifySessionToken<T extends SessionPayload = SessionPayload>(
  token: string | undefined | null,
  secret: string,
): T | null {
  if (!token) return null;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expectedSignature = sign(payloadB64, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as T;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
