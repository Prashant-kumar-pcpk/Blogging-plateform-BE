const Category = require("../models/Category");
const Subscription = require("../models/Subscription");
const User = require("../models/User");

const toggleSubscription = async (req, res) => {
  const { targetType, authorId, categoryId } = req.body;

  if (!["author", "category"].includes(targetType)) {
    res.status(400);
    throw new Error("Invalid subscription type");
  }

  const query = {
    subscriber: req.user._id,
    targetType,
  };

  if (targetType === "author") {
    query.author = authorId;
  }

  if (targetType === "category") {
    query.category = categoryId;
  }

  let subscription = await Subscription.findOne(query);

  if (subscription) {
    await subscription.deleteOne();
    if (targetType === "author" && authorId) {
      await User.findByIdAndUpdate(authorId, { $inc: { subscribersCount: -1 } });
    }
    if (targetType === "category" && categoryId) {
      await Category.findByIdAndUpdate(categoryId, { $inc: { followersCount: -1 } });
    }
    return res.json({ subscribed: false });
  }

  subscription = await Subscription.create(query);
  if (targetType === "author" && authorId) {
    await User.findByIdAndUpdate(authorId, { $inc: { subscribersCount: 1 } });
  }
  if (targetType === "category" && categoryId) {
    await Category.findByIdAndUpdate(categoryId, { $inc: { followersCount: 1 } });
  }

  res.status(201).json({ subscribed: true, subscription });
};

const getMySubscriptions = async (req, res) => {
  const subscriptions = await Subscription.find({ subscriber: req.user._id })
    .populate("author", "name username avatar")
    .populate("category", "name slug color");

  res.json(subscriptions);
};

module.exports = {
  toggleSubscription,
  getMySubscriptions,
};
