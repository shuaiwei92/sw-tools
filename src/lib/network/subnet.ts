// IPv4 / CIDR 子网计算（纯函数，零依赖）。

export interface SubnetInfo {
  ip: string;
  cidr: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  hostCount: number;
  totalCount: number;
  ipClass: string;
  isPrivate: boolean;
}

export type SubnetResult = SubnetInfo | { error: string };

function parseIpv4(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function toIpv4(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

/** 计算子网信息；ip 非法或 cidr 越界时返回 { error }。 */
export function calcSubnet(ip: string, cidr: number): SubnetResult {
  const addr = parseIpv4(ip);
  if (addr === null) return { error: 'IPv4 地址格式不正确（应为 0~255 的四段数字）' };
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) return { error: 'CIDR 前缀长度应在 0 ~ 32 之间' };

  const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
  const network = (addr & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = cidr >= 32 ? 1 : Math.pow(2, 32 - cidr);
  const hostCount = cidr >= 31 ? total : total - 2;

  const firstOctet = (addr >>> 24) & 255;
  let ipClass = 'E（保留）';
  if (firstOctet < 128) ipClass = 'A';
  else if (firstOctet < 192) ipClass = 'B';
  else if (firstOctet < 224) ipClass = 'C';
  else if (firstOctet < 240) ipClass = 'D（组播）';

  const a = firstOctet;
  const b = (addr >>> 16) & 255;
  const isPrivate =
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127;

  return {
    ip: ip.trim(),
    cidr,
    mask: `${toIpv4(mask)} (/${cidr})`,
    wildcard: toIpv4(~mask >>> 0),
    network: toIpv4(network),
    broadcast: toIpv4(broadcast),
    firstHost: cidr >= 31 ? toIpv4(network) : toIpv4((network + 1) >>> 0),
    lastHost: cidr >= 31 ? toIpv4(broadcast) : toIpv4((broadcast - 1) >>> 0),
    hostCount,
    totalCount: total,
    ipClass,
    isPrivate,
  };
}

/** 常见 CIDR 速查（前缀 → 掩码 / 主机数）。 */
export const CIDR_TABLE = Array.from({ length: 33 }, (_, c) => {
  const mask = c === 0 ? 0 : (0xffffffff << (32 - c)) >>> 0;
  const total = c >= 32 ? 1 : Math.pow(2, 32 - c);
  return {
    cidr: c,
    mask: toIpv4(mask),
    hosts: c >= 31 ? total : total - 2,
  };
});
