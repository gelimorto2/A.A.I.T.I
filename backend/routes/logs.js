const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Get the latest single log entry
router.get('/latest', (req, res) => {
  try {
    const last = logger.getLastLog();
    res.json({
      ok: true,
      latest: last,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Failed to fetch latest log' });
  }
});

// Get recent log entries (default 10)
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const logs = logger.getRecentLogs(limit);
    res.json({
      ok: true,
      count: logs.length,
      logs,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Failed to fetch recent logs' });
  }
});

module.exports = router;
