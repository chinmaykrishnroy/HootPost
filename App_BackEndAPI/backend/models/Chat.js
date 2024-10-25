import mongoose from 'mongoose';
import messageSchema from './Message.js';

// Chat Schema
const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [messageSchema],
  chatDeleteAt: { type: Date }
}, { timestamps: true });

// Create the Chat model from the chatSchema
export default mongoose.model('Chat', chatSchema);