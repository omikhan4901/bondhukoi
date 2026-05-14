# Backend Setup & Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Postman/Thunder Client for API testing

### Quick Start

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Update .env with your values
# For development, defaults should work fine

# 5. Start development server
npm run dev

# Expected output:
# 🚀 BondhuKoi Backend running on http://localhost:3000
```

### Testing the API

```bash
# In another terminal, test health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2026-03-23T..."}
```

## Project Structure Overview

```
backend/
├── src/
│   ├── index.js                    # Server entry point
│   ├── db/
│   │   └── database.js             # In-memory DB (MVP)
│   ├── routes/                     # API route handlers
│   │   ├── auth.js                 # /api/auth/*
│   │   ├── users.js                # /api/users/*
│   │   ├── circles.js              # /api/circles/*
│   │   ├── friends.js              # /api/friends/*
│   │   └── locations.js            # /api/locations/*
│   ├── middleware/
│   │   └── auth.js                 # JWT authentication
│   ├── utils/
│   │   ├── auth.js                 # Password hashing, tokens
│   │   └── validation.js           # Joi validation schemas
│   └── services/                   # (Future business logic)
├── package.json                     # Dependencies
├── .env.example                     # Environment template
├── README.md                        # Documentation
└── API_TESTING.md                   # API testing guide
```

## Environment Variables

See `.env.example`. Key variables:

```
PORT=3000                           # Server port
NODE_ENV=development               # Environment
JWT_SECRET=your_super_secret_key   # JWT signing key (change for prod!)
CORS_ORIGIN=*                      # CORS allowed origins
```

## API Quick Reference

### Server Health
```
GET /health
GET /api
```

### Authentication
```
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/verify
POST /api/auth/logout
```

### Users (all require auth)
```
GET  /api/users/me
PATCH /api/users/me
PATCH /api/users/me/sharing
GET  /api/users/:userId
GET  /api/users/search/:query
```

### Circles (all require auth)
```
POST   /api/circles
GET    /api/circles
GET    /api/circles/:circleId
PATCH  /api/circles/:circleId
DELETE /api/circles/:circleId
POST   /api/circles/:circleId/members
DELETE /api/circles/:circleId/members/:userId
```

### Friends (all require auth)
```
POST   /api/friends/requests
GET    /api/friends/requests/pending
PATCH  /api/friends/requests/:requestId/accept
DELETE /api/friends/requests/:requestId
GET    /api/friends/list
POST   /api/friends/watch
PATCH  /api/friends/watch/:watchId/accept
DELETE /api/friends/watch/:watchId
GET    /api/friends/watch/list
```

### Locations (all require auth)
```
POST /api/locations/update
GET  /api/locations/recent
GET  /api/locations/friend/:friendId
GET  /api/locations/circle/:circleId
GET  /api/locations/activity/:circleId
GET  /api/locations/stats/:circleId
```

## Common Development Tasks

### Add a new endpoint

1. Add validation schema in `src/utils/validation.js`:
```javascript
newFeature: Joi.object({
  name: Joi.string().required(),
  value: Joi.number().optional(),
})
```

2. Create or update route file in `src/routes/`:
```javascript
fastify.post('/endpoint', async (request, reply) => {
  await request.jwtVerify(); // If authentication needed
  
  const { error, value } = validate(request.body, schemas.newFeature);
  if (error) return reply.status(400).send({ error: 'Validation failed' });
  
  // ... logic here
  reply.status(201).send({ message: 'Success' });
});
```

3. Register in `src/index.js`:
```javascript
fastify.register(yourRoutes, { prefix: '/api/endpoint' });
```

### Test an endpoint

```bash
# Using curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@nsu.edu","password":"pass123"}'

# Using Node.js fetch
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@nsu.edu', password: 'pass123' })
});
const data = await response.json();
console.log(data);
```

## Connecting Frontend

Update frontend API calls:

```javascript
// In your frontend API service
const API_BASE_URL = 'http://localhost:3000';

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};
```

## Database Considerations

### Current (MVP - In-Memory)
✅ Fast development
✅ No setup required
❌ Data lost on restart
❌ Not scalable

### Production Recommendations

#### Option 1: PostgreSQL (Recommended)
```bash
# Install Fastify PostgreSQL plugin
npm install @fastify/postgres pg

# Update src/db/database.js to use PostgreSQL
# See Fastify docs for implementation
```

#### Option 2: MongoDB
```bash
# Install Fastify MongoDB plugin
npm install @fastify/mongodb mongodb

# Update src/db/database.js to use MongoDB
```

#### Option 3: Hybrid (Best for this app)
- **PostgreSQL** for users, circles, friends (relational)
- **Redis** for real-time presence/WebSockets
- **MongoDB** for activity logs (optional)

## Performance Tips

1. **Add indexing** - Index email, userId, circleId
2. **Pagination** - Implement limit/offset for lists
3. **Caching** - Cache friend lists, circle info
4. **Real-time** - Use WebSockets for live updates
5. **Rate limiting** - Prevent abuse with @fastify/rate-limit

## Security Checklist

- ✅ Password hashing with bcrypt
- ✅ JWT authentication
- ✅ CORS enabled
- ⚠️ Change JWT_SECRET for production
- ⚠️ Implement rate limiting
- ⚠️ Add input sanitization
- ⚠️ Use HTTPS in production
- ⚠️ Add request/response logging
- ⚠️ Implement API versioning

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
# macOS/Linux:
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### JWT issues
- Ensure token is in Authorization header
- Token format: `Bearer <token>`
- Check JWT_SECRET matches between signup and login

### CORS errors
- Update CORS_ORIGIN in .env
- Default allows all origins (*)

## Next Steps

1. **Setup Production Database** - Choose PostgreSQL or MongoDB
2. **Implement WebSockets** - For real-time presence
3. **Add Tests** - Jest/Mocha for route testing
4. **Setup CI/CD** - GitHub Actions or similar
5. **Deploy** - Heroku, Railway, DigitalOcean, etc.
6. **Monitor** - Sentry for error tracking
7. **Analytics** - Track API usage

## Useful Resources

- [Fastify Documentation](https://www.fastify.io/)
- [JWT Introduction](https://jwt.io/introduction)
- [Joi Validation](https://joi.dev/api/)
- [bcrypt Guide](https://www.npmjs.com/package/bcrypt)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
