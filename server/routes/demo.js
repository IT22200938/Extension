const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const demoFeedStore = require('../utils/demoFeedStore');

/**
 * GET /api/demo/feed
 * Returns ML motor-score response and final impairment profile for the current user.
 * Requires: Authorization: Bearer <token> or ?token=<token>
 */
router.get('/feed', (req, res) => {
  let userId = req.query.user_id;
  if (!userId) {
    let token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }
  }
  res.json(demoFeedStore.getFeed(userId || null));
});

module.exports = router;
