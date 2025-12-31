/**
 * Health Check Endpoint
 * Verifies MongoDB connectivity
 */

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * GET /api/healthz
 * Returns health status and MongoDB connectivity
 */
router.get('/', (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;

    if (isConnected) {
        return res.status(200).json({ ok: true });
    } else {
        return res.status(503).json({ ok: false });
    }
});

module.exports = router;
