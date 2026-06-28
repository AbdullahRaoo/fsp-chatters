# FSP Chatters

A full-stack real-time chat application supporting one-to-one private messaging and multi-user group rooms. Built with Next.js, Node/Express, MongoDB, and Socket.io — featuring JWT authentication, live presence, typing indicators, delivery status, dark mode, and unread message counters.

---

## Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| Next.js (App Router) | 16.2.9 | Framework, routing, SSR |
| React | 19 | UI rendering |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling (class-based dark mode) |
| Zustand | 5 | Client state management |
| socket.io-client | 4.8 | Real-time WebSocket client |
| axios | 1.18 | HTTP client with auth interceptor |

### Backend
| Technology | Version | Role |
|---|---|---|
| Node.js | — | Runtime |
| Express | 5 | HTTP server and routing |
| MongoDB + Mongoose | 9.7 | Database and ODM |
| Socket.io | 4.8 | Real-time WebSocket server |
| jsonwebtoken | 9 | JWT signing and verification |
| bcryptjs | 3 | Password hashing |
| express-validator | 7 | Request body validation |

---

## Features

- **Authentication** — Register and login with email/password. Passwords are hashed with bcrypt (12 rounds). A JWT (1-day expiry) is issued on success and required for all protected routes.
- **Private messaging** — Real-time one-to-one chat with full message history loaded from MongoDB on open.
- **Group rooms** — Create named rooms, browse all rooms, join or leave rooms. Room membership is enforced on both the REST API (history) and the socket layer (broadcast).
- **Live presence** — Online/offline status tracked via an in-memory server-side Map and broadcast to all connected clients on connect/disconnect.
- **Typing indicators** — Debounced client-side emit; server relays to the conversation partner. Auto-clears after 1.5 seconds of inactivity.
- **Message delivery status** — Private messages carry a `deliveryStatus` field (`sent` → `delivered`). The server upgrades status to `delivered` immediately if the recipient is online when the message arrives.
- **Optimistic sending** — Messages appear instantly with a temporary ID and are replaced in-place when the server echo arrives (FIFO queue per conversation).
- **Room access control** — Non-members see a gate screen with a Join button. Socket `join_room` and `room_message` events reject non-members at the server before touching the database.
- **Dark mode** — Class-based (`dark` on `<html>`), toggled with a sun/moon button in the sidebar. Choice persists to `localStorage` and is applied via an inline script before first paint to eliminate flash.
- **Unread message counters** — Badge on each user in the sidebar showing how many unread private messages have arrived while their conversation is not open. Cleared automatically when the conversation is opened.

---

## Project Setup

### Prerequisites

- Node.js 18 or later
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or any accessible MongoDB instance)

### 1 — Clone the repository

```bash
git clone <repo-url>
cd fsp-chatters
```

### 2 — Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` (see [Environment Variables](#environment-variables) below), then:

```bash
# Development — auto-restarts on file changes (requires nodemon)
npm run dev

# Production
npm start
```

The server listens on `http://localhost:5000` by default.

### 3 — Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (see [Environment Variables](#environment-variables) below), then:

```bash
npm run dev
```

The app is available at `http://localhost:3000`.

---

## Environment Variables

### Backend — `backend/.env`

