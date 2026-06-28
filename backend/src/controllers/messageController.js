const messageService = require("../services/messageService");

const getPrivateConversation = async (req, res, next) => {
  try {
    const messages = await messageService.getPrivateConversation(
      req.user._id,
      req.params.userId
    );
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

const getRoomMessages = async (req, res, next) => {
  try {
    const messages = await messageService.getRoomMessages(req.params.roomId);
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPrivateConversation, getRoomMessages };
