const userService = require("../services/userService");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers(req.user._id);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const users = await userService.searchUsers(req.query.q || "", req.user._id);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, searchUsers };
