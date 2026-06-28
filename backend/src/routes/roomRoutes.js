const express = require("express");
const { createRoom, joinRoom, leaveRoom, getAllRooms } = require("../controllers/roomController");
const protect = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getAllRooms);
router.post("/", createRoom);
router.post("/:roomId/join", joinRoom);
router.post("/:roomId/leave", leaveRoom);

module.exports = router;
