# Quick Reference Card

## Starting the Backend

```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

## Core Endpoints by Feature

### 🔑 Authentication
```
POST   /api/auth/signup           Create account
POST   /api/auth/login            Login
GET    /api/auth/verify           Verify token
POST   /api/auth/logout           Logout
```

### 👤 User Profile
```
GET    /api/users/me              Current user
PATCH  /api/users/me              Update profile
PATCH  /api/users/me/sharing      Toggle sharing on/off
GET    /api/users/:userId         Get user by ID
GET    /api/users/search/:q       Search users
```

### 👥 Circles (Groups)
```
POST   /api/circles               Create circle
GET    /api/circles               List user's circles
GET    /api/circles/:id           Get circle details
PATCH  /api/circles/:id           Update (admin only)
DELETE /api/circles/:id           Delete (admin only)
POST   /api/circles/:id/members   Add member (admin)
DELETE /api/circles/:id/members   Remove member (admin)
```

### 🤝 Friends
```
POST   /api/friends/requests      Send request
GET    /api/friends/requests/pending
PATCH  /api/friends/requests/:id/accept
DELETE /api/friends/requests/:id  Reject request
GET    /api/friends/list          Get all friends
```

### 🔔 Watch (Priority Alerts)
```
POST   /api/friends/watch         Create watch request
PATCH  /api/friends/watch/:id/accept
DELETE /api/friends/watch/:id     Remove watch
GET    /api/friends/watch/list    Get watched friends
```

### 📍 Location & Activity
```
POST   /api/locations/update      Update location
GET    /api/locations/recent      Your recent locations
GET    /api/locations/friend/:id  Friend's location
GET    /api/locations/circle/:id  Circle members' locations
GET    /api/locations/activity/:id  Circle activity log
GET    /api/locations/stats/:id   Circle statistics
```

## Common Request Examples

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@nsu.edu",
    "password": "securepass123",
    "university": "North South University"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@nsu.edu",
    "password": "securepass123"
  }'
```

### Get Current User (with token)
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Circle
```bash
curl -X POST http://localhost:3000/api/circles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Study Group",
    "description": "Final semester project",
    "type": "university",
    "isOpen": false
  }'
```

### Update Location
```bash
curl -X POST http://localhost:3000/api/locations/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "latitude": 23.8103,
    "longitude": 90.4125,
    "accuracy": 15,
    "isInside": true,
    "circleId": "circle-uuid"
  }'
```

## File Structure Quick Guide

```
backend/
├── src/
│   ├── index.js              ← Start here (server setup)
│   ├── routes/               ← Add new API endpoints
│   │   └── *.js              (auth, users, circles, friends, locations)
│   ├── middleware/
│   │   └── auth.js           ← JWT verification logic
│   ├── utils/
│   │   ├── auth.js           ← Password hashing
│   │   └── validation.js     ← Joi schemas (update to add validation)
│   └── db/
│       └── database.js       ← Database helpers (replace with DB later)
├── .env                      ← Configuration (edit for your setup)
├── package.json              ← Dependencies
└── README.md                 ← Full documentation
```

## Common Development Tasks

### Add a New Validation Schema
1. Open `src/utils/validation.js`
2. Add to `schemas` object:
```javascript
newFeature: Joi.object({
  fieldName: Joi.string().required(),
})
```

### Add a New Endpoint
1. Open relevant file in `src/routes/`
2. Add handler:
```javascript
fastify.post('/endpoint', async (request, reply) => {
  await request.jwtVerify();
  // ... your logic
  reply.send({ message: 'Success' });
});
```

### Update .env Configuration
```bash
# Edit .env file
PORT=3000
JWT_SECRET=your_secret_here
NODE_ENV=development
```

## Important Concepts

### JWT Token
- Obtained after login/signup
- Include in: `Authorization: Bearer <token>`
- Used to authenticate requests
- Includes user ID and email

### Role-Based Access
- `admin` - Can modify/delete circles, add/remove members
- `member` - Can view and use circle, add friends

### Location Sharing
- Each update tracks GPS + whether user is inside circle
- Enable/disable with `/api/users/me/sharing`
- Activity logged for activity feed

### Watch Requests
- Request permission from friend
- Friend must accept to get alerts
- Scope: 'campus' (campus only) or 'all' (all zones)

## Debugging Tips

### Check if server is running
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok",...}
```

### Test authentication
```bash
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check request/response format
- Use Postman or Thunder Client
- Can easily see headers and body
- Copy-paste from examples above

### Enable verbose logging
- Check `console.log()` output in terminal
- Server logs all errors automatically
- Look for "error" in output

## Environment Variables

```env
PORT=3000                                    # Server port
NODE_ENV=development                        # Development/Production
JWT_SECRET=your_super_secret_key           # For signing tokens
DB_TYPE=memory                              # memory or postgres/mongodb
CORS_ORIGIN=*                               # Allow all origins
LOG_LEVEL=info                              # Logging level
```

## Response Format

### Success (2xx)
```json
{
  "message": "Success message",
  "user": { ... },
  "token": "jwt.token.here",
  "circles": [ ... ]
}
```

### Error (4xx/5xx)
```json
{
  "error": "Error type",
  "message": "Detailed message",
  "statusCode": 400,
  "details": [ ... ]  // Only for validation errors
}
```

## Status Codes

- `200` OK - Request succeeded
- `201` Created - Resource created
- `400` Bad Request - Validation error
- `401` Unauthorized - Invalid/missing token
- `403` Forbidden - No permission
- `404` Not Found - Resource doesn't exist
- `409` Conflict - Resource already exists
- `500` Server Error - Server error

## Frontend Integration Checklist

- [ ] Update API base URL to `http://localhost:3000`
- [ ] Replace mock auth with `/api/auth/login`
- [ ] Replace mock user data with `/api/users/me`
- [ ] Replace mock circles with `/api/circles`
- [ ] Replace mock friends with `/api/friends/list`
- [ ] Add location updates to `/api/locations/update`
- [ ] Connect friend requests to `/api/friends/requests`
- [ ] Setup token storage (AsyncStorage)
- [ ] Add error handling for API calls
- [ ] Test end-to-end flows

## Useful Commands

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Check for errors
npm start

# View package.json dependencies
npm list

# Install specific package
npm install package-name

# Uninstall package
npm uninstall package-name
```

## Need Help?

1. Check `README.md` for full API docs
2. Check `API_TESTING.md` for example requests
3. Check `SETUP.md` for development guide
4. Check server console output for error messages
5. Review code comments in route files

---

**Quick Start:** `npm run dev` then test endpoints with curl or Postman!
