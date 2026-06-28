const Room = require("../models/Room");

const createRoom = async ({ name, userId }) => {
  const room = await Room.create({
    name,
    createdBy: userId,
    members: [userId],
  });
  return room.populate("createdBy members", "-password");
};

const joinRoom = async ({ roomId, userId }) => {
  const room = await Room.findById(roomId);
  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  const alreadyMember = room.members.some((m) => m.toString() === userId.toString());
  if (alreadyMember) {
    const error = new Error("Already a member of this room");
    error.statusCode = 409;
    throw error;
  }

  room.members.push(userId);
  await room.save();
  return room.populate("createdBy members", "-password");
};

const leaveRoom = async ({ roomId, userId }) => {
  const room = await Room.findById(roomId);
  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  const isMember = room.members.some((m) => m.toString() === userId.toString());
  if (!isMember) {
    const error = new Error("You are not a member of this room");
    error.statusCode = 409;
    throw error;
  }

  room.members = room.members.filter((m) => m.toString() !== userId.toString());
  await room.save();
  return room.populate("createdBy members", "-password");
};

const getAllRooms = async () => {
  return Room.find().populate("createdBy members", "-password");
};

module.exports = { createRoom, joinRoom, leaveRoom, getAllRooms };
