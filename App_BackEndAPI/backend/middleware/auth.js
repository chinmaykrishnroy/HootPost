import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
    const token = req.cookies['session_id'];
    if (!token) return res.status(401).send('Access Denied');
    try {
        const verified = jwt.verify(token, config.jwtSecret);
        req.currentUser = verified;
        const user = await User.findOne({ _id: verified._id, currentSessionId: token });
        if (!user) {
            return res.status(401).send('Session invalid or expired.');
        }
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(400).send('Invalid Token');
    }
};
