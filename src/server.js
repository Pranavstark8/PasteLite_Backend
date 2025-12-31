/**
 * Express Application Setup
 * Main server file with MongoDB connection and route configuration
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');

// Import routes
const healthzRouter = require('./routes/healthz');
const pastesRouter = require('./routes/pastes');
const viewRouter = require('./routes/view');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline styles in HTML view
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            console.error('ERROR: MONGODB_URI environment variable is not set');
            process.exit(1);
        }

        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });

        console.log('✓ MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        // In production, you might want to retry or handle this differently
        // For now, we'll continue running but the health check will fail
    }
};

// Connect to MongoDB
connectDB();

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});

// Mount routes
app.use('/api/healthz', healthzRouter);
app.use('/api/pastes', pastesRouter);
app.use('/p', viewRouter);

// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'PasteLite API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/healthz',
            createPaste: 'POST /api/pastes',
            fetchPaste: 'GET /api/pastes/:id',
            viewPaste: 'GET /p/:id'
        }
    });
});

// 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(500).json({ error: message });
});

// Start server (only if not in serverless environment)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✓ Server running on port ${PORT}`);
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`✓ Test mode: ${process.env.TEST_MODE === '1' ? 'enabled' : 'disabled'}`);
    });
}

// Export for Vercel serverless
module.exports = app;
