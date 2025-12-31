/**
 * Input validation middleware using express-validator
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for POST /api/pastes
 */
const validateCreatePaste = [
    body('content')
        .exists().withMessage('content is required')
        .isString().withMessage('content must be a string')
        .trim()
        .notEmpty().withMessage('content must be a non-empty string'),

    body('ttl_seconds')
        .optional()
        .isInt({ min: 1 }).withMessage('ttl_seconds must be an integer >= 1'),

    body('max_views')
        .optional()
        .isInt({ min: 1 }).withMessage('max_views must be an integer >= 1'),

    // Middleware to check validation results
    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }

        next();
    }
];

module.exports = {
    validateCreatePaste
};
