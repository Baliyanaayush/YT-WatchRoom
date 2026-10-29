const { randomUUID } = require("node:crypto");
const {rooms,getParticipants,broadcastParticipants} = require("../utils/roomStore")
const { ROLES, ASSIGNABLE_ROLES } = require("../utils/permission");

function createRoom(io, socket, data = {}, callback) {
  let roomId;

  do {roomId = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()} 
  
  while (rooms.has(roomId));
  const room = {hostId: socket.id,participants: new Map(),videoId: null,playback: null,}

  const host = {id: socket.id,username: data.username?.trim() || "Host",role: ROLES.HOST,}

  room.participants.set(socket.id, host)
  rooms.set(roomId, room)

  socket.join(roomId)

     callback?.({success: true,roomId,role: host.role,participants: getParticipants(room),})
        broadcastParticipants(io, roomId)

                console.log("Room created:", roomId)
}

function joinRoom(io, socket, data = {}, callback) {
     const normalizedRoomId = data.roomId?.trim().toUpperCase()
        const username = data.username?.trim() || "Guest"

  if (!normalizedRoomId) {callback?.({success: false,message: "Please provide a room code.",})
        return
  }

  const room = rooms.get(normalizedRoomId)

  if (!room) {
    callback?.({
    success: false,
      message: "Room not found. Ask the host to create it first.",
    })  
    return
  }

  let participant = room.participants.get(socket.id)

  if (!participant) {participant = {  id: socket.id,  username,  role: ROLES.PARTICIPANT,}

    room.participants.set(socket.id, participant)
  }

  socket.join(normalizedRoomId)

  // Work out where the host video is right now, for late joiners
  let playback = null;

  if (room.playback) {
    const elapsed = room.playback.playing? (Date.now() - room.playback.updatedAt) / 1000: 0
    playback = {
      action: room.playback.playing ? "play" : "pause",
         currentTime: room.playback.currentTime + elapsed,
    }
  }

  callback?.({
        success: true,
            roomId: normalizedRoomId,
        role: participant.role,
                  participants: getParticipants(room),
        videoId: room.videoId || null,
    playback,
  })

    broadcastParticipants(io, normalizedRoomId)

            console.log(`${participant.username} joined ${normalizedRoomId}`)
}



function kickParticipant(io, socket, data = {}, callback) {
  const { roomId, targetId } = data;
      const room = rooms.get(roomId);

  if (!room || room.hostId !== socket.id) {
    callback?.({ success: false, message: "Only the host can remove guests." })
    return
  }

  if (!targetId || targetId === socket.id) {
        callback?.({ success: false, message: "You can't remove yourself." })
    return
  }

  if (!room.participants.has(targetId)) {
        callback?.({ success: false, message: "Participant not found." })
    return
  }

  room.participants.delete(targetId);

  const targetSocket = io.sockets.sockets.get(targetId);
  if (targetSocket) {
    targetSocket.emit("kicked", {
      roomId,
      message: "The host removed you from the room.",
    });
    targetSocket.leave(roomId);
  }

    broadcastParticipants(io, roomId);
  callback?.({ success: true });
}

function transferHost(io, socket, data = {}, callback) {
  const { roomId, targetId } = data;
  const room = rooms.get(roomId);

  if (!room || room.hostId !== socket.id) {callback?.({success: false,message: "Only the host can transfer hosting.", });
    return
  }

    const newHost = room.participants.get(targetId)
     const oldHost = room.participants.get(socket.id)

  if (!newHost || targetId === socket.id) {
      callback?.({ success: false, message: "Choose another participant." })
    return;
  }

  room.hostId = targetId
    newHost.role = ROLES.HOST
  if (oldHost) oldHost.role = ROLES.PARTICIPANT

      broadcastParticipants(io, roomId)
    callback?.({ success: true });
}

function assignRole(io, socket, data = {}, callback) {
  const { roomId, targetId, role } = data
     const room = rooms.get(roomId)

  if (!room || room.hostId !== socket.id) {
        callback?.({ success: false, message: "Only the host can assign roles." })
      return
  }

  if (!ASSIGNABLE_ROLES.includes(role)) {
     callback?.({ success: false, message: "That role can't be assigned." })
    return;
  }

  if (!targetId || targetId === socket.id) {
              callback?.({ success: false, message: "You can't change your own role." });
    return;
  }

  const target = room.participants.get(targetId);

  if (!target) {
         callback?.({ success: false, message: "Participant not found." });
    return;
  }
target.role = role;

  io.to(roomId).emit("role-assigned", {
      userId: targetId,
          username: target.username,
        role,
              participants: getParticipants(room),
  });

  broadcastParticipants(io, roomId);
      callback?.({ success: true });
}

module.exports = {createRoom,joinRoom,removeParticipant,kickParticipant,transferHost,assignRole,};

function removeParticipant(io, socket, roomId) {
  const room = rooms.get(roomId)

  if (!room) return

    const participant = room.participants.get(socket.id)

    if (!participant) return

    room.participants.delete(socket.id)

  if (room.hostId === socket.id) {
    // prefer a moderator as the next host otherwise the longest-waiting guest
    const candidates = Array.from(room.participants.values())
        const nextHost =
           candidates.find((p) => p.role === ROLES.MODERATOR) || candidates[0]

    if (nextHost) {
        room.hostId = nextHost.id
            nextHost.role = ROLES.HOST
    }
  }

  if (room.participants.size === 0) {
    rooms.delete(roomId)
        console.log("Room deleted:", roomId)
    return
  }

      broadcastParticipants(io, roomId)

         console.log(`${participant.username} left ${roomId}`)
}