```env
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>"
PORT=5000
JWT_SECRET="replace-with-a-long-random-secret"
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | Full MongoDB connection string. Obtain from Atlas → Connect → Drivers. |
| `PORT` | Port the Express server listens on. Defaults to `5000` if omitted. |
| `JWT_SECRET` | Secret used to sign and verify JWTs. Use a long, random string in production. |

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL injected into the axios instance. All REST calls are relative to this. |
| `NEXT_PUBLIC_SOCKET_URL` | URL that socket.io-client connects to. Must point to the same origin as the backend server. |

---

## Architecture Overview

### Authentication Flow

1. **Register** — `POST /api/auth/register` validates the request body with express-validator, checks for a duplicate email, then creates a `User` document. The Mongoose model has an async `pre('save')` hook that bcrypt-hashes the password before the document is written; the plain-text password is never stored.
2. **Login** — `POST /api/auth/login` fetches the user with `select('+password')` (the field is excluded by default in the schema), calls the `comparePassword` instance method, then signs a JWT containing `{ userId }` with a 1-day expiry.
3. **REST protection** — The `protect` middleware (`middleware/auth.js`) reads the `Authorization: Bearer <token>` header, verifies the token, looks up the user (no password selected), and attaches it to `req.user`. Every route group except `/api/auth` applies this middleware via `router.use(protect)`.
4. **Socket protection** — `sockets/socketAuth.js` is registered as a Socket.io middleware (runs before any event handler). It reads `socket.handshake.auth.token` and verifies it with the same `JWT_SECRET`, then attaches `socket.userId`. Connections with a missing or invalid token are rejected immediately with an error event.
5. **Client storage** — The JWT is stored in `localStorage` under `fsp_token`. An axios request interceptor attaches it as a Bearer token to every outgoing API call. Because `localStorage` is inaccessible server-side, route protection is done client-side via `useEffect` + `useRouter` in the chat layout, guarded by an `isInitialized` flag to prevent redirect flicker before the store is hydrated.

### Socket Architecture

A single authenticated WebSocket connection is created per browser session, managed by the `useSocket` hook and persisted in Zustand. The hook is called from a permanent `SocketInitializer` component in the chat layout; a guard (`useSocketStore.getState().socket`) prevents duplicate connections when other page components also call the hook for access to action helpers.

Server-side event handlers are split by domain:

| File | Responsibility |
|---|---|
| `sockets/socketAuth.js` | JWT middleware — runs before any event handler, attaches `socket.userId` |
| `sockets/presence.js` | In-memory `Map<userId, socketId>`; broadcasts the full `online_users` array on every connect/disconnect |
| `sockets/privateMessageHandler.js` | `private_message`, `typing`, `stop_typing` — saves messages, upgrades delivery status if receiver is online, emits to receiver and echoes to sender |
| `sockets/roomHandler.js` | `join_room`, `leave_room`, `room_message` — verifies DB membership before `socket.join()` or saving a message; broadcasts via `io.to(roomId).emit()` |

Room broadcasts use Socket.io's built-in room channels. Only clients that have successfully passed the `join_room` membership check are subscribed to the channel; non-members cannot receive or inject messages even if they construct the event manually.

### Database Design

**`User`** — `name`, `email` (unique index), `password` (`select: false` — excluded from all queries by default), timestamps.

**`PrivateMessage`** — `sender` (ref: User), `receiver` (ref: User), `content`, `deliveryStatus` (enum: `sent` | `delivered`, default `sent`), timestamps. History queries use a bidirectional `$or` filter on sender/receiver pairs, sorted ascending by `createdAt`, with sender populated.

**`RoomMessage`** — `sender` (ref: User), `room` (ref: Room), `content`, timestamps. Kept as a separate collection from `PrivateMessage` because the two types have structurally different fields (no delivery status in rooms; room messages display a sender name above the bubble) and different query patterns (filter by room vs. filter by sender/receiver pair).

**`Room`** — `name`, `members` (array of User refs), `createdBy` (ref: User), timestamps. Membership is an embedded ObjectId array. All write operations (`join`, `leave`) and access-control checks (socket events, message history) read directly from this array.

### State Management

The frontend uses four [Zustand](https://github.com/pmndrs/zustand) stores:

| Store | Held state |
|---|---|
| `authStore` | `user`, `token`, `isInitialized`; reads/writes `localStorage` on init and login/logout |
| `socketStore` | `socket` instance, `onlineUsers`, `typingUsers`, `unreadCounts` |
| `roomsStore` | Shared rooms list consumed by both the Sidebar and the room chat page; keeps member counts in sync after a join without a full refetch |
| `themeStore` | `theme` (`light` \| `dark`); applies/removes the `dark` class on `document.documentElement` and persists to `localStorage` |

**Why Zustand over Redux or Context?**

- **Versus Redux** — no action/reducer/selector boilerplate. Socket event callbacks run outside React and need to update state (e.g., incrementing `unreadCounts`). Zustand's `getState()` and `setState()` work directly outside components; Redux requires passing the store reference around or using middleware.
- **Versus Context** — Context re-renders every consumer whenever any part of the value changes. Zustand uses selector-based subscriptions, so a component that reads only `unreadCounts` does not re-render when `onlineUsers` changes.
- **Tradeoff** — Zustand stores are module-level singletons not tied to the React component tree. They are not automatically reset between test runs or on hot reload. This is rarely a problem in production but requires explicit reset logic in testing environments.

### Folder Structure

```
fsp-chatters/
├── backend/
│   └── src/
│       ├── config/           # MongoDB connection helper (connectDB)
│       ├── controllers/      # HTTP layer — parse req, delegate to service, send res
│       │   ├── authController.js
│       │   ├── userController.js
│       │   ├── roomController.js
│       │   └── messageController.js
│       ├── middleware/        # Cross-cutting concerns
│       │   ├── auth.js        # JWT protect middleware
│       │   ├── errorHandler.js # Centralized 4-param error handler
│       │   └── validate.js    # express-validator result handler
│       ├── models/            # Mongoose schemas
│       │   ├── User.js
│       │   ├── Room.js
│       │   ├── PrivateMessage.js
│       │   └── RoomMessage.js
│       ├── routes/            # Express routers — apply middleware, map to controllers
│       │   ├── authRoutes.js
│       │   ├── userRoutes.js
│       │   ├── roomRoutes.js
│       │   └── messageRoutes.js
│       ├── services/          # Business logic and DB queries
│       │   ├── authService.js
│       │   ├── userService.js
│       │   ├── roomService.js
│       │   └── messageService.js
│       ├── sockets/           # Socket.io layer
│       │   ├── index.js       # Wires auth middleware and all event handlers
│       │   ├── socketAuth.js  # JWT socket middleware
│       │   ├── presence.js    # Online users tracking and broadcast
│       │   ├── privateMessageHandler.js
│       │   └── roomHandler.js
│       ├── validators/        # express-validator rule chains
│       └── index.js           # Entry point: HTTP server, Socket.io, DB connect
│
└── frontend/
    └── src/
        ├── app/               # Next.js App Router
        │   ├── chat/
        │   │   ├── [userId]/      # Private chat page
        │   │   ├── room/[roomId]/ # Room chat page
        │   │   ├── layout.tsx     # Protected layout with Sidebar and SocketInitializer
        │   │   └── page.tsx       # Empty-state placeholder
        │   ├── login/
        │   ├── register/
        │   ├── layout.tsx         # Root layout with ThemeInitializer and flash-prevention script
        │   └── page.tsx           # Root redirect (→ /chat or → /login)
        ├── components/
        │   ├── Sidebar.tsx        # People/Rooms tabs, search, theme toggle, logout
        │   ├── UserListItem.tsx   # Avatar, presence dot, typing indicator, unread badge
        │   ├── MessageBubble.tsx  # Private chat bubble with delivery status
        │   ├── RoomMessageBubble.tsx # Room chat bubble with sender name
        │   └── ThemeInitializer.tsx  # Client component that syncs Zustand theme store on mount
        ├── hooks/
        │   └── useSocket.ts       # Socket lifecycle, global listeners, action helpers
        ├── services/              # axios wrappers (one file per resource)
        │   ├── api.ts             # axios instance with auth interceptor
        │   ├── authService.ts
        │   ├── userService.ts
        │   ├── roomService.ts
        │   └── messageService.ts
        ├── store/                 # Zustand stores
        │   ├── authStore.ts
        │   ├── socketStore.ts
        │   ├── roomsStore.ts
        │   └── themeStore.ts
        ├── types/
        │   └── index.ts           # Shared TS interfaces: User, Room, PrivateMessage, RoomMessage
        └── utils/
            └── token.ts           # getToken / setToken / removeToken (localStorage)
