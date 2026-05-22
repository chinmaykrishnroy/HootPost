import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  tokenHash: { type: String, required: true, select: false },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  deviceLabel: { type: String, default: 'Unknown device' },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  profilePicture: { type: String },
  profilePictureThumb: { type: String },
  profilePictureSmall: { type: Buffer },
  firstName: { type: String, required: true },
  lastName: { type: String },
  age: { type: Number, min: 0 },
  sex: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  bio: { type: String, maxlength: 500 },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  connectionRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  chats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  sessions: [sessionSchema],
  roles: [{ type: String, enum: ['user', 'admin'], default: 'user' }],
  lastLoginAt: { type: Date },
}, { timestamps: true });

userSchema.index({ 'sessions.sessionId': 1 });
userSchema.index({ 'sessions.tokenHash': 1 });

export default mongoose.model('User', userSchema);
