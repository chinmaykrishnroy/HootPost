import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String },
  imageKey: { type: String },
  media: [{
    key: { type: String, required: true },
    type: { type: String, enum: ['image'], default: 'image' },
    width: { type: Number },
    height: { type: Number },
    aspectRatio: { type: Number },
    frameMode: { type: String, enum: ['original', 'square', '3:4', '4:5', '4:3', '5:4'], default: 'original' },
    crop: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      scale: { type: Number, default: 1 },
    },
    order: { type: Number, default: 0 },
  }],
  caption: { type: String, maxlength: 150 },
  archived: { type: Boolean, default: false, index: true },
  likeCount: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sizeMode: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

export default mongoose.model('Post', postSchema);
