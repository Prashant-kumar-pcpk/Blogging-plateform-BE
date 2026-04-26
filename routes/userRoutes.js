const express = require("express");

const { updateProfile, getAuthorPage } = require("../controllers/userController");
const { protect, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.put("/profile", protect, updateProfile);
router.get("/author/:username", optionalAuth, getAuthorPage);

module.exports = router;
