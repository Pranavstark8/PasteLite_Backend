# 📋 PasteLite

A production-ready Pastebin service built with Node.js, Express, and MongoDB. Supports TTL expiration, view limits, deterministic testing, and atomic operations.

## ✨ Features

- **Create Pastes**: Store text content with optional TTL and view limits
- **Secure**: XSS protection, helmet security headers, input validation
- **Atomic Operations**: Race-condition-safe view counting using MongoDB
- **Deterministic Testing**: Testable time-based logic via headers
- **MongoDB Persistence**: All pastes are stored in MongoDB (no in-memory storage)
- **Vercel-Ready**: Deploy to Vercel with zero configuration



## 📦 MongoDB Persistence

All pastes are persisted in MongoDB using Mongoose. The data model includes:

- `content`: The paste text content
- `createdAt`: Creation timestamp
- `expiresAt`: Optional expiration date (for TTL)
- `maxViews`: Optional maximum view count
- `viewsUsed`: Current view count (atomically incremented)

MongoDB handles:
- Persistent storage (no data loss on server restart)
- Atomic operations for view counting
- Efficient indexing for fast lookups
- Optional TTL-based automatic cleanup

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- MongoDB instance (local or MongoDB Atlas)

### Installation

1. **Clone and install dependencies**:
```bash
cd PasteLite
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and set your MongoDB connection string:
```env
MONGODB_URI=mongodb://localhost:27017/pastelite  # or your MongoDB Atlas URI
PORT=3000
BASE_URL=http://localhost:3000
TEST_MODE=0
NODE_ENV=development
```

3. **Start the server**:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Health Check

**GET** `/api/healthz`

Check server and MongoDB connectivity.

**Response (200)**:
```json
{
  "ok": true
}
```

**Response (503)** - MongoDB disconnected:
```json
{
  "ok": false
}
```

---

### Create Paste

**POST** `/api/pastes`

Create a new paste with optional TTL and view limits.

**Request Body**:
```json
{
  "content": "Hello World!",
  "ttl_seconds": 3600,
  "max_views": 10
}
```

**Fields**:
- `content` (required): Non-empty string
- `ttl_seconds` (optional): Integer >= 1 (seconds until expiration)
- `max_views` (optional): Integer >= 1 (maximum number of views)

**Response (201)**:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "url": "http://localhost:3000/p/507f1f77bcf86cd799439011"
}
```

**Response (400)** - Validation error:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "content",
      "message": "content is required"
    }
  ]
}
```

---

### Fetch Paste (API)

**GET** `/api/pastes/:id`

Retrieve paste content via API. Each successful fetch counts as one view.

**Response (200)**:
```json
{
  "content": "Hello World!",
  "remaining_views": 9,
  "expires_at": "2026-01-01T00:00:00.000Z"
}
```

**Fields**:
- `content`: The paste text
- `remaining_views`: Remaining views (null if unlimited)
- `expires_at`: Expiration timestamp (null if no TTL)

**Response (404)** - Paste not found, expired, or view limit exceeded:
```json
{
  "error": "Paste not found or unavailable"
}
```

---

### View Paste (HTML)

**GET** `/p/:id`

View paste in browser as HTML. Content is properly escaped to prevent XSS.

**Response (200)**: HTML page with paste content

**Response (404)**: HTML error page

---

## 🧪 Deterministic Testing

For automated testing, PasteLite supports deterministic time handling.

### Enable Test Mode

Set environment variable:
```env
TEST_MODE=1
```

### Override Current Time

Send requests with custom timestamp header:
```bash
curl -H "x-test-now-ms: 1704067200000" http://localhost:3000/api/pastes/...
```

The application will use this timestamp for all time-based logic (expiration checks, TTL calculations).

### Example: Test TTL Expiration

```bash
# Create paste with 60-second TTL
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Test","ttl_seconds":60}'

# Response: {"id":"507f...","url":"..."}

# Fetch immediately (works)
curl http://localhost:3000/api/pastes/507f...
# Response: 200 OK

# Fetch with future time (+61 seconds)
curl -H "x-test-now-ms: 1704067261000" http://localhost:3000/api/pastes/507f...
# Response: 404 (paste expired)
```

---

## 🔒 Security Features

### XSS Protection
All paste content displayed in HTML is escaped using HTML entity encoding:
```javascript
const escapeHtml = (text) => text.replace(/[&<>"']/g, m => map[m]);
```

Even if a paste contains `<script>alert('XSS')</script>`, it will be rendered as text, not executed.

### Atomic View Counting
View counting uses MongoDB's `$inc` operator to prevent race conditions:
```javascript
await Paste.findByIdAndUpdate(id, { $inc: { viewsUsed: 1 } });
```

This ensures that:
- No two requests can read/write the same count simultaneously
- View limits are never exceeded
- No negative remaining views

### Input Validation
All inputs are validated using `express-validator`:
- Required fields are enforced
- Type checking (string, integer)
- Range validation (min values)
- Sanitization (trim, whitespace)

### Security Headers
Helmet middleware adds security headers:
- XSS protection
- Content type sniffing prevention
- Frame options
- Strict transport security (in production)

---



## 🧰 Project Structure

```
PasteLite/
├── src/
│   ├── models/
│   │   └── Paste.js           # Mongoose schema
│   ├── routes/
│   │   ├── healthz.js         # Health check endpoint
│   │   ├── pastes.js          # Paste CRUD API
│   │   └── view.js            # HTML view route
│   ├── utils/
│   │   ├── time.js            # Deterministic time helper
│   │   └── validation.js      # Input validation
│   └── server.js              # Express app
├── api/
│   └── index.js               # Vercel entry point
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── vercel.json                # Vercel config
└── README.md
```

---

## 🧩 Architecture Notes

### Time Handling
All time-based logic uses the centralized `getCurrentTime(req)` utility:
- Checks `TEST_MODE` environment variable
- Reads `x-test-now-ms` header in test mode
- Falls back to `Date.now()` otherwise
- Ensures consistent behavior across the application

### View Counting Flow
1. Check if paste exists
2. Check if expired (using deterministic time)
3. Check if view limit reached (compare `viewsUsed` >= `maxViews`)
4. **If all checks pass**: Atomically increment `viewsUsed`
5. Fetch updated document
6. Calculate `remaining_views`
7. Return paste content

This ensures no paste is served beyond its constraints.

### Error Handling
- **400**: Validation errors (malformed input)
- **404**: Paste not found, expired, or view limit exceeded
- **500**: Unexpected server errors
- **503**: Service unavailable (MongoDB disconnected)

All error responses are JSON (except HTML view route).

---

## 📝 Example Usage

### Create a simple paste
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"console.log(\"Hello World\")"}'
```

### Create paste with 1-hour expiration
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Secret message","ttl_seconds":3600}'
```

### Create paste with 5 views max
```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Limited access","max_views":5}'
```

### Fetch paste (API)
```bash
curl http://localhost:3000/api/pastes/507f1f77bcf86cd799439011
```

### View in browser
```
http://localhost:3000/p/507f1f77bcf86cd799439011
```

---

