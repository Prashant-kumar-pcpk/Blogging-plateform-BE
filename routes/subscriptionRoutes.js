const express = require("express");

const {
  toggleSubscription,
  getMySubscriptions,
  getSubscriptionFeed,
} = require("../controllers/subscriptionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getMySubscriptions);
router.get("/feed", protect, getSubscriptionFeed);
router.post("/toggle", protect, toggleSubscription);

module.exports = router;
