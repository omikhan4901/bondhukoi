// Runs inside Maestro (GraalJS): B accepts A's pending request through the API.
const api = `${API_URL}/api/friends/requests`;
const incoming = json(http.get(api, { headers: { Authorization: `Bearer ${B_TOKEN}` } }).body).incoming;
const req = incoming[0];
http.post(`${api}/${req.id}/accept`, { headers: { Authorization: `Bearer ${B_TOKEN}` }, body: '' });
