const express = require("express");

const { categoryController } = require("../controllers/taxonomyController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", categoryController.list);
router.post("/", protect, categoryController.create);
router.put("/:id", protect, categoryController.update);
router.delete("/:id", protect, categoryController.remove);

module.exports = router;