```

---

## API Reference

All routes except `/api/auth/*` require:
```
Authorization: Bearer <token>
```

### REST Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account. Body: `{ name, email, password }`. Returns `{ user, token }`. |
| `POST` | `/api/auth/login` | — | Sign in. Body: `{ email, password }`. Returns `{ user, token }`. |
| `POST` | `/api/auth/logout` | — | Stateless no-op (token management is client-side). |
| `GET` | `/api/users` | ✓ | All users except the requester. |
| `GET` | `/api/users/search?q=` | ✓ | Case-insensitive regex search on name and email. |
| `GET` | `/api/rooms` | ✓ | All rooms with populated `members` and `createdBy`. |
| `POST` | `/api/rooms` | ✓ | Create a room. Body: `{ name }`. Creator is added as first member. |
| `POST` | `/api/rooms/:roomId/join` | ✓ | Add requester to `members`. Returns updated room. `409` if already a member. |
| `POST` | `/api/rooms/:roomId/leave` | ✓ | Remove requester from `members`. Returns updated room. `409` if not a member. |
| `GET` | `/api/messages/private/:userId` | ✓ | Full conversation history with `:userId`, ascending by `createdAt`. |
| `GET` | `/api/messages/room/:roomId` | ✓ | Room message history, ascending by `createdAt`. `403` if requester is not a member. |

### Socket.io Events

Connections authenticate via `socket.handshake.auth.token`. Invalid or missing tokens are rejected before any event handler runs.

**Client → Server**

| Event | Payload | Description |
|---|---|---|
| `private_message` | `{ receiverId, content }` | Send a private message. Server persists, emits to receiver, echoes to sender. |
| `typing` | `{ receiverId }` | Signal that the sender is typing. |
| `stop_typing` | `{ receiverId }` | Signal that the sender stopped typing. |
| `join_room` | `{ roomId }` | Subscribe socket to a room channel. Server checks DB membership first; emits `error` if not a member. |
| `leave_room` | `{ roomId }` | Unsubscribe socket from a room channel. Does not affect DB membership. |
| `room_message` | `{ roomId, content }` | Send a room message. Server checks DB membership, persists, and broadcasts to channel. |

**Server → Client**

| Event | Payload | Description |
|---|---|---|
| `online_users` | `string[]` | Full list of connected user IDs. Emitted to every client on any connect/disconnect. |
| `private_message` | Message object | Delivered to the receiver and echoed to the sender. `sender` is a raw ObjectId string. |
| `typing` | `{ senderId }` | Relayed to the intended receiver only. |
| `stop_typing` | `{ senderId }` | Relayed to the intended receiver only. |
| `room_message` | Message object | Broadcast to the room channel. `sender` is a raw ObjectId string. |
| `error` | `{ message }` | Emitted to the originating socket on validation failures (non-member, room not found, etc.). |

---

## Real-Time Design

### REST + WebSocket combination

Message history is fetched once over HTTP when a conversation opens (`GET /api/messages/private/:userId` or `GET /api/messages/room/:roomId`). All subsequent messages arrive through the socket and are appended to the local list. This avoids polling and keeps the initial load simple and cacheable.

Socket payloads contain `sender` as a raw ObjectId string (the server does not populate refs inside `emit` calls). HTTP history responses contain fully populated `User` objects. Both chat pages normalize the two shapes with a `normalizeSender()` helper before passing messages to the bubble components.

### Optimistic sending

When a user sends a message, a temporary entry (id prefixed `temp-{timestamp}`) is prepended to the local list immediately — no waiting for a round trip. The server echo arrives via the socket shortly after; a FIFO `pendingQueue` ref (one per open conversation) matches the echo to its temporary placeholder and replaces it in-place. Temporary messages render at reduced opacity with a `○` indicator so the user gets instant feedback throughout.

### Delivery status

When the server handles a `private_message` socket event, it checks the in-memory presence Map for the receiver's socket ID. If found, it sets `deliveryStatus` to `delivered` on the document before saving and before emitting. The sender receives the echo with the final status already set, so a delivered message never briefly shows as sent.
