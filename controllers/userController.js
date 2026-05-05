const User = require("../models/User");
const Post = require("../models/Post");
const Subscription = require("../models/Subscription");

const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  Object.assign(user, {
    name: req.body.name ?? user.name,
    bio: req.body.bio ?? user.bio,
    avatar: req.body.avatar ?? user.avatar,
    socialLinks: {
      ...user.socialLinks,
      ...(req.body.socialLinks || {}),
    },
  });

  await user.save();

  res.json({
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    socialLinks: user.socialLinks,
    subscribersCount: user.subscribersCount,
  });
};

const getAuthorPage = async (req, res) => {
  const author = await User.findOne({ username: req.params.username }).select("-password");

  if (!author) {
    res.status(404);
    throw new Error("Author not found");
  }

  const posts = await Post.find({
    author: author._id,
    status: "published",
  })
    .populate("categories", "name slug color")
    .populate("tags", "name slug")
    .sort({ publishedAt: -1 });

  const totals = posts.reduce(
    (acc, post) => {
      acc.views += post.analytics.views;
      acc.likes += post.analytics.likes;
      acc.comments += post.analytics.commentsCount;
      acc.shares += Object.values(post.analytics.shares.toObject()).reduce((sum, value) => sum + value, 0);
      return acc;
    },
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );

  let subscribed = false;
  if (req.user) {
    subscribed = Boolean(
      await Subscription.findOne({
        subscriber: req.user._id,
        targetType: "author",
        author: author._id,
      })
    );
  }

  res.json({
    author,
    posts,
    subscribed,
    totals,
  });
};

module.exports = {
  updateProfile,
  getAuthorPage,
};
