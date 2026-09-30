// B's view of A must be "off" while A is paused.
const friends = json(http.get(`${API_URL}/api/friends`, { headers: { Authorization: `Bearer ${B_TOKEN}` } }).body).friends;
const a = friends.find((f) => f.id === A_ID);
assertTrue(a.presence.state === 'off');
