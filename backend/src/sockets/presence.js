const onlineUsers = new Map();

const userConnected = (io, socket) => {
  onlineUsers.set(socket.userId, socket.id);
  console.log(`Socket connected: user ${socket.userId}, online count: ${onlineUsers.size}`);
  io.emit("online_users", Array.from(onlineUsers.keys()));
};

const userDisconnected = (io, socket) => {
  onlineUsers.delete(socket.userId);
  console.log(`Socket disconnected: user ${socket.userId}, online count: ${onlineUsers.size}`);
  io.emit("online_users", Array.from(onlineUsers.keys()));
};

const getSocketId = (userId) => onlineUsers.get(userId.toString());

module.exports = { userConnected, userDisconnected, getSocketId };
