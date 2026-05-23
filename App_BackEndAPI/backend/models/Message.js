import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image', 'video', 'audio', 'file', 'system'], default: 'text' },
  content: { type: String, maxlength: 4000 },
  fileKey: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  fileType: { type: String },
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deliveredAtByUser: { type: Map, of: Date, default: {} },
  seenAtByUser: { type: Map, of: Date, default: {} },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  replySnapshot: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderUsername: { type: String },
    senderFirstName: { type: String },
    senderLastName: { type: String },
    senderProfilePicture: { type: String },
    senderProfilePictureThumb: { type: String },
    type: { type: String },
    content: { type: String },
    fileName: { type: String },
    createdAt: { type: Date },
  },
  metadata: {
    links: [{
      url: { type: String },
      host: { type: String },
      type: { type: String, default: 'link' },
    }],
  },
  systemEvent: {
    type: { type: String },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  private: { type: Boolean, default: false },
  expiresAt: { type: Date },
  editedAt: { type: Date },
  deletedAt: { type: Date },
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ chat: 1, replyTo: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
messageSchema.index({ content: 'text' });

export default mongoose.model('Message', messageSchema);
