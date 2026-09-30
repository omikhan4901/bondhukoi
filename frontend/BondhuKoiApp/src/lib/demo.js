/**
 * Sample data for the demo build (EXPO_PUBLIC_DEMO=1): design previews and store
 * screenshots. Everyone here is made up. Changes are kept in memory only.
 */
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const person = (id, name, extra = {}) => ({ id, name, avatarUrl: null, university: 'NSU', facebook: null, instagram: null, ...extra });

const people = {
  tahmid: person('u-tahmid', 'Tahmid Rahman', { instagram: 'tahmid.r' }),
  ayesha: person('u-ayesha', 'Ayesha Siddiqua'),
  rafi: person('u-rafi', 'Rafi Hasan', { facebook: 'rafi.hasan' }),
  samiha: person('u-samiha', 'Samiha Akter'),
  arif: person('u-arif', 'Arif Chowdhury'),
  mahin: person('u-mahin', 'Mahin Islam'),
  tanvir: person('u-tanvir', 'Tanvir Ahmed'),
};

const circles = {
  thesis: { id: 'c-thesis', name: 'Thesis group', description: 'CSE 499, Dr. Karim', locationLabel: 'SAC building, 4th floor' },
  library: { id: 'c-library', name: 'Library crew', description: '', locationLabel: 'Central library' },
  cse499: { id: 'c-cse499', name: 'CSE 499 team', description: '', locationLabel: 'Lab 632' },
};

const state = {
  privacy: { sharingEnabled: true, shareCampus: true, quietHoursEnabled: true, quietStart: 18, quietEnd: 6, shortHistory: true },
  notifications: { friendRequests: true, circleInvites: true, watchRequests: true, watchAlerts: true },
};

const presence = (st, extra = {}) => ({ state: st, onCampus: st === 'here', circles: [], updatedAt: st === 'here' || st === 'away' ? minutesAgo(8) : null, ...extra });

function friends() {
  return [
    { ...people.tahmid, presence: presence('here', { circles: [{ id: circles.library.id, name: circles.library.name }] }), watch: { id: 'w1', status: 'active', scope: 'campus' } },
    { ...people.ayesha, presence: presence('here'), watch: null },
    { ...people.arif, presence: presence('here', { circles: [{ id: circles.thesis.id, name: circles.thesis.name }] }), watch: null },
    { ...people.rafi, presence: presence('away'), watch: null },
    { ...people.tanvir, presence: presence('unknown'), watch: null },
    { ...people.samiha, presence: presence('off'), watch: null },
  ].map((f) => ({ ...f, friendsSince: minutesAgo(60 * 24 * 30) }));
}

function me() {
  return {
    user: {
      id: 'u-me',
      name: 'Nusrat Jahan',
      email: 'nusrat.jahan@northsouth.edu',
      university: { id: 'nsu', name: 'North South University', shortName: 'NSU' },
      friendCode: 'NJ4K7QX2',
      avatarUrl: null,
      facebook: 'nusrat.jahan',
      instagram: null,
      isAdmin: false,
      createdAt: minutesAgo(60 * 24 * 40),
    },
    privacy: state.privacy,
    notifications: state.notifications,
    counts: { friends: 6, circles: 2 },
  };
}

function circleSummary(c, extra) {
  return { hasZone: true, messengerLink: 'https://m.me/j/demo', snapshotUrl: null, createdAt: minutesAgo(60 * 24 * 10), detectionEnabled: true, ...c, ...extra };
}

