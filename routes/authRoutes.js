const express = require("express");

const {
  registerUser,
  loginUser,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getCurrentUser);
router.put("/change-password", protect, changePassword);

module.exports = router;
