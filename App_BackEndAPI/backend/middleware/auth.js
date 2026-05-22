import { getTokenFromRequest, resolveSession } from '../services/sessionService.js';

export const auth = async (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);
        if (!token) return res.status(401).json({ error: 'Access denied. No active session.' });

        const resolved = await resolveSession(token);
        if (!resolved?.user) return res.status(401).json({ error: 'Session invalid or expired.' });

        req.currentUser = resolved.user;
        req.session = resolved.session;
        req.sessionTokenHash = resolved.tokenHash;
        next();
    } catch (err) {
        next(err);
    }
};
