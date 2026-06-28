const RoomMessage = require("../models/RoomMessage");

const registerRoomEvents = (io, socket) => {
  socket.on("join_room", ({ roomId }) => {
    socket.join(roomId);
  });

  socket.on("leave_room", ({ roomId }) => {
    socket.leave(roomId);
  });

  socket.on("room_message", async ({ roomId, content }) => {
    try {
      const message = await RoomMessage.create({
        sender: socket.userId,
        room: roomId,
        content,
      });

      io.to(roomId).emit("room_message", message);
    } catch (err) {
      socket.emit("error", { message: "Failed to send room message" });
    }
  });
};

module.exports = { registerRoomEvents };
