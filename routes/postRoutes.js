const express = require("express");

const {
  listPosts,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  sharePost,
  getPostViewers,
  getMyPosts,
  getDashboardAnalytics,
} = require("../controllers/postController");
const { protect, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", listPosts);
router.get("/mine", protect, getMyPosts);
router.get("/analytics/dashboard", protect, getDashboardAnalytics);
router.get("/:id/viewers", protect, getPostViewers);
router.get("/:slug", optionalAuth, getPostBySlug);
router.post("/", protect, createPost);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);
router.post("/:id/like", protect, toggleLikePost);
router.post("/:id/share", sharePost);

module.exports = router;
