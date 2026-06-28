const User = require("../models/User");

const getAllUsers = async (currentUserId) => {
  return User.find({ _id: { $ne: currentUserId } }).select("-password");
};

const searchUsers = async (query, currentUserId) => {
  const regex = new RegExp(query, "i");
  return User.find({
    _id: { $ne: currentUserId },
    $or: [{ name: regex }, { email: regex }],
  }).select("-password");
};

module.exports = { getAllUsers, searchUsers };
