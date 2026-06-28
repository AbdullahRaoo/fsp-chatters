const roomService = require("../services/roomService");

const createRoom = async (req, res, next) => {
  try {
    const room = await roomService.createRoom({ name: req.body.name, userId: req.user._id });
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
};

const joinRoom = async (req, res, next) => {
  try {
    const room = await roomService.joinRoom({ roomId: req.params.roomId, userId: req.user._id });
    res.status(200).json(room);
  } catch (error) {
    next(error);
  }
};

const leaveRoom = async (req, res, next) => {
  try {
    const room = await roomService.leaveRoom({ roomId: req.params.roomId, userId: req.user._id });
    res.status(200).json(room);
  } catch (error) {
    next(error);
  }
};

const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.getAllRooms();
    res.status(200).json(rooms);
  } catch (error) {
    next(error);
  }
};

module.exports = { createRoom, joinRoom, leaveRoom, getAllRooms };
