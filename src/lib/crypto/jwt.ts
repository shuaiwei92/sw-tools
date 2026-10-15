// JWT 解析：解码 header / payload（Base64URL + JSON），提取时间声明，
// 并支持 HS256/HS384/HS512 的密钥签名校验（签名验证完全本地进行）。

import { base64ToBytes, urlToBase64, bytesToHex, utf8ToBytes } from '../codec/bytes';

export interface JwtDecoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerJson: string;
  payloadJson: string;
  signature: string;
}

export interface JwtTimeInfo {
  claim: string;
  label: string;
  date: Date | null;
  note?: string;
}

/** 解析 JWT 三段结构；格式非法时抛出中文错误。 */
export function decodeJwt(token: string): JwtDecoded {
  const parts = token.trim().replace(/^Bearer\s+/i, '').split('.');
  if (parts.length !== 3) {
    throw new Error('JWT 应由三段组成：header.payload.signature（以 . 分隔）');
  }
  const [h, p, s] = parts;
  if (!h || !p) throw new Error('header 或 payload 段为空');
  let headerJson: string;
  let payloadJson: string;
  try {
    headerJson = new TextDecoder().decode(base64ToBytes(urlToBase64(h)));
  } catch {
    throw new Error('header 段不是合法 Base64URL');
  }
  try {
    payloadJson = new TextDecoder().decode(base64ToBytes(urlToBase64(p)));
  } catch {
    throw new Error('payload 段不是合法 Base64URL');
  }
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(headerJson);
  } catch {
    throw new Error('header 段不是合法 JSON');
  }
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    throw new Error('payload 段不是合法 JSON');
  }
  return { header, payload, headerJson, payloadJson, signature: s };
}

const CLAIM_LABELS: Record<string, string> = {
  iss: '签发者 (iss)',
  sub: '主题 (sub)',
  aud: '受众 (aud)',
  exp: '过期时间 (exp)',
  nbf: '生效时间 (nbf)',
  iat: '签发时间 (iat)',
  jti: '编号 (jti)',
};

/** 提取 payload 中的标准时间声明并转为本地时间。 */
export function jwtTimeInfo(payload: Record<string, unknown>): JwtTimeInfo[] {
  const out: JwtTimeInfo[] = [];
  for (const key of ['iat', 'nbf', 'exp']) {
    const v = payload[key];
    if (typeof v === 'number') {
      out.push({
        claim: key,
        label: CLAIM_LABELS[key],
        date: new Date(v * 1000),
        note: key === 'exp' && v * 1000 < Date.now() ? '已过期' : undefined,
      });
    }
  }
  return out;
}

/** 标准声明的中文说明表（供页面图例）。 */
export const JWT_CLAIM_LEGEND: { claim: string; label: string }[] = Object.entries(CLAIM_LABELS).map(
  ([claim, label]) => ({ claim, label })
);

type HsAlgo = 'HS256' | 'HS384' | 'HS512';

const HS_HASH: Record<HsAlgo, string> = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost 环境）');
  }
  return crypto.subtle;
}

/** 用密钥计算 HS256/384/512 签名（Base64URL）。 */
export async function hsSign(data: string, secret: string, algo: HsAlgo = 'HS256'): Promise<string> {
  const c = subtle();
  const key = await c.importKey('raw', utf8ToBytes(secret), { name: 'HMAC', hash: HS_HASH[algo] }, false, ['sign']);
  const sig = await c.sign('HMAC', key, utf8ToBytes(data));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface JwtVerifyResult {
  alg: string;
  supported: boolean;
  valid: boolean;
  reason?: string;
}

/** 校验 JWT 签名（仅支持 HS256/384/512；其他算法返回 supported=false）。 */
export async function verifyJwt(token: string, secret: string): Promise<JwtVerifyResult> {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('JWT 格式不合法');
  const { header } = decodeJwt(token);
  const alg = String(header.alg ?? '');
  if (!['HS256', 'HS384', 'HS512'].includes(alg)) {
    return { alg, supported: false, valid: false, reason: `暂不支持校验 ${alg || '未知'} 算法（本地仅支持 HS256/384/512）` };
  }
  const expect = await hsSign(`${parts[0]}.${parts[1]}`, secret, alg as HsAlgo);
  return { alg, supported: true, valid: expect === parts[2], reason: expect === parts[2] ? undefined : '签名不匹配' };
}

/** 十六进制摘要展示辅助（供调试）。 */
export const toHex = bytesToHex;
