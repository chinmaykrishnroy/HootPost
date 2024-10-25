import express from 'express';
import { auth } from '../middleware/auth.js';
import { getCurrentUser } from '../middleware/getcurrentuser.js';
import upload from '../middleware/upload.js';
import {
  getPagedPosts,
  getPostImage
} from '../controllers/frontend.js';

const router = express.Router({ mergeParams: true });

router.get('/all', [auth, getCurrentUser], getPagedPosts);
router.get('/image', [auth, getCurrentUser], getPostImage);

export default router;
