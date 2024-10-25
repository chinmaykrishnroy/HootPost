import mongoose from 'mongoose';

// Users Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String },
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
  currentSessionId: { type: String },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
