/**
 * HTML View Route
 * Displays paste content as HTML with XSS protection
 */

const express = require('express');
const Paste = require('../models/Paste');
const { getCurrentTime } = require('../utils/time');

const router = express.Router();

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * GET /p/:id
 * Display paste as HTML
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const currentTime = getCurrentTime(req);

        // Validate MongoDB ObjectId format
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(404).send(render404Page());
        }

        // Find the paste
        const paste = await Paste.findById(id);

        // Check if paste exists
        if (!paste) {
            return res.status(404).send(render404Page());
        }

        // Check if paste has expired
        if (paste.expiresAt && new Date(paste.expiresAt).getTime() <= currentTime) {
            return res.status(404).send(render404Page());
        }

        // Check if view limit has been reached (before incrementing)
        if (paste.maxViews !== null && paste.viewsUsed >= paste.maxViews) {
            return res.status(404).send(render404Page());
        }

        // Atomically increment view count
        await Paste.findByIdAndUpdate(
            id,
            { $inc: { viewsUsed: 1 } },
            { new: false }
        );

        // Fetch the updated paste to get current viewsUsed
        const updatedPaste = await Paste.findById(id);

        // Calculate remaining views
        let remainingViews = null;
        if (updatedPaste.maxViews !== null) {
            remainingViews = updatedPaste.maxViews - updatedPaste.viewsUsed;
            if (remainingViews < 0) remainingViews = 0;
        }

        // Render HTML page with escaped content
        const html = renderPastePage(updatedPaste, remainingViews);
        return res.status(200).send(html);

    } catch (error) {
        console.error('Error viewing paste:', error);
        return res.status(500).send(render500Page());
    }
});

/**
 * Render paste HTML page
 */
function renderPastePage(paste, remainingViews) {
    const escapedContent = escapeHtml(paste.content);
    const expiresText = paste.expiresAt
        ? new Date(paste.expiresAt).toLocaleString()
        : 'Never';
    const viewsText = remainingViews !== null
        ? `${remainingViews} view(s) remaining`
        : 'Unlimited views';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PasteLite - View Paste</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 900px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 600;
    }
    .metadata {
      background: #f7fafc;
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .metadata-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #4a5568;
    }
    .metadata-item strong {
      color: #2d3748;
    }
    .content-wrapper {
      padding: 24px;
    }
    pre {
      background: #2d3748;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      line-height: 1.6;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .footer {
      background: #f7fafc;
      padding: 16px 24px;
      text-align: center;
      font-size: 13px;
      color: #718096;
      border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 640px) {
      .metadata {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 PasteLite</h1>
    </div>
    <div class="metadata">
      <div class="metadata-item">
        <strong>Expires:</strong> ${expiresText}
      </div>
      <div class="metadata-item">
        <strong>Views:</strong> ${viewsText}
      </div>
    </div>
    <div class="content-wrapper">
      <pre>${escapedContent}</pre>
    </div>
    <div class="footer">
      Content is safely escaped and cannot execute scripts
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render 404 error page
 */
function render404Page() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Paste Not Found</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .error-container {
      background: white;
      padding: 48px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    h1 {
      font-size: 72px;
      color: #667eea;
      margin-bottom: 16px;
    }
    p {
      font-size: 20px;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>404</h1>
    <p>Paste not found or unavailable</p>
  </div>
</body>
</html>`;
}

/**
 * Render 500 error page
 */
function render500Page() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>500 - Server Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .error-container {
      background: white;
      padding: 48px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    h1 {
      font-size: 72px;
      color: #e53e3e;
      margin-bottom: 16px;
    }
    p {
      font-size: 20px;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>500</h1>
    <p>Internal server error</p>
  </div>
</body>
</html>`;
}

module.exports = router;
