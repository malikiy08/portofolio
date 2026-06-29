/**
 * Crawl API Routes
 *
 * SKKNI Competency: J.620100.013.02 - Merancang Arsitektur Aplikasi
 * Demonstrates RESTful API design and request validation
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const crawlService = require('../services/crawlService');
const logger = require('../config/logger');
const { crawlLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * POST /api/v1/crawl
 *
 * Main endpoint to trigger Twitter crawl
 *
 * Request Body:
 * {
 *   "keyword": "nodejs",
 *   "limit": 10
 * }
 *
 * SKKNI: J.620100.022.01 - Demonstrates input validation, rate limiting, and security
 */
router.post(
  '/crawl',
  crawlLimiter, // Apply crawl-specific rate limiting
  [
    // Input validation
    body('keyword')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Keyword must be between 1 and 100 characters'),
    
    body('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
      .toInt()
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { keyword, limit = 10 } = req.body;

      logger.info('Crawl request received', {
        requestId: req.id,
        keyword,
        limit,
        ip: req.ip
      });

      // Execute crawl pipeline
      const result = await crawlService.executeCrawl(keyword, limit);

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Crawl completed successfully',
        data: result,
        requestId: req.id
      });

    } catch (error) {
      logger.error('Crawl endpoint error', {
        requestId: req.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        requestId: req.id
      });
    }
  }
);

/**
 * GET /api/v1/crawl/status
 * 
 * Health check endpoint
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Crawl service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
