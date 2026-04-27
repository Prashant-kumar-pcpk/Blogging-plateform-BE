const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Subscription = require("../models/Subscription");
const slugify = require("../utils/slugify");

const COMMENT_AUTHOR_FIELDS = "name username avatar";
const VIEWER_FIELDS = "name username avatar";

const listPosts = async (req, res) => {
  const {
    search,
    status = "published",
    category,
    tag,
    author,
    sort = "latest",
  } = req.query;

  const query = {};

  if (status !== "all") {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { excerpt: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    query.categories = category;
  }

  if (tag) {
    query.tags = tag;
  }

  if (author) {
    query.author = author;
  }

  const sortMap = {
    latest: { publishedAt: -1, createdAt: -1 },
    popular: { "analytics.views": -1, "analytics.likes": -1 },
    discussed: { "analytics.commentsCount": -1, publishedAt: -1 },
  };

  const posts = await Post.find(query)
    .populate("author", "name username avatar bio")
    .populate("categories", "name slug color")
    .populate("tags", "name slug")
    .sort(sortMap[sort] || sortMap.latest);

  res.json(posts);
};

const getPostBySlug = async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug })
    .populate("author", "name username avatar bio socialLinks subscribersCount")
    .populate("categories", "name slug color")
    .populate("tags", "name slug");

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  const canViewDraft =
    post.status === "published" ||
    (req.user && req.user._id.toString() === post.author._id.toString());

  if (!canViewDraft) {
    res.status(403);
    throw new Error("This draft is private");
  }

  if (post.status === "published") {
    post.analytics.views += 1;

    if (req.user) {
      const viewerIndex = post.viewers.findIndex(
        (entry) => entry.user.toString() === req.user._id.toString()
      );

      if (viewerIndex >= 0) {
        post.viewers[viewerIndex].viewedAt = new Date();
      } else {
        post.viewers.push({
          user: req.user._id,
          viewedAt: new Date(),
        });
      }
    }

    await post.save();
  }

  const comments = await Comment.find({
    post: post._id,
    $or: [
      { status: "visible" },
      ...(req.user ? [{ author: req.user._id }, { status: "flagged", post: post._id }] : []),
    ],
    status: { $ne: "deleted" },
  }).populate("author", COMMENT_AUTHOR_FIELDS);

  const filteredComments = comments.filter((comment) => {
    if (comment.status === "visible") {
      return true;
    }

    if (!req.user) {
      return false;
    }

    const isCommentAuthor = comment.author?._id?.toString() === req.user._id.toString();
    const isPostOwner = post.author._id.toString() === req.user._id.toString();

    return isCommentAuthor || isPostOwner;
  });

  let subscribed = false;

  if (req.user) {
    const subscription = await Subscription.findOne({
      subscriber: req.user._id,
      targetType: "author",
      author: post.author._id,
    });
    subscribed = Boolean(subscription);
  }

  res.json({ ...post.toObject(), comments: filteredComments, subscribed });
};

const createPost = async (req, res) => {
  const { title, excerpt, coverImage, content, status, categories, tags } = req.body;

  if (!title || !content) {
    res.status(400);
    throw new Error("Title and content are required");
  }

  const baseSlug = slugify(title);
  const slugCandidate = `${baseSlug || "post"}-${Date.now().toString().slice(-6)}`;

  const post = await Post.create({
    title,
    slug: slugCandidate,
    excerpt,
    coverImage,
    content,
    status: status || "draft",
    publishedAt: status === "published" ? new Date() : null,
    author: req.user._id,
    categories: categories || [],
    tags: tags || [],
  });

  const populatedPost = await Post.findById(post._id)
    .populate("author", "name username avatar")
    .populate("categories", "name slug color")
    .populate("tags", "name slug");

  res.status(201).json(populatedPost);
};

const updatePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (post.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not allowed to edit this post");
  }

  const wasDraft = post.status === "draft";
  const nextTitle = req.body.title ?? post.title;
  const titleChanged = nextTitle !== post.title;

  Object.assign(post, {
    title: nextTitle,
    excerpt: req.body.excerpt ?? post.excerpt,
    coverImage: req.body.coverImage ?? post.coverImage,
    content: req.body.content ?? post.content,
    status: req.body.status ?? post.status,
    categories: req.body.categories ?? post.categories,
    tags: req.body.tags ?? post.tags,
  });

  if (wasDraft && post.status === "published") {
    post.publishedAt = new Date();
  }

  if (titleChanged) {
    post.slug = `${slugify(nextTitle)}-${post._id.toString().slice(-6)}`;
  }

  await post.save();

  const updated = await Post.findById(post._id)
    .populate("author", "name username avatar")
    .populate("categories", "name slug color")
    .populate("tags", "name slug");

  res.json(updated);
};

const deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (post.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not allowed to delete this post");
  }

  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();

  res.json({ message: "Post deleted successfully" });
};

const toggleLikePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  const likedIndex = post.likedBy.findIndex(
    (userId) => userId.toString() === req.user._id.toString()
  );

  if (likedIndex >= 0) {
    post.likedBy.splice(likedIndex, 1);
  } else {
    post.likedBy.push(req.user._id);
  }

  post.analytics.likes = post.likedBy.length;
  await post.save();

  res.json({ likes: post.analytics.likes, liked: likedIndex === -1 });
};

const sharePost = async (req, res) => {
  const { platform } = req.body;
  const allowedPlatforms = ["facebook", "twitter", "linkedin", "whatsapp", "mail"];

  if (!allowedPlatforms.includes(platform)) {
    res.status(400);
    throw new Error("Unsupported sharing platform");
  }

  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  post.analytics.shares[platform] += 1;
  await post.save();

  res.json(post.analytics.shares);
};

const getPostViewers = async (req, res) => {
  const post = await Post.findById(req.params.id).populate("viewers.user", VIEWER_FIELDS);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (post.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the post author can see viewers");
  }

  const viewers = [...post.viewers]
    .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
    .map((entry) => ({
      _id: entry.user?._id,
      name: entry.user?.name || "Unknown user",
      username: entry.user?.username || "",
      avatar: entry.user?.avatar || "",
      viewedAt: entry.viewedAt,
    }));

  res.json(viewers);
};

const getMyPosts = async (req, res) => {
  const posts = await Post.find({ author: req.user._id })
    .populate("categories", "name slug color")
    .populate("tags", "name slug")
    .sort({ updatedAt: -1 });

  res.json(posts);
};

const getDashboardAnalytics = async (req, res) => {
  const posts = await Post.find({ author: req.user._id, status: "published" })
    .populate("categories", "name");

  const totals = posts.reduce(
    (acc, post) => {
      acc.views += post.analytics.views;
      acc.likes += post.analytics.likes;
      acc.comments += post.analytics.commentsCount;
      acc.shares += Object.values(post.analytics.shares.toObject()).reduce(
        (sum, value) => sum + value,
        0
      );
      return acc;
    },
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );

  const performance = posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    views: post.analytics.views,
    likes: post.analytics.likes,
    comments: post.analytics.commentsCount,
    shares: Object.values(post.analytics.shares.toObject()).reduce((sum, value) => sum + value, 0),
  }));

  res.json({
    totals,
    performance,
    postsPublished: posts.length,
  });
};

module.exports = {
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
};
