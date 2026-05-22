import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: ["connection_request", "connection_accepted", "session_revoked", "system"],
    required: true,
  },
  entityType: { type: String },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  message: { type: String, maxlength: 500 },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });
notificationSchema.index({ recipient: 1, actor: 1, type: 1, entityId: 1 });

export default mongoose.model("Notification", notificationSchema);
