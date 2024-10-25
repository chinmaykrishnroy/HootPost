import mongoose from 'mongoose';

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String }, // Text content of the message
  file: { type: Buffer }, // For media files (images, etc.)
  fileType: { type: String }, // File type for media (e.g., image/png, video/mp4)
  seen: { type: Boolean, default: false }, // If reciever seen the message
  private: { type: Boolean, default: false }, // indicates if chat should auto-delete
  createdAt: { type: Date, default: Date.now },
  expires: { type: Date }
});

export default messageSchema;