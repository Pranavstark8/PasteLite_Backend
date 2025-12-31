/**
 * Paste API Routes
 * Create and fetch pastes
 */

const express = require('express');
const Paste = require('../models/Paste');
const { validateCreatePaste } = require('../utils/validation');
const { getCurrentTime } = require('../utils/time');

const router = express.Router();

/**
 * POST /api/pastes
 * Create a new paste
 */
router.post('/', validateCreatePaste, async (req, res) => {
    try {
        const { content, ttl_seconds, max_views } = req.body;
        const currentTime = getCurrentTime(req);

        // Calculate expiration time if TTL is provided
        let expiresAt = null;
        if (ttl_seconds) {
            expiresAt = new Date(currentTime + (ttl_seconds * 1000));
        }

        // Create paste document
        const paste = new Paste({
            content,
            expiresAt,
            maxViews: max_views || null,
            viewsUsed: 0,
            createdAt: new Date(currentTime)
        });

        await paste.save();

        // Generate paste URL
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const pasteUrl = `${baseUrl}/p/${paste._id}`;

        return res.status(201).json({
            id: paste._id.toString(),
            url: pasteUrl
        });

    } catch (error) {
        console.error('Error creating paste:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/pastes/:id
 * Fetch a paste by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const currentTime = getCurrentTime(req);

        // Validate MongoDB ObjectId format
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(404).json({ error: 'Paste not found or unavailable' });
        }

        // Find the paste
        const paste = await Paste.findById(id);

        // Check if paste exists
        if (!paste) {
            return res.status(404).json({ error: 'Paste not found or unavailable' });
        }

        // Check if paste has expired
        if (paste.expiresAt && new Date(paste.expiresAt).getTime() <= currentTime) {
            return res.status(404).json({ error: 'Paste not found or unavailable' });
        }

        // Check if view limit has been reached (before incrementing)
        if (paste.maxViews !== null && paste.viewsUsed >= paste.maxViews) {
            return res.status(404).json({ error: 'Paste not found or unavailable' });
        }

        // Atomically increment view count
        // Use findByIdAndUpdate with $inc for atomic operation
        await Paste.findByIdAndUpdate(
            id,
            { $inc: { viewsUsed: 1 } },
            { new: false } // Return old document (not needed, but explicit)
        );

        // Fetch the updated paste to get current viewsUsed
        const updatedPaste = await Paste.findById(id);

        // Calculate remaining views
        let remainingViews = null;
        if (updatedPaste.maxViews !== null) {
            remainingViews = updatedPaste.maxViews - updatedPaste.viewsUsed;
            // Ensure it doesn't go negative
            if (remainingViews < 0) remainingViews = 0;
        }

        // Format response
        return res.status(200).json({
            content: updatedPaste.content,
            remaining_views: remainingViews,
            expires_at: updatedPaste.expiresAt ? updatedPaste.expiresAt.toISOString() : null
        });

    } catch (error) {
        console.error('Error fetching paste:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
