const RoomMessage = require("../models/RoomMessage");
const Room = require("../models/Room");

const isMember = (room, userId) =>
  room.members.some((m) => m.toString() === userId.toString());

const registerRoomEvents = (io, socket) => {
  socket.on("join_room", async ({ roomId }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;
      if (!isMember(room, socket.userId)) {
        socket.emit("error", { message: "You are not a member of this room" });
        return;
      }
      socket.join(roomId);
    } catch {
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("leave_room", ({ roomId }) => {
    socket.leave(roomId);
  });

  socket.on("room_message", async ({ roomId, content }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }
      if (!isMember(room, socket.userId)) {
        socket.emit("error", {
          message: "You must be a member to send messages in this room",
        });
        return;
      }

      const message = await RoomMessage.create({
        sender: socket.userId,
        room: roomId,
        content,
      });

      io.to(roomId).emit("room_message", message);
    } catch {
      socket.emit("error", { message: "Failed to send room message" });
    }
  });
};

module.exports = { registerRoomEvents };
