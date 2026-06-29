/**
 * Security Middleware
 * 
 * SKKNI Competency: J.620100.022.01 - Implementasi Keamanan SI
 * Demonstrates security best practices including rate limiting,
 * CORS, helmet headers, and request tracking
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Helmet security headers
 * Protects against common vulnerabilities
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration
 * Allow specific origins in production
 */
const corsConfig = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400 // 24 hours
});

/**
 * Global rate limiter
 * 100 requests per 15 minutes per IP
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      requestId: req.id
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Crawl endpoint rate limiter (stricter)
 * 10 crawl requests per hour per IP
 */
const crawlLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'Crawl rate limit exceeded',
    message: 'Maximum 10 crawl requests per hour'
  },
  keyGenerator: (req) => {
    // Use API key if available, otherwise IP
    return req.headers['x-api-key'] || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Crawl rate limit exceeded', {
      ip: req.ip,
      apiKey: req.headers['x-api-key']?.substring(0, 8),
      requestId: req.id
    });
    res.status(429).json({
      success: false,
      error: 'Crawl rate limit exceeded',
      message: 'You can make maximum 10 crawl requests per hour',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Request ID middleware
 * Adds unique ID to each request for tracking
 */
const requestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Request logger middleware
 * Logs all incoming requests with timing
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};

/**
 * Request size limiter
 * Prevents large payloads
 */
const requestSizeLimit = '1mb';

module.exports = {
  helmetConfig,
  corsConfig,
  globalLimiter,
  crawlLimiter,
  requestId,
  requestLogger,
  requestSizeLimit
};
