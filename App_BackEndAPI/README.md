# HootPost Backend

## Local Stack

The backend now expects local infrastructure from the repository root:

```bash
docker compose up --build
```

Services:

- API: `http://localhost:5000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`

The Compose file uses `.env.example` defaults for local development. For real deployments, create a private `.env` and point `S3_*` variables at Cloudflare R2 or another S3-compatible provider.

## Auth Model

Authentication is now multi-session:

- Login creates an opaque session token.
- The token is returned as JSON and also set in the `session_id` HTTP-only cookie.
- API clients can authenticate with either the cookie or `Authorization: Bearer <token>`.
- Users can list sessions and revoke a selected device/session.

Key endpoints:

- `POST /api/auth/login`
- `GET /api/auth/current`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:sessionId`
- `DELETE /api/auth/sessions`
- `DELETE /api/auth/sessions-all`
- `POST /api/auth/logout`

## Realtime

Socket.IO runs on namespace `/realtime`. Connect with either:

- cookie `session_id`
- `auth: { token }`

Rooms are created for:

- `user:<userId>`
- `session:<sessionId>`
- `chat:<chatId>` after `chat:join`

## Postman

Import:

```text
../postman/HootPost Backend.postman_collection.json
```

Run `Auth + Sessions > Login` first. It stores `sessionToken` and `currentSessionId` automatically.
