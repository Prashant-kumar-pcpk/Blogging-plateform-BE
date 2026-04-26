const express = require("express");

const {
  createComment,
  updateComment,
  deleteComment,
  moderateComment,
  getModerationQueue,
} = require("../controllers/commentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/moderation/queue", protect, getModerationQueue);
router.post("/", protect, createComment);
router.put("/:id", protect, updateComment);
router.delete("/:id", protect, deleteComment);
router.put("/:id/moderate", protect, moderateComment);

module.exports = router;
