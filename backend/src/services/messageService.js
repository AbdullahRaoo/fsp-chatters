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

const getRoomMessages = async (roomId) => {
  return RoomMessage.find({ room: roomId })
    .sort({ createdAt: 1 })
    .populate("sender", "name email");
};

module.exports = { getPrivateConversation, getRoomMessages };
