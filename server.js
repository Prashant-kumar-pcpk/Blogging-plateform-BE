const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const tagRoutes = require("./routes/tagRoutes");
const commentRoutes = require("./routes/commentRoutes");
const userRoutes = require("./routes/userRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    message: "Blogging Platform API is running",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 6060;
const normalizedPort = Number.parseInt(String(PORT).replace(/[^0-9]/g, ""), 10) || 6060;

app.listen(normalizedPort, () => {
  console.log(`Server is running on http://localhost:${normalizedPort}`);
});
