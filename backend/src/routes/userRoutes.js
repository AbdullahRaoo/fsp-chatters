const express = require("express");
const { getAllUsers, searchUsers } = require("../controllers/userController");
const protect = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getAllUsers);
router.get("/search", searchUsers);

module.exports = router;
