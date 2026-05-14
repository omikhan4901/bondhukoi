# BondhuKoi Backend

A privacy-first location-sharing API for university campuses built with Fastify.

## Features

- **Authentication** - JWT-based user authentication with signup/login
- **User Management** - Profile updates, privacy settings
- **Circles** - Create and manage friend groups with role-based access
- **Location Tracking** - Track user presence in circles/campuses
- **Friends** - Friend requests and friend list management
- **Priority Alerts** - Watch specific friends for notifications
- **Activity Logs** - Activity feed for circle members

## Project Structure

```
src/
├── index.js              # Main server entry point
├── db/
│   └── database.js       # In-memory database (MVP)
├── routes/
│   ├── auth.js          # Authentication endpoints
│   ├── users.js         # User profile endpoints
│   ├── circles.js       # Circle management endpoints
│   ├── friends.js       # Friend request & watch endpoints
│   └── locations.js     # Location tracking endpoints
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── utils/
│   ├── auth.js          # Password hashing, token generation
│   └── validation.js    # Joi schemas & validation
└── services/            # (Future: Business logic services)
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Logout (client-side only)

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update profile
- `PATCH /api/users/me/sharing` - Toggle location sharing
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/search/:query` - Search users

### Circles
- `POST /api/circles` - Create circle
- `GET /api/circles` - Get user's circles
- `GET /api/circles/:circleId` - Get circle details
- `PATCH /api/circles/:circleId` - Update circle (admin)
- `DELETE /api/circles/:circleId` - Delete circle (admin)
- `POST /api/circles/:circleId/members` - Add member (admin)
- `DELETE /api/circles/:circleId/members/:userId` - Remove member (admin)

### Friends
- `POST /api/friends/requests` - Send friend request
- `GET /api/friends/requests/pending` - Get pending requests
- `PATCH /api/friends/requests/:requestId/accept` - Accept request
- `DELETE /api/friends/requests/:requestId` - Reject request
- `GET /api/friends/list` - Get friends list
- `POST /api/friends/watch` - Set up watch request
- `PATCH /api/friends/watch/:watchId/accept` - Accept watch
- `DELETE /api/friends/watch/:watchId` - Remove watch
- `GET /api/friends/watch/list` - Get watch list

### Locations
- `POST /api/locations/update` - Update user location
- `GET /api/locations/recent` - Get recent locations
- `GET /api/locations/friend/:friendId` - Get friend's location
- `GET /api/locations/circle/:circleId` - Get circle members' locations
- `GET /api/locations/activity/:circleId` - Get circle activity log
- `GET /api/locations/stats/:circleId` - Get circle statistics

## Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your configuration
```

## Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will start on `http://localhost:3000`

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Database

Currently uses **in-memory storage** for rapid development. For production:
- Replace with PostgreSQL for relational data
- Use Redis for real-time presence/WebSockets
- Implement MongoDB for activity logs (optional)

## Next Steps

1. **Database Migration** - Move to PostgreSQL/MongoDB
2. **Real-time Features** - Implement WebSocket for live presence
3. **Push Notifications** - Send alerts to watched friends
4. **Polygon Validation** - Implement GPS point-in-polygon checking
5. **Google Maps Integration** - For boundary/place management
6. **Tests** - Add unit and integration tests
7. **Production Deployment** - Docker, CI/CD setup

## Environment Variables

See `.env.example` for all available options.

## Development

### Adding new endpoints

1. Create route file in `src/routes/`
2. Define validation schema in `src/utils/validation.js`
3. Register route in `src/index.js`
4. Add JWT verification if needed

### Error Handling

All errors return structured JSON responses:
```json
{
  "error": "Error type",
  "message": "Human-readable message"
}
```

## License

ISC
