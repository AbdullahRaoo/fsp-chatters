const PrivateMessage = require("../models/PrivateMessage");
const RoomMessage = require("../models/RoomMessage");

const getPrivateConversation = async (currentUserId, otherUserId) => {
  return PrivateMessage.find({
    $or: [
      { sender: currentUserId, receiver: otherUserId },
      { sender: otherUserId, receiver: currentUserId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("sender", "name email");
};

const getRoomMessages = async (roomId, requestingUserId) => {
  const Room = require("../models/Room");
  const room = await Room.findById(roomId);
  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }
  const member = room.members.some(
    (m) => m.toString() === requestingUserId.toString()
  );
  if (!member) {
    const error = new Error("You must be a member to view this room's messages");
    error.statusCode = 403;
    throw error;
  }
  return RoomMessage.find({ room: roomId })
    .sort({ createdAt: 1 })
    .populate("sender", "name email");
};

module.exports = { getPrivateConversation, getRoomMessages };
