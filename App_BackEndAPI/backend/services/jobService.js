import Message from "../models/Message.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { deleteObjects } from "./storageService.js";

const HOUR_MS = 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * HOUR_MS;

export const runMaintenanceJobs = async () => {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

  const deletedMessages = await Message.find({
    deletedAt: { $lt: cutoff },
    fileKey: { $exists: true, $ne: null },
  }).select("fileKey").lean();

  await Promise.all([
    deleteObjects(deletedMessages.map((message) => message.fileKey)),
    Message.deleteMany({ deletedAt: { $lt: cutoff } }),
    User.updateMany({}, { $pull: { sessions: { revokedAt: { $lt: cutoff } } } }),
  ]);
};

export const startBackgroundJobs = () => {
  const timer = setInterval(() => {
    runMaintenanceJobs().catch((err) => logger.error("Maintenance job failed:", err));
  }, HOUR_MS);
  timer.unref?.();
  logger.info("Background maintenance jobs scheduled");
  return timer;
};
