# watchRoom
A real-time YouTube watch party. Create a room, share the code or link, and everyone in the room watches the same video in sync. The host (and any moderators) control playback; everyone else just watches.
Live demo: `https://client-sigma-dun-64.vercel.app/`

## Features

- Create a room and get a unique 8-character code, or join one with a code or invite link
- Synchronized play, pause, seek, and video changes for everyone in the room
- Late joiners load the current video and jump to the host's current position
- Role-based access control with three roles: host, moderator, participant
- Host can assign roles, remove participants, and transfer the host role
- Live participant list with each person's role
- Participants who aren't allowed to control playback can't interact with the player

## Tech stack

| Layer | Technology | Purpose |
| Frontend | React 19, Vite 7, React Router, Tailwind CSS | UI, routing, room pages |
| Backend | Node.js, Express | HTTP server, hosts the Socket.IO server |
| Real-time | Socket.IO (WebSocket transport) | Bidirectional communication between server and clients |
| Video | YouTube IFrame Player API | Embedded, scriptable player |

Room state is kept in server memory (see [Known limitations](#known-limitations)).

## How it works

Every client opens one Socket.IO connection to the server. The server keeps a `rooms` map, and each room stores its host, its participants (with roles), the current video ID, and the latest playback state.


 Host / Moderator browser            Server                      Everyone else
 ------------------------            ------                      -------------
 YouTube player changes state
     emit "playback-sync"  ----->  check role (canControl)
                                   update room.playback
                                   broadcast to the room  ----> "playback-updated"
                                                                 player.seekTo + play/pause

1. **Create or join.** `create-room` makes a room and makes the sender the host. `join-room` adds the sender as a participant and replies with the role, participant list, current video, and current playback position.
2. **Control.** When a host or moderator plays, pauses, seeks, or loads a video, their client emits an event. The server checks their role, saves the new state on the room, and broadcasts to the other clients in that room.
3. **Sync.** Receiving clients apply the change to their YouTube player. A `remoteUpdate` flag stops a client from echoing a change it just received back to the server.
4. **Roles.** Role updates are broadcast through `room-users`, so every client's UI updates (controls appear or disappear) without a refresh.

### Why Socket.IO

Socket.IO runs on top of WebSockets and adds rooms, acknowledgement callbacks, and automatic reconnection. Rooms map directly onto watch parties (`io.to(roomId).emit(...)`), and acknowledgements let the client know whether an action such as creating a room succeeded.

## Roles and permissions

| Action | Host | Moderator | Participant |
|---|---|---|---|
| Play, pause, seek | Yes | Yes | No |
| Change video | Yes | Yes | No |
| Assign roles | Yes | No | No |
| Remove participants | Yes | No | No |
| Transfer host | Yes | No | No |

- The room creator is the host automatically. Everyone who joins starts as a participant.
- **Enforcement happens on the server.** Playback events go through a single `canControl(role)` check in `server/utils/permissions.js`, and host-only events check that the sender is the room's host. Hiding buttons in the UI is cosmetic; the server ignores events from users without permission.
- If the host disconnects, the role passes to a moderator if there is one, otherwise to the next participant.

## Socket events

| Event | Direction | Payload | Who can send it |
|---|---|---|---|
| `create-room` | Client to server | `{ username }` | Anyone |
| `join-room` | Client to server | `{ roomId, username }` | Anyone |
| `video-change` | Client to server | `{ roomId, videoId }` | Host, moderator |
| `playback-sync` | Client to server | `{ roomId, action, currentTime }` where action is `play`, `pause`, or `seek` | Host, moderator |
| `assign-role` | Client to server | `{ roomId, targetId, role }` | Host |
| `kick-participant` | Client to server | `{ roomId, targetId }` | Host |
| `transfer-host` | Client to server | `{ roomId, targetId }` | Host |
| `room-users` | Server to clients | Array of participants with roles | n/a |
| `video-changed` | Server to clients | `{ videoId }` | n/a |
| `playback-updated` | Server to clients | `{ action, currentTime }` | n/a |
| `role-assigned` | Server to clients | `{ userId, username, role, participants }` | n/a |
| `kicked` | Server to one client | `{ roomId, message }` | n/a |

Leaving a room is handled by the socket's `disconnect` event.

## Project structure

watchRoom/
├── client/                     React + Vite frontend
│   └── src/
│       ├── socket.js           Socket.IO client instance
│       └── pages/
│           ├── Home.jsx        Create or join a room
│           └── WatchRoom.jsx   Player, controls, participant list
└── server/                     Express + Socket.IO backend
    ├── index.js                Server entry point
    ├── routes/healthRoutes.js
    ├── sockets/roomSocket.js   Registers socket events
    ├── controllers/roomController.js   Room logic
    └── utils/
        ├── roomStore.js        In-memory rooms map and helpers
        └── permissions.js      Roles and canControl()

## Running locally

**Prerequisites:** Node.js 20.19 or newer.

**1. Start the server**


cd server
npm install
node index.js

The server listens on port 5000 and allows requests from `http://localhost:5173`.

**2. Start the client**

```bash
cd client
npm install
npm run dev
```

Open `hhttps://client-sigma-dun-64.vercel.app/`.

**3. Try it with multiple users**

Open the app in a normal window (host) and one or more incognito windows (guests). Create a room as the host, copy the code, and join from the other windows.

## Deployment

> Fill this section in after deploying.

- **Client:** `<platform, e.g. Vercel>`
- **Server:** `<platform, e.g. Render>`
- **Environment variables:**
  - Server: allowed client origin (CORS) and `PORT`
  - Client: the server's public URL

## Design decisions and trade-offs

- **In-memory state.** Rooms live in a `Map` on the server. It is simple and fast, and it is enough for a single server instance. It also means rooms are lost on restart and cannot be shared across multiple servers.
- **Server as the source of truth.** The server stores the current video and playback state, which is how late joiners catch up, and it validates every action before broadcasting.
- **Echo prevention.** Clients ignore state changes that were caused by a remote update, so a pause from the host doesn't bounce back as a second pause.
- **Muted autoplay for viewers.** Browsers block unmuted autoplay without a click, so viewers start muted and get an unmute button.
- **Playback events skip the sender.** The server uses `socket.to(room)` for playback updates so the sender's own player doesn't re-seek itself.

## Known limitations

- Participants cannot yet send a request to the host or moderators asking for a change (an approval flow is planned).
- A user who refreshes gets a new socket ID, so they rejoin as a new participant. If the host refreshes, the host role moves to someone else, and a host who is alone loses the room.
- A removed user can rejoin with the invite link. A real ban needs a stable user ID.
- There is no database, so rooms do not survive a server restart.
- Navigating away from a room without closing the tab does not remove you from the participant list until the socket disconnects.

## Possible next steps

- Request and approval flow for participants
- Stable user IDs with a reconnect grace period for the host
- In-room chat and emoji reactions
- MongoDB for persistent rooms and authentication
- Redis adapter for Socket.IO to scale across multiple server instances