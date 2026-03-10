const express = require('express');
const router = express.Router();
const demoFeedStore = require('../utils/demoFeedStore');

/**
 * GET /api/demo/feed
 * Returns recent ML motor-score responses and aggregated batch receipts for the real-time demo dashboard.
 * No auth required (demo visibility). Protect in production if needed.
 */
router.get('/feed', (req, res) => {
  res.json(demoFeedStore.getFeed());
});

module.exports = router;
