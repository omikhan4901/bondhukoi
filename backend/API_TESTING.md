# API Testing Guide

Quick reference for testing BondhuKoi API endpoints.

## Setup

1. Start server: `npm run dev`
2. Use Postman, Thunder Client, or curl
3. Base URL: `http://localhost:3000`

## Test Sequences

### 1. User Registration & Login

```bash
# Sign up
POST /api/auth/signup
Content-Type: application/json

{
  "name": "Arif Rahaman",
  "email": "arif@nsu.edu",
  "password": "securepass123",
  "university": "North South University",
  "facebook": "@arif.rahman",
  "instagram": "@arif_r"
}

# Response includes: user, token
# Copy token for subsequent requests

# Login
POST /api/auth/login
{
  "email": "arif@nsu.edu",
  "password": "securepass123"
}

# Verify token
GET /api/auth/verify
Authorization: Bearer <token>
```

### 2. User Profile

```bash
# Get current user
GET /api/users/me
Authorization: Bearer <token>

# Update profile
PATCH /api/users/me
Authorization: Bearer <token>
{
  "name": "Arif Rahman Updated",
  "facebook": "@arif.new",
  "instagram": "@arif_new"
}

# Toggle sharing
PATCH /api/users/me/sharing
Authorization: Bearer <token>
{
  "enabled": false
}
```

### 3. Circles Management

```bash
# Create circle
POST /api/circles
Authorization: Bearer <token>
{
  "name": "The Night Owls",
  "description": "Engineering final semester project team",
  "type": "university",
  "isOpen": false
}

# Get all circles
GET /api/circles
Authorization: Bearer <token>

# Get circle details
GET /api/circles/{circleId}
Authorization: Bearer <token>

# Update circle
PATCH /api/circles/{circleId}
Authorization: Bearer <token>
{
  "name": "Night Owls Updated",
  "isOpen": true
}

# Add member
POST /api/circles/{circleId}/members
Authorization: Bearer <token>
{
  "userId": "{friendUserId}"
}

# Remove member
DELETE /api/circles/{circleId}/members/{userId}
Authorization: Bearer <token>
```

### 4. Friends

```bash
# Send friend request
POST /api/friends/requests
Authorization: Bearer <token>
{
  "friendEmail": "nadia@nsu.edu"
}

# Get pending requests
GET /api/friends/requests/pending
Authorization: Bearer <token>

# Accept friend request
PATCH /api/friends/requests/{requestId}/accept
Authorization: Bearer <token>

# Get friends list
GET /api/friends/list
Authorization: Bearer <token>

# Set watch request (priority alerts)
POST /api/friends/watch
Authorization: Bearer <token>
{
  "friendId": "{friendId}",
  "scope": "campus"
}

# Get watch list
GET /api/friends/watch/list
Authorization: Bearer <token>
```

### 5. Locations & Activity

```bash
# Update location
POST /api/locations/update
Authorization: Bearer <token>
{
  "latitude": 23.8103,
  "longitude": 90.4125,
  "accuracy": 15,
  "isInside": true,
  "circleId": "{circleId}"
}

# Get recent locations
GET /api/locations/recent?limit=10
Authorization: Bearer <token>

# Get friend's location
GET /api/locations/friend/{friendId}
Authorization: Bearer <token>

# Get circle members' locations
GET /api/locations/circle/{circleId}
Authorization: Bearer <token>

# Get activity log
GET /api/locations/activity/{circleId}?limit=50
Authorization: Bearer <token>

# Get circle statistics
GET /api/locations/stats/{circleId}
Authorization: Bearer <token>
```

## Sample Test Flow

```bash
# 1. Create two test users
User1: arif@nsu.edu / token1
User2: nadia@nsu.edu / token2

# 2. Send friend request (User1 → User2)
POST /api/friends/requests (with token1)
{
  "friendEmail": "nadia@nsu.edu"
}

# 3. Accept request (User2)
PATCH /api/friends/requests/{requestId}/accept (with token2)

# 4. Create circle (User1)
POST /api/circles (with token1)
{
  "name": "Study Group",
  "type": "university"
}

# 5. Add User2 to circle (User1)
POST /api/circles/{circleId}/members (with token1)
{
  "userId": "{user2Id}"
}

# 6. Update location (User1 in circle)
POST /api/locations/update (with token1)
{
  "latitude": 23.81,
  "longitude": 90.41,
  "isInside": true,
  "circleId": "{circleId}"
}

# 7. View circle members (User2)
GET /api/locations/circle/{circleId} (with token2)

# 8. Set watch on User1 (User2)
POST /api/friends/watch (with token2)
{
  "friendId": "{user1Id}",
  "scope": "campus"
}
```

## Expected Response Format

### Success (2xx)
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error (4xx/5xx)
```json
{
  "error": "Error type",
  "message": "Detailed message",
  "statusCode": 400
}
```

## Headers

All requests (except auth) need:
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

## Common Status Codes

- `201` - Created successfully
- `400` - Validation error
- `401` - Unauthorized/Invalid token
- `403` - Forbidden/No permission
- `404` - Not found
- `409` - Conflict (already exists)
- `500` - Server error