const routes = {
  'GET /api/config': () => ({ maintenance: { enabled: false, message: '' }, banner: null, minAppVersion: '1.0.0', features: { watch: true, feed: true, googleSignIn: false }, signupsOpen: true, invitesRequired: false }),
  'GET /api/me': me,
  'GET /api/me/presence': () => ({
    presence: state.privacy.sharingEnabled
      ? { state: 'here', onCampus: true, circles: [{ id: circles.thesis.id, name: circles.thesis.name }], updatedAt: minutesAgo(4) }
      : { state: 'off', onCampus: false, circles: [], updatedAt: null },
  }),
  'GET /api/friends': () => ({ friends: friends() }),
  'GET /api/friends/requests': () => ({ incoming: [{ id: 'r1', createdAt: minutesAgo(35), user: people.mahin }], outgoing: [] }),
  'GET /api/watches': () => ({
    watching: [{ id: 'w1', scope: 'campus', status: 'active', createdAt: minutesAgo(9000), user: people.tahmid }],
    watchers: [{ id: 'w2', scope: 'campus', status: 'pending', createdAt: minutesAgo(50), user: people.rafi }],
  }),
  'GET /api/circles': () => ({
    circles: [
      circleSummary(circles.thesis, { role: 'admin', memberCount: 5, hereCount: 2, members: [people.arif, people.tahmid, people.ayesha, people.rafi] }),
      circleSummary(circles.library, { role: 'member', memberCount: 4, hereCount: 1, members: [people.tahmid, people.ayesha, people.samiha] }),
    ],
  }),
  'GET /api/circles/invitations': () => ({
    invitations: [circleSummary(circles.cse499, { role: 'member', memberCount: 3, hereCount: 0, members: [people.tahmid, people.arif], invitedBy: { id: people.tahmid.id, name: people.tahmid.name }, messengerLink: null })],
  }),
  'GET /api/circles/c-thesis': () => ({
    circle: { ...circleSummary(circles.thesis), membersCanInvite: false },
    me: { role: 'admin', status: 'active', detectionEnabled: true },
    members: [
      { id: 'u-me', name: 'Nusrat Jahan', avatarUrl: null, university: 'NSU', role: 'admin', status: 'active', here: null, presenceState: null },
      { ...people.arif, role: 'member', status: 'active', here: true, presenceState: 'here' },
      { ...people.tahmid, role: 'member', status: 'active', here: false, presenceState: 'here' },
      { ...people.ayesha, role: 'member', status: 'active', here: false, presenceState: 'away' },
      { ...people.rafi, role: 'member', status: 'active', here: false, presenceState: 'off' },
    ],
  }),
  'GET /api/circles/c-thesis/activity': () => ({
    events: [
      { id: 'e1', kind: 'enter', at: minutesAgo(12), user: people.arif },
      { id: 'e2', kind: 'exit', at: minutesAgo(95), user: people.tahmid },
      { id: 'e3', kind: 'enter', at: minutesAgo(180), user: people.tahmid },
    ],
  }),
  'GET /api/notifications': () => ({
    waiting: [
      { type: 'friend_request', id: 'r1', at: minutesAgo(35), user: people.mahin },
      { type: 'watch_request', id: 'w2', at: minutesAgo(50), scope: 'campus', user: people.rafi },
      { type: 'circle_invite', id: circles.cse499.id, at: minutesAgo(120), circle: { id: circles.cse499.id, name: circles.cse499.name }, user: people.tahmid },
    ],
    alerts: [
      { type: 'watch_alert', id: 'a1', at: minutesAgo(22), kind: 'enter', place: { kind: 'campus' }, user: people.tahmid },
      { type: 'watch_alert', id: 'a2', at: minutesAgo(60 * 20), kind: 'exit', place: { kind: 'campus' }, user: people.tahmid },
    ],
    nextBefore: null,
  }),
  'GET /api/me/visibility': () => ({
    sharingEnabled: state.privacy.sharingEnabled,
    friends: friends().map((f) => ({ ...f, seesCampus: true })),
    circles: [
      { id: circles.thesis.id, name: circles.thesis.name, detectionEnabled: true, otherMembers: 4 },
      { id: circles.library.id, name: circles.library.name, detectionEnabled: true, otherMembers: 3 },
    ],
    watchers: [{ watchId: 'w2', scope: 'campus', status: 'pending', since: minutesAgo(50), user: people.rafi }],
    blocked: [],
  }),
  'GET /api/blocks': () => ({ blocked: [] }),
  'GET /api/presence/zones': () => ({ zones: [] }),
};

export async function demoApi(method, path, body) {
  await new Promise((r) => setTimeout(r, 150));
  const clean = path.split('?')[0];
  const handler = routes[`${method} ${clean}`];
  if (handler) return handler();
  if (method === 'POST' && clean === '/api/signup-check') return { ok: true, university: 'North South University' };
  if (method === 'PATCH' && clean === '/api/me/privacy') {
    Object.assign(state.privacy, body);
    return me();
  }
  if (method === 'PATCH' && clean === '/api/me/notifications') {
    Object.assign(state.notifications, body);
    return me();
  }
  if (method === 'GET' && clean.startsWith('/api/circles/') && clean.endsWith('/activity')) return { events: [] };
  if (method === 'GET' && clean.startsWith('/api/circles/') && clean.endsWith('/zone')) return { boundary: null, snapshotUrl: null };
  if (method === 'GET' && clean.startsWith('/api/circles/')) return routes['GET /api/circles/c-thesis']();
  if (method === 'GET' && clean.startsWith('/api/users/search')) return { results: [{ ...people.tanvir, relationship: 'friend' }, { ...people.mahin, relationship: 'incoming' }] };
  if (method === 'GET' && clean.startsWith('/api/users/')) return { user: { ...people.tahmid, relationship: 'friend' } };
  return { ok: true };
}

export const demoSession = { user: { id: 'u-me', email: 'nusrat.jahan@northsouth.edu' }, access_token: 'demo' };
