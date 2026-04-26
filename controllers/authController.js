const crypto = require("crypto");

const User = require("../models/User");
const Post = require("../models/Post");
const Subscription = require("../models/Subscription");
const generateToken = require("../utils/generateToken");

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();
const normalizeUsername = (username = "") => String(username).trim().toLowerCase();
const normalizeName = (name = "") => String(name).trim();

const validatePassword = (password) => {
  if (String(password || "").length < 10) {
    return "Password must be at least 10 characters long";
  }

  return "";
};

const buildAuthPayload = async (user) => {
  const postsCount = await Post.countDocuments({ author: user._id });
  const subscriptionsCount = await Subscription.countDocuments({ subscriber: user._id });

  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    socialLinks: user.socialLinks,
    subscribersCount: user.subscribersCount,
    postsCount,
    subscriptionsCount,
  };
};

const registerUser = async (req, res) => {
  const name = normalizeName(req.body.name);
  const username = normalizeUsername(req.body.username);
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!name || !username || !email || !password) {
    res.status(400);
    throw new Error("All registration fields are required");
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400);
    throw new Error(passwordError);
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    res.status(400);
    throw new Error("Email or username already exists");
  }

  const user = await User.create({
    name,
    username,
    email,
    password,
  });

  res.status(201).json({
    token: generateToken(user._id),
    user: await buildAuthPayload(user),
  });
};

const loginUser = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password || ""))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    token: generateToken(user._id),
    user: await buildAuthPayload(user),
  });
};

const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(await buildAuthPayload(user));
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!(await user.matchPassword(currentPassword || ""))) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }

  if (currentPassword === newPassword) {
    res.status(400);
    throw new Error("New password must be different from the current password");
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    res.status(400);
    throw new Error(passwordError);
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  res.json({
    message: "Password updated successfully",
    token: generateToken(user._id),
    user: await buildAuthPayload(user),
  });
};

const requestPasswordReset = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ message: "If the account exists, a reset token has been generated" });
  }

  const resetToken = crypto.randomBytes(24).toString("hex");
  user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.resetPasswordExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
  await user.save();

  res.json({
    message: "Password reset token generated",
    resetToken,
    expiresAt: user.resetPasswordExpiresAt,
  });
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token || "").digest("hex");

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    res.status(400);
    throw new Error(passwordError);
  }

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Reset token is invalid or expired");
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  res.json({
    message: "Password reset successfully",
    token: generateToken(user._id),
    user: await buildAuthPayload(user),
  });
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
