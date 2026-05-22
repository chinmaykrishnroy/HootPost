import express from 'express';
import { body, param } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { getCurrentUser } from '../middleware/getcurrentuser.js';
import { validateRequest } from '../middleware/validateRequest.js';
import upload from '../middleware/upload.js';
import {
  getAllPosts,
  getUserPosts,
  createPost,
  deletePost,
  updatePost,
  archivePost,
  unarchivePost,
  likePost,
  unlikePost,
  getAllPosts2,
  downloadPost
} from '../controllers/post.js';

const router = express.Router({ mergeParams: true });

router.get('/all', [auth, getCurrentUser], getAllPosts);
router.get('/', [auth, getCurrentUser], getUserPosts);
router.post('/create', [
  auth,
  getCurrentUser,
  upload.array('images', 10),
  body('caption').optional().isLength({ max: 150 }).withMessage('Caption cannot exceed 150 characters'),
  validateRequest,
], createPost);
router.delete('/delete/:postId', [auth, getCurrentUser, param('postId').isMongoId(), validateRequest], deletePost);
router.patch('/archive/:postId', [auth, getCurrentUser, param('postId').isMongoId(), validateRequest], archivePost);
router.patch('/unarchive/:postId', [auth, getCurrentUser, param('postId').isMongoId(), validateRequest], unarchivePost);
router.put('/edit/:postId', [
  auth,
  getCurrentUser,
  param('postId').isMongoId(),
  body('caption').optional().isLength({ max: 150 }).withMessage('Caption cannot exceed 150 characters'),
  validateRequest,
], updatePost);
router.post('/:postId/like', [auth, getCurrentUser, param('postId').isMongoId(), validateRequest], likePost);
router.post('/:postId/unlike', [auth, getCurrentUser, param('postId').isMongoId(), validateRequest], unlikePost);
router.get('/alll', [auth, getCurrentUser], getAllPosts2);
router.get('/:postId/download', [auth, getCurrentUser, param('postId').isMongoId(), validateRequest], downloadPost);

export default router;
