import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(`${process.cwd()}/src/theme.css`, 'utf8');

const rgb = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
const luminance = (color: number[]) => color.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a: number[], b: number[]) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

for (const theme of ['dark', 'light']) test(`${theme}: content and accent button labels meet 4.5:1`, () => {
  const block = theme === 'dark' ? css.split('[data-theme="light"]')[0] : css.split('[data-theme="light"]')[1].split('}')[0];
  const tokens = Object.fromEntries([...block.matchAll(/--paper-([\w-]+):\s*(#[\da-f]{6})/gi)].map(match => [match[1], rgb(match[2])]));
  for (const surface of ['bg', 'card']) {
    for (const color of ['ink', 'muted', 'red-text', 'jade-text', 'gold-text']) expect(contrast(tokens[color], tokens[surface]), `${color} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    for (const accent of ['red', 'jade', 'gold']) {
      const tint = tokens[accent].map((value, index) => .1 * value + .9 * tokens[surface][index]);
      expect(contrast(tokens[`${accent}-text`], tint), `${accent} text on 10% tint`).toBeGreaterThanOrEqual(4.5);
    }
  }
  for (const accent of ['red', 'jade', 'gold']) expect(contrast(tokens['on-accent'], tokens[accent]), `button on ${accent}`).toBeGreaterThanOrEqual(4.5);
});
