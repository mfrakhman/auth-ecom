# auth-service

Handles user registration, login, and JWT token lifecycle. All other services trust the JWT issued here using the shared `JWT_SECRET`.

**Tech:** NestJS · TypeScript · PostgreSQL · TypeORM · Passport JWT · bcrypt

**Internal port:** `3001`

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login — returns access + refresh token |
| POST | `/auth/refresh` | Public | Issue new tokens using refresh token |
| GET | `/auth/me` | JWT | Get current authenticated user |

> All endpoints are exposed via the API gateway at `/api/auth/*`

---

## Token Strategy

- **Access token** — JWT, signed with `JWT_SECRET`, expires in `JWT_EXPIRES_IN` (default: 1h)
- **Refresh token** — JWT, signed with `JWT_REFRESH_SECRET`, expires in `JWT_REFRESH_EXPIRES_IN` (default: 7d)
- Downstream services validate access tokens independently using the shared `JWT_SECRET` — no round-trip to auth-service on every request

---

## System Flow

### POST /auth/register

```
Client
  │
  ▼
[ auth-service ]
  │
  ├── Validate request (email, password, name)
  ├── Check email uniqueness in PostgreSQL
  ├── Hash password with bcrypt
  ├── Insert user record
  └── Return created user (without password)
```

### POST /auth/login

```
Client
  │
  ▼
[ auth-service ]
  │
  ├── Find user by email in PostgreSQL
  ├── Compare password hash with bcrypt
  ├── Sign access token  (JWT, 1h)
  ├── Sign refresh token (JWT, 7d)
  └── Return { accessToken, refreshToken, user }
```

### POST /auth/refresh

```
Client
  │
  ▼
[ auth-service ]
  │
  ├── Verify refresh token signature and expiry
  ├── Load user from PostgreSQL
  ├── Sign new access token
  ├── Sign new refresh token
  └── Return { accessToken, refreshToken }
```

---

## Project Structure

```
auth-service/
└── src/
    ├── auth/
    │   ├── auth.controller.ts       # Login, register, refresh, me
    │   ├── auth.service.ts          # Business logic
    │   ├── dtos/                    # LoginDto, RegisterDto
    │   ├── guards/jwt-auth.guard.ts # Protect routes with JWT
    │   ├── strategies/jwt.strategy  # Passport JWT strategy
    │   ├── roles.decorator.ts       # @Roles() decorator
    │   └── roles.guard.ts           # Role-based access guard
    └── users/
        ├── entities/users.entity.ts # User entity (email, name, role, password)
        └── users.repository.ts      # TypeORM queries
```

---

## Environment Variables

```env
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=microserv_db

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Running Locally

```bash
npm install
npm run start:dev
```

Service runs on `http://localhost:3001`.

## Example Requests

### Register
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "name": "John Doe"}'
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Refresh Token
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh_token>"}'
```

## Docker

```bash
docker build -t auth-service .
docker run --env-file .env -p 3001:3001 auth-service
```

## Part of

[E-Commerce Microservices Platform](../README.md)
