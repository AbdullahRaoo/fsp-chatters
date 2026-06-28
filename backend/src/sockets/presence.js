const onlineUsers = new Map();

const userConnected = (io, socket) => {
  onlineUsers.set(socket.userId, socket.id);
  io.emit("online_users", Array.from(onlineUsers.keys()));
};

const userDisconnected = (io, socket) => {
  onlineUsers.delete(socket.userId);
  io.emit("online_users", Array.from(onlineUsers.keys()));
};

const getSocketId = (userId) => onlineUsers.get(userId.toString());

module.exports = { userConnected, userDisconnected, getSocketId };
