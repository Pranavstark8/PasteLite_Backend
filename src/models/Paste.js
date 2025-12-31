/**
 * Paste Model - MongoDB schema for paste documents
 */

const mongoose = require('mongoose');

const pasteSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    expiresAt: {
        type: Date,
        default: null
    },
    maxViews: {
        type: Number,
        default: null
    },
    viewsUsed: {
        type: Number,
        default: 0,
        required: true
    }
});

// Index for efficient lookups and automatic cleanup
pasteSchema.index({ _id: 1 });
// Note: MongoDB TTL index on expiresAt would auto-delete expired docs,
// but we handle expiration manually for deterministic testing
pasteSchema.index({ expiresAt: 1 });

const Paste = mongoose.model('Paste', pasteSchema);

module.exports = Paste;
