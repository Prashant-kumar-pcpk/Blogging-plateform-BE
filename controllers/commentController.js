const Comment = require("../models/Comment");
const Post = require("../models/Post");
const evaluateSpam = require("../utils/spamFilter");

const COMMENT_AUTHOR_FIELDS = "name username avatar";

const normalizeContent = (content = "") => content.trim();

const canManageComment = (comment, userId) => comment.author.toString() === userId.toString();

const createComment = async (req, res) => {
  const { postId } = req.body;
  const content = normalizeContent(req.body.content);
  const post = await Post.findById(postId);

  if (!post) {
    res.status(404);
    throw new Error("Post not found");
  }

  if (!content) {
    res.status(400);
    throw new Error("Comment content is required");
  }

  const moderation = evaluateSpam(content);

  const comment = await Comment.create({
    post: postId,
    author: req.user._id,
    content,
    status: moderation.isSpam ? "flagged" : "visible",
    moderationReason: moderation.isSpam ? "Auto-flagged by spam filter" : "",
  });

  if (!moderation.isSpam) {
    post.analytics.commentsCount += 1;
    await post.save();
  }

  const populated = await Comment.findById(comment._id).populate("author", COMMENT_AUTHOR_FIELDS);
  res.status(201).json(populated);
};

const updateComment = async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }

  if (!canManageComment(comment, req.user._id)) {
    res.status(403);
    throw new Error("Not allowed to edit this comment");
  }

  if (comment.status === "deleted") {
    res.status(400);
    throw new Error("Deleted comments cannot be edited");
  }

  const nextContent = req.body.content === undefined ? comment.content : normalizeContent(req.body.content);

  if (!nextContent) {
    res.status(400);
    throw new Error("Comment content is required");
  }

  const previousStatus = comment.status;
  comment.content = nextContent;
  const moderation = evaluateSpam(comment.content);
  comment.status = moderation.isSpam ? "flagged" : "visible";
  comment.moderationReason = moderation.isSpam ? "Auto-flagged after edit" : "";

  await comment.save();

  const post = await Post.findById(comment.post);
  if (post) {
    if (previousStatus === "visible" && comment.status !== "visible") {
      post.analytics.commentsCount = Math.max(0, post.analytics.commentsCount - 1);
      await post.save();
    } else if (previousStatus !== "visible" && comment.status === "visible") {
      post.analytics.commentsCount += 1;
      await post.save();
    }
  }

  const populated = await Comment.findById(comment._id).populate("author", COMMENT_AUTHOR_FIELDS);
  res.json(populated);
};

const deleteComment = async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }

  const post = await Post.findById(comment.post);
  const isAuthor = canManageComment(comment, req.user._id);
  const isPostOwner = post && post.author.toString() === req.user._id.toString();

  if (!isAuthor && !isPostOwner) {
    res.status(403);
    throw new Error("Not allowed to delete this comment");
  }

  if (comment.status === "deleted") {
    return res.json({ message: "Comment already deleted" });
  }

  if (comment.status === "visible" && post) {
    post.analytics.commentsCount = Math.max(0, post.analytics.commentsCount - 1);
    await post.save();
  }

  comment.status = "deleted";
  comment.moderationReason = isPostOwner && !isAuthor ? "Removed by post author" : "Removed by comment author";
  await comment.save();

  res.json({ message: "Comment deleted" });
};

const moderateComment = async (req, res) => {
  const comment = await Comment.findById(req.params.id).populate("post");

  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }

  if (comment.post.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the post author can moderate comments");
  }

  const { status, moderationReason } = req.body;
  const allowedStatuses = ["visible", "flagged", "deleted"];

  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid moderation status");
  }

  const previousStatus = comment.status;
  comment.status = status;
  comment.moderationReason = moderationReason || "";
  await comment.save();

  const post = await Post.findById(comment.post._id);
  if (previousStatus !== "visible" && status === "visible") {
    post.analytics.commentsCount += 1;
    await post.save();
  } else if (previousStatus === "visible" && status !== "visible") {
    post.analytics.commentsCount = Math.max(0, post.analytics.commentsCount - 1);
    await post.save();
  }

  res.json(comment);
};

const getModerationQueue = async (req, res) => {
  const authoredPosts = await Post.find({ author: req.user._id }).select("_id title slug");
  const postIds = authoredPosts.map((post) => post._id);

  if (!postIds.length) {
    return res.json([]);
  }

  const comments = await Comment.find({
    post: { $in: postIds },
    status: { $in: ["flagged", "visible"] },
  })
    .populate("author", COMMENT_AUTHOR_FIELDS)
    .populate("post", "title slug")
    .sort({ updatedAt: -1, createdAt: -1 });

  res.json(comments);
};

module.exports = {
  createComment,
  updateComment,
  deleteComment,
  moderateComment,
  getModerationQueue,
};
