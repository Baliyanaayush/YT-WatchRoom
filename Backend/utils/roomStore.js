const rooms = new Map()

function getParticipants(room) {
  return Array.from(room.participants.values())
}

function broadcastParticipants(io, roomId) {
     const room = rooms.get(roomId)

  if (room) {
        io.to(roomId).emit("room-users", getParticipants(room))
  }
}

module.exports = { rooms, getParticipants, broadcastParticipants }