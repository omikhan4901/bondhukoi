import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inQuietHours, localHour } from '../src/lib/time.js';
import { polygonToWkt, geojsonToPoints } from '../src/lib/geo.js';
import { presenceFor, STALE_MS } from '../src/lib/visibility.js';
import { loadConfig } from '../src/config.js';

// 2026-10-01 12:00 UTC is 18:00 in Dhaka (UTC+6, no daylight saving).
const at = (utcHour, utcMinute = 0) => new Date(Date.UTC(2026, 9, 1, utcHour, utcMinute));

test('local hour is Bangladesh time, not the server clock', () => {
  assert.equal(localHour(at(12)), 18);
  assert.equal(localHour(at(18)), 0);
  assert.equal(localHour(at(23, 59)), 5);
});

test('quiet hours wrap past midnight', () => {
  const p = { quiet_hours_enabled: true, quiet_start: 18, quiet_end: 6 };
  assert.equal(inQuietHours(p, at(11, 59)), false); // 17:59
  assert.equal(inQuietHours(p, at(12)), true); // 18:00
  assert.equal(inQuietHours(p, at(18)), true); // 00:00
  assert.equal(inQuietHours(p, at(23, 59)), true); // 05:59
  assert.equal(inQuietHours(p, at(0)), false); // 06:00
});

test('quiet hours within a day, off, and zero-length', () => {
  assert.equal(inQuietHours({ quiet_hours_enabled: true, quiet_start: 13, quiet_end: 14 }, at(7, 30)), true);
  assert.equal(inQuietHours({ quiet_hours_enabled: true, quiet_start: 13, quiet_end: 14 }, at(8)), false);
  assert.equal(inQuietHours({ quiet_hours_enabled: false, quiet_start: 18, quiet_end: 6 }, at(18)), false);
  assert.equal(inQuietHours({ quiet_hours_enabled: true, quiet_start: 9, quiet_end: 9 }, at(3)), false);
});

test('polygons are closed, deduplicated and size-checked', () => {
  const square = [
    { lat: 23.8133, lng: 90.4235 },
    { lat: 23.8133, lng: 90.4275 },
    { lat: 23.8169, lng: 90.4275 },
    { lat: 23.8169, lng: 90.4235 },
  ];
  const wkt = polygonToWkt(square);
  assert.match(wkt, /^POLYGON\(\(90\.4235 23\.8133, .*90\.4235 23\.8133\)\)$/);
  // An already-closed ring and repeated points give the same result.
  assert.equal(polygonToWkt([...square, square[0]]), wkt);
  assert.equal(polygonToWkt([square[0], square[0], ...square.slice(1)]), wkt);
  assert.throws(() => polygonToWkt([square[0], square[0], square[1]]), /at least 3/);
  assert.throws(
    () => polygonToWkt([{ lat: 23.7, lng: 90.3 }, { lat: 23.7, lng: 90.5 }, { lat: 23.9, lng: 90.5 }]),
    /too big/,
  );
  assert.throws(
    () => polygonToWkt([{ lat: 23.8, lng: 90.4 }, { lat: 23.8, lng: 90.40001 }, { lat: 23.80001, lng: 90.40001 }]),
    /too small/,
  );
  assert.deepEqual(geojsonToPoints('{"type":"Polygon","coordinates":[[[90,23],[91,23],[91,24],[90,23]]]}'), [
    { lat: 23, lng: 90 },
    { lat: 23, lng: 91 },
    { lat: 24, lng: 91 },
  ]);
});

test('presence rules', () => {
  const now = at(6); // 12:00 in Dhaka
  const base = {
    status: 'active',
    sharing_enabled: true,
    share_campus: true,
    quiet_hours_enabled: true,
    quiet_start: 18,
    quiet_end: 6,
    on_campus: true,
    circle_ids: ['c1', 'c2'],
    checked_at: new Date(now - 60_000),
  };
  const visible = new Set(['c1']);

  assert.deepEqual(presenceFor(base, visible, now).circleIds, ['c1'], 'only circles the viewer shares');
  assert.equal(presenceFor(base, visible, now).state, 'here');
  assert.equal(presenceFor({ ...base, share_campus: false, circle_ids: [] }, visible, now).state, 'away');
  assert.equal(presenceFor({ ...base, share_campus: false }, new Set(), now).state, 'away');
  assert.equal(presenceFor({ ...base, sharing_enabled: false }, visible, now).state, 'off');
  assert.equal(presenceFor({ ...base, status: 'suspended' }, visible, now).state, 'off');
  assert.equal(presenceFor(base, visible, at(13)).state, 'off', 'quiet hours (19:00)');
  // Paused and quiet look exactly the same to friends.
  assert.deepEqual(presenceFor({ ...base, sharing_enabled: false }, visible, now), presenceFor(base, visible, at(13)));
  assert.equal(presenceFor({ ...base, checked_at: new Date(now - STALE_MS - 1) }, visible, now).state, 'unknown');
  assert.equal(presenceFor({ ...base, checked_at: null }, visible, now).state, 'unknown');
});

test('config refuses to start without secrets or with a weak one', () => {
  assert.throws(() => loadConfig({}), /DATABASE_URL is required/);
  const ok = { DATABASE_URL: 'postgres://x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' };
  assert.equal(loadConfig(ok).jwtSecret, '');
  assert.throws(() => loadConfig({ ...ok, SUPABASE_JWT_SECRET: 'short' }), /at least 32/);
  assert.equal(loadConfig({ ...ok, NODE_ENV: 'production' }).databaseSsl, true);
});
