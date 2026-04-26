const express = require("express");

const {
  toggleSubscription,
  getMySubscriptions,
} = require("../controllers/subscriptionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getMySubscriptions);
router.post("/toggle", protect, toggleSubscription);

module.exports = router;
