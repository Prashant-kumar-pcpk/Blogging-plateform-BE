const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  if (err.name === "ValidationError") {
    statusCode = 400;
  }

  if (err.code === 11000) {
    statusCode = 409;
  }

  res.status(statusCode).json({
    message:
      err.code === 11000
        ? "Email or username already exists"
        : err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
