import logger from "../utils/logger.js";

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const payload = {
    error: err.message || "Internal server error",
  };

  if (err.details) payload.details = err.details;

  if (statusCode >= 500) {
    logger.error(err);
  }

  res.status(statusCode).json(payload);
};
