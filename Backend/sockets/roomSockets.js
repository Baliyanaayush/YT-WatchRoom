const {createRoom,joinRoom,removeParticipant,kickParticipant,transferHost,assignRole,} = require("../controllers/roomController");

const { rooms } = require("../utils/roomStore");
const { canControl, getRole } = require("../utils/permission");

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function registerRoomSocket(io) {
  io.on("connection", (socket) => {
      console.log("Connected:", socket.id);

    socket.on("create-room", (data, callback) => {
         createRoom(io, socket, data, callback);
    });

    socket.on("join-room", (data, callback) => {
      joinRoom(io, socket, data, callback);
    });

    // Host and moderators can change the video
    socket.on("video-change", ({ roomId, videoId } = {}) => {
      const room = rooms.get(roomId);

      if (!room || !canControl(getRole(room, socket.id))) return;
      if (typeof videoId !== "string" || !VIDEO_ID_REGEX.test(videoId)) return;

      room.videoId = videoId;
      room.playback = {
           playing: false,
        currentTime: 0,
           updatedAt: Date.now(),
      };

      io.to(roomId).emit("video-changed", { videoId });
    });

    // Host and moderators can play, pause and seek
    socket.on("playback-sync", ({ roomId, action, currentTime } = {}) => {
      const room = rooms.get(roomId);

      if (!room || !canControl(getRole(room, socket.id))) return;
          if (!["play", "pause", "seek"].includes(action)) return;

      if (
             typeof currentTime !== "number" ||
                      !Number.isFinite(currentTime) ||
           currentTime < 0
      ) {
        return;
      }

      const playing =action === "play"? true: action === "pause"? false: room.playback?.playing ?? false

          room.playback = { playing, currentTime, updatedAt: Date.now() };

      // veryone except the sender
      socket.to(roomId).emit("playback-updated", { action, currentTime });
    });

    // host only actions. The controller functions check hostId themselves
    socket.on("assign-role", (data, callback) => {
          assignRole(io, socket, data, callback)
    });

    socket.on("kick-participant", (data, callback) => {
          kickParticipant(io, socket, data, callback)
    });

    socket.on("transfer-host", (data, callback) => {
          transferHost(io, socket, data, callback)
    });

    socket.on("disconnect", () => {
         for (const roomId of [...rooms.keys()]) {
           removeParticipant(io, socket, roomId);
      }

      console.log("Disconnected:", socket.id);
    })
  })
}

module.exports = registerRoomSocket;