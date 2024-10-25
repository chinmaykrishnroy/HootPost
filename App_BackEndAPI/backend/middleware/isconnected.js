import User from '../models/User.js';

export const isConnected = async (req, res, next) => {
    const targetUser = await User.findOne({ username: req.params.username });

    if (!targetUser) return res.status(404).send('User not found');
    
    if (req.currentUser._id.equals(targetUser._id)) {
        return res.status(200).send("It's you");
    }
    if (!req.currentUser.connections.includes(targetUser._id)) {
        return res.status(403).send('You are not connected with this user');
    }

    req.targetUser = targetUser;
    next();
};
