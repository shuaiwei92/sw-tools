import { describe, expect, it } from 'vitest';
import { calcSubnet } from './subnet';

function info(ip: string, cidr: number) {
  const r = calcSubnet(ip, cidr);
  if ('error' in r) throw new Error(`unexpected error: ${r.error}`);
  return r;
}

describe('calcSubnet', () => {
  it('computes /24', () => {
    const r = info('192.168.1.100', 24);
    expect(r.network).toBe('192.168.1.0');
    expect(r.broadcast).toBe('192.168.1.255');
    expect(r.firstHost).toBe('192.168.1.1');
    expect(r.lastHost).toBe('192.168.1.254');
    expect(r.hostCount).toBe(254);
    expect(r.mask).toBe('255.255.255.0 (/24)');
    expect(r.wildcard).toBe('0.0.0.255');
    expect(r.isPrivate).toBe(true);
  });

  it('computes /8 private range', () => {
    const r = info('10.0.0.5', 8);
    expect(r.network).toBe('10.0.0.0');
    expect(r.hostCount).toBe(16777214);
    expect(r.isPrivate).toBe(true);
    expect(r.ipClass).toBe('A');
  });

  it('computes /20', () => {
    const r = info('172.16.5.10', 20);
    expect(r.network).toBe('172.16.0.0');
    expect(r.broadcast).toBe('172.16.15.255');
    expect(r.hostCount).toBe(4094);
    expect(r.mask).toBe('255.255.240.0 (/20)');
  });

  it('handles /31 and /32', () => {
    const r31 = info('192.168.1.0', 31);
    expect(r31.hostCount).toBe(2);
    expect(r31.firstHost).toBe('192.168.1.0');
    expect(r31.lastHost).toBe('192.168.1.1');
    const r32 = info('8.8.8.8', 32);
    expect(r32.hostCount).toBe(1);
    expect(r32.firstHost).toBe('8.8.8.8');
    expect(r32.broadcast).toBe('8.8.8.8');
    expect(r32.mask).toBe('255.255.255.255 (/32)');
  });

  it('handles /0', () => {
    const r = info('1.2.3.4', 0);
    expect(r.network).toBe('0.0.0.0');
    expect(r.broadcast).toBe('255.255.255.255');
    expect(r.hostCount).toBe(4294967294);
  });

  it('classifies addresses', () => {
    expect(info('127.0.0.1', 8).isPrivate).toBe(true);
    expect(info('8.8.8.8', 32).isPrivate).toBe(false);
    expect(info('224.0.0.1', 4).ipClass).toBe('D（组播）');
    expect(info('250.1.1.1', 8).ipClass).toBe('E（保留）');
  });

  it('rejects invalid input', () => {
    expect(calcSubnet('300.1.1.1', 24)).toHaveProperty('error');
    expect(calcSubnet('1.2.3', 24)).toHaveProperty('error');
    expect(calcSubnet('a.b.c.d', 24)).toHaveProperty('error');
    expect(calcSubnet('1.1.1.1', 33)).toHaveProperty('error');
    expect(calcSubnet('1.1.1.1', -1)).toHaveProperty('error');
  });
});
