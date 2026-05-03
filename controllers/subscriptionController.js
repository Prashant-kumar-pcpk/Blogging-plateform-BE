const Category = require("../models/Category");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Post = require("../models/Post");

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

const getSubscriptionFeed = async (req, res) => {
  const subscriptions = await Subscription.find({ subscriber: req.user._id }).lean();

  const authorIds = subscriptions
    .filter((subscription) => subscription.targetType === "author" && subscription.author)
    .map((subscription) => subscription.author);
  const categoryIds = subscriptions
    .filter((subscription) => subscription.targetType === "category" && subscription.category)
    .map((subscription) => subscription.category);

  if (!authorIds.length && !categoryIds.length) {
    return res.json([]);
  }

  const notifications = await Post.find({
    status: "published",
    $or: [
      ...(authorIds.length ? [{ author: { $in: authorIds } }] : []),
      ...(categoryIds.length ? [{ categories: { $in: categoryIds } }] : []),
    ],
  })
    .populate("author", "name username avatar")
    .populate("categories", "name slug color")
    .sort({ publishedAt: -1, updatedAt: -1 })
    .limit(12);

  res.json(
    notifications.map((post) => ({
      _id: post._id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      author: post.author,
      categories: post.categories,
      analytics: post.analytics,
      notificationType: authorIds.some((id) => id.toString() === post.author?._id?.toString())
        ? "author"
        : "category",
    }))
  );
};

module.exports = {
  toggleSubscription,
  getMySubscriptions,
  getSubscriptionFeed,
};
