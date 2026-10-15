// 简繁体转换（opencc-js）与汉字转拼音（pinyin-pro）。仅客户端使用。

import { Converter } from 'opencc-js';
import { pinyin } from 'pinyin-pro';

const cn2tw = new Converter({ from: 'cn', to: 'tw' });
const cn2hk = new Converter({ from: 'cn', to: 'hk' });
const tw2cn = new Converter({ from: 'tw', to: 'cn' });
const hk2cn = new Converter({ from: 'hk', to: 'cn' });

export type ConvertDir = 's2t' | 's2hk' | 't2s' | 'hk2s';

export function convertChinese(text: string, dir: ConvertDir): string {
  if (!text) return '';
  switch (dir) {
    case 's2t':
      return cn2tw(text);
    case 's2hk':
      return cn2hk(text);
    case 't2s':
      return tw2cn(text);
    case 'hk2s':
      return hk2cn(text);
  }
}

export type PinyinStyle = 'symbol' | 'num' | 'none' | 'first';

/** 汉字转拼音。symbol=带声调符号；num=数字声调；none=无声调；first=首字母。 */
export function toPinyin(text: string, style: PinyinStyle): string {
  if (!text) return '';
  if (style === 'first') {
    return pinyin(text, { pattern: 'first', type: 'array' }).join(' ');
  }
  return pinyin(text, { toneType: style, type: 'array' }).join(' ');
}
