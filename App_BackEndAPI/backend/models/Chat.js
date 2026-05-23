import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  participantKey: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date },
  unreadCounts: { type: Map, of: Number, default: {} },
  mutedUntil: { type: Map, of: Date, default: {} },
  deletedAtByUser: { type: Map, of: Date, default: {} },
  settings: {
    selfDestruct: {
      enabled: { type: Boolean, default: false },
      durationSeconds: { type: Number, default: null },
      startedAt: { type: Date, default: null },
    },
  },
}, { timestamps: true });

chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });

export default mongoose.model('Chat', chatSchema);
