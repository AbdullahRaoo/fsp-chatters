const express = require("express");
const { getPrivateConversation, getRoomMessages } = require("../controllers/messageController");
const protect = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/private/:userId", getPrivateConversation);
router.get("/room/:roomId", getRoomMessages);

module.exports = router;
