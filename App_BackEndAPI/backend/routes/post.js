import express from 'express';
import { auth } from '../middleware/auth.js';
import { getCurrentUser } from '../middleware/getcurrentuser.js';
import upload from '../middleware/upload.js';
import {
  getAllPosts,
  getUserPosts,
  createPost,
  deletePost,
  updatePost,
  likePost,
  unlikePost,
  getAllPostsHTML,
  getAllPosts2,
  downloadPost
} from '../controllers/post.js';

const router = express.Router({ mergeParams: true });

router.get('/all', [auth, getCurrentUser], getAllPosts);
router.get('/', [auth, getCurrentUser], getUserPosts);
router.post('/create', [auth, getCurrentUser, upload.single('image')], createPost);
router.delete('/delete/:postId', [auth, getCurrentUser], deletePost);
router.put('/edit/:postId', [auth, getCurrentUser], updatePost);
router.post('/:postId/like', [auth, getCurrentUser], likePost);
router.post('/:postId/unlike', [auth, getCurrentUser], unlikePost);
router.get('/html', [auth, getCurrentUser], getAllPostsHTML);
router.get('/alll', [auth, getCurrentUser], getAllPosts2);
router.get('/:postId/download', [auth, getCurrentUser], downloadPost);

export default router;
