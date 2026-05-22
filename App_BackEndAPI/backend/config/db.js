import mongoose from "mongoose";
import config from "./config.js";
import logger from "../utils/logger.js";

export const connectDB = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoURI, {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 10_000,
  });
  logger.info("MongoDB connected");
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info("MongoDB disconnected");
};
