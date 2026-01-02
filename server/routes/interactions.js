const express = require('express');
const router = express.Router();
const Interaction = require('../models/Interaction');
const Stats = require('../models/Stats');
const authMiddleware = require('../middleware/auth');

// Save interactions (batch)
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const { interactions } = req.body;
    
    if (!Array.isArray(interactions) || interactions.length === 0) {
      return res.status(400).json({ error: 'Invalid interactions data' });
    }
    
    // Add userId to each interaction
    const interactionsWithUser = interactions.map(interaction => ({
      ...interaction,
      userId: req.userId
    }));
    
    // Insert interactions
    const saved = await Interaction.insertMany(interactionsWithUser);
    
    // Update stats
    const stats = await Stats.findOne({ userId: req.userId });
    if (stats) {
      stats.totalInteractions += interactions.length;
      
      // Update individual counters
      interactions.forEach(interaction => {
        switch (interaction.type) {
          case 'click':
            stats.clicks++;
            break;
          case 'double_click':
            stats.doubleClicks++;
            break;
          case 'right_click':
            stats.rightClicks++;
            break;
          case 'keypress':
            stats.keystrokes++;
            break;
          case 'mouse_move':
          case 'scroll':
            stats.mouseMovements++;
            break;
          case 'mouse_enter':
          case 'mouse_leave':
            stats.mouseHovers++;
            break;
          case 'page_view':
            stats.pageViews++;
            break;
          case 'drag_start':
          case 'drag_end':
          case 'drop':
            stats.dragAndDrop++;
            break;
          case 'touch_start':
          case 'touch_move':
          case 'touch_end':
          case 'swipe':
          case 'pinch':
            stats.touchEvents++;
            break;
          case 'browser_zoom':
          case 'wheel_zoom':
          case 'keyboard_zoom':
          case 'visual_viewport_zoom':
            stats.zoomEvents++;
            break;
        }
      });
      
      stats.lastUpdated = new Date();
      await stats.save();
    }
    
    res.json({
      message: 'Interactions saved successfully',
      count: saved.length
    });
    
  } catch (error) {
    console.error('Save interactions error:', error);
    res.status(500).json({ error: 'Failed to save interactions' });
  }
});

// Get user's interactions (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const interactions = await Interaction.find({ userId: req.userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);
    
    const total = await Interaction.countDocuments({ userId: req.userId });
    
    res.json({
      interactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get interactions error:', error);
    res.status(500).json({ error: 'Failed to get interactions' });
  }
});

// Get recent interactions
router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const interactions = await Interaction.find({ userId: req.userId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json({ interactions });
    
  } catch (error) {
    console.error('Get recent interactions error:', error);
    res.status(500).json({ error: 'Failed to get recent interactions' });
  }
});

// Clear all user interactions
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    await Interaction.deleteMany({ userId: req.userId });
    
    // Reset stats
    const stats = await Stats.findOne({ userId: req.userId });
    if (stats) {
      stats.totalInteractions = 0;
      stats.clicks = 0;
      stats.doubleClicks = 0;
      stats.rightClicks = 0;
      stats.keystrokes = 0;
      stats.mouseMovements = 0;
      stats.mouseHovers = 0;
      stats.pageViews = 0;
      stats.dragAndDrop = 0;
      stats.touchEvents = 0;
      stats.zoomEvents = 0;
      stats.lastUpdated = new Date();
      await stats.save();
    }
    
    res.json({ message: 'All interactions cleared successfully' });
    
  } catch (error) {
    console.error('Clear interactions error:', error);
    res.status(500).json({ error: 'Failed to clear interactions' });
  }
});

module.exports = router;

