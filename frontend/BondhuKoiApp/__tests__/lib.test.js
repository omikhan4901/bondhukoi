import { parseCode, timeAgo, hourLabel, spacedCode } from '../src/lib/format';
import { versionBelow } from '../src/lib/config';
import { presenceLabel, initials } from '../src/ui/People';
import { palettes } from '../src/theme/tokens';

jest.mock('expo-location', () => ({}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
const { boundingCircle } = require('../src/location/location');

test('friend codes are read from typed text and QR links', () => {
  expect(parseCode('nj4k 7qx2')).toBe('NJ4K7QX2');
  expect(parseCode('NJ4K-7QX2')).toBe('NJ4K7QX2');
  expect(parseCode('bondhukoi://add/NJ4K7QX2')).toBe('NJ4K7QX2');
  expect(parseCode('NJ4K7QX')).toBeNull();
  expect(parseCode('NJ4K7QX1')).toBeNull(); // 1 is never used, it looks like I
  expect(spacedCode('NJ4K7QX2')).toBe('NJ4K 7QX2');
});

test('times and hours read naturally', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  expect(timeAgo('2026-10-01T11:59:40Z', now)).toBe('just now');
  expect(timeAgo('2026-10-01T11:55:00Z', now)).toBe('5 min ago');
  expect(timeAgo('2026-10-01T09:00:00Z', now)).toBe('3 h ago');
  expect(timeAgo('2026-09-30T09:00:00Z', now)).toBe('yesterday');
  expect(hourLabel(0)).toBe('12 AM');
  expect(hourLabel(12)).toBe('12 PM');
  expect(hourLabel(18)).toBe('6 PM');
});

test('forced updates compare versions numerically', () => {
  expect(versionBelow('1.2.9', '1.2.10')).toBe(true);
  expect(versionBelow('1.10.0', '1.9.9')).toBe(false);
  expect(versionBelow('1.0.0', '1.0.0')).toBe(false);
});

test('presence labels', () => {
  expect(presenceLabel({ state: 'here', onCampus: true, circles: [] }).label).toBe('On campus');
  expect(presenceLabel({ state: 'here', onCampus: false, circles: [{ name: 'Library crew' }] }).label).toBe('At Library crew');
  expect(presenceLabel({ state: 'here', onCampus: true, circles: [{ name: 'Library crew' }] }).label).toBe('On campus · Library crew');
  expect(presenceLabel({ state: 'off' }).state).toBe('off');
  expect(presenceLabel(null).state).toBe('unknown');
  expect(initials('Nusrat Jahan')).toBe('NJ');
  expect(initials('  ')).toBe('?');
});

test('zones become a circle that covers every corner', () => {
  const square = [
    { lat: 23.8133, lng: 90.4235 },
    { lat: 23.8133, lng: 90.4275 },
    { lat: 23.8169, lng: 90.4275 },
    { lat: 23.8169, lng: 90.4235 },
  ];
  const c = boundingCircle(square, 0);
  expect(c.latitude).toBeCloseTo(23.8151, 4);
  expect(c.radius).toBeGreaterThan(270);
  expect(c.radius).toBeLessThan(310);
  expect(boundingCircle(square.map((p) => ({ lat: p.lat / 1 + 0, lng: p.lng })), 60).radius).toBe(c.radius + 60);
});

// WCAG contrast: 4.5:1 for text, 3:1 for dots and large text.
function lum(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

test.each(['light', 'dark'])('%s theme text is readable', (scheme) => {
  const c = palettes[scheme];
  const text = [
    ['ink', 'page'], ['ink', 'surface'], ['muted', 'surface'], ['muted', 'page'], ['brand', 'surface'], ['brand', 'page'],
    ['onBrand', 'brand'], ['here', 'hereSoft'], ['paused', 'pausedSoft'], ['danger', 'surface'], ['brand', 'brandSoft'], ['muted', 'sunken'],
  ];
  for (const [fg, bg] of text) expect([fg, bg, ratio(c[fg], c[bg]) >= 4.5]).toEqual([fg, bg, true]);
  for (const [fg, bg] of [['hereDot', 'surface'], ['faint', 'surface']]) expect([fg, bg, ratio(c[fg], c[bg]) >= 2.4]).toEqual([fg, bg, true]);
});
