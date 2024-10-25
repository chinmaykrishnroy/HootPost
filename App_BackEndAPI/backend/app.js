import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import postRoutes from './routes/post.js';
import config from './config/config.js';
import './utility/deletemsgs.js';
import { initializeS3 } from './utility/s3client.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Attach io to request object to use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB connection and S3 initialization
mongoose.connect(config.mongoURI)
  .then(() => {
    console.log('MongoDB connected');
    return initializeS3();
  })
  .catch(err => console.error(err));

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO
io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close();
    process.exit(0);
  });
});

const PORT = config.PORT || 5000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
