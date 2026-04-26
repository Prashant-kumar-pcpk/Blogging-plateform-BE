const express = require("express");

const { tagController } = require("../controllers/taxonomyController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", tagController.list);
router.post("/", protect, tagController.create);
router.put("/:id", protect, tagController.update);
router.delete("/:id", protect, tagController.remove);

module.exports = router;
