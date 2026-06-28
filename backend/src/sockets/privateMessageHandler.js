const PrivateMessage = require("../models/PrivateMessage");
const { getSocketId } = require("./presence");

const registerPrivateMessageEvents = (io, socket) => {
  socket.on("private_message", async ({ receiverId, content }) => {
    try {
      const message = await PrivateMessage.create({
        sender: socket.userId,
        receiver: receiverId,
        content,
        deliveryStatus: "sent",
      });

      const receiverSocketId = getSocketId(receiverId);

      if (receiverSocketId) {
        message.deliveryStatus = "delivered";
        await message.save();
        io.to(receiverSocketId).emit("private_message", message);
      }

      socket.emit("private_message", message);
    } catch (err) {
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = getSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: socket.userId });
    }
  });

  socket.on("stop_typing", ({ receiverId }) => {
    const receiverSocketId = getSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stop_typing", { senderId: socket.userId });
    }
  });
};

module.exports = { registerPrivateMessageEvents };
