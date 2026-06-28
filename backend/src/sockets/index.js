const socketAuth = require("./socketAuth");
const { userConnected, userDisconnected } = require("./presence");
const { registerPrivateMessageEvents } = require("./privateMessageHandler");
const { registerRoomEvents } = require("./roomHandler");

const initSocket = (io) => {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    userConnected(io, socket);

    registerPrivateMessageEvents(io, socket);
    registerRoomEvents(io, socket);

    socket.on("disconnect", () => {
      userDisconnected(io, socket);
    });
  });
};

module.exports = initSocket;
