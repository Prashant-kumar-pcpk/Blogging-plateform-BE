const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["author", "category"],
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  },
  { timestamps: true }
);

subscriptionSchema.index(
  { subscriber: 1, targetType: 1, author: 1, category: 1 },
  { unique: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
