// k6 load test against staging: many students checking in during the 9 AM rush, plus
// the usual reads. Run: k6 run -e SUPABASE_URL=… -e ANON_KEY=… -e API=… -e USERS=300 e2e/load/presence.js
// Test accounts load1…loadN@<a staging university domain> with password LOAD_PASSWORD must exist.
import http from 'k6/http';
import { check, sleep } from 'k6';

const USERS = Number(__ENV.USERS || 300);
export const options = {
  scenarios: {
    morning_rush: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '1m', target: USERS }, { duration: '5m', target: USERS }, { duration: '1m', target: 0 }] },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:read}': ['p(95)<300'],
    'http_req_duration{kind:check}': ['p(95)<400'],
  },
};

export function setup() {
  const tokens = [];
  for (let i = 1; i <= USERS; i++) {
    const res = http.post(`${__ENV.SUPABASE_URL}/auth/v1/token?grant_type=password`, JSON.stringify({ email: `load${i}@${__ENV.DOMAIN}`, password: __ENV.LOAD_PASSWORD }), {
      headers: { apikey: __ENV.ANON_KEY, 'content-type': 'application/json' },
    });
    tokens.push(res.json('access_token'));
  }
  return { tokens };
}

// Points around NSU: some inside the campus zone, some outside.
const spots = [
  [23.8151, 90.4255],
  [23.8155, 90.425],
  [23.8209, 90.4312],
  [23.7808, 90.2792],
];

export default function ({ tokens }) {
  const token = tokens[(__VU - 1) % tokens.length];
  const headers = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const [lat, lng] = spots[Math.floor(Math.random() * spots.length)];
  const c = http.post(`${__ENV.API}/api/presence/check`, JSON.stringify({ lat, lng, accuracy: 20 }), { headers, tags: { kind: 'check' } });
  check(c, { 'check ok': (r) => r.status === 200 || r.status === 429 });
  for (const path of ['/api/me', '/api/me/presence', '/api/friends', '/api/circles', '/api/notifications']) {
    const r = http.get(`${__ENV.API}${path}`, { headers, tags: { kind: 'read' } });
    check(r, { [`${path} ok`]: (x) => x.status === 200 });
  }
  sleep(30 + Math.random() * 30);
}
