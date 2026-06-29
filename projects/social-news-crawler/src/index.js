/**
 * Social & News Media Crawler - Main Application
 * 
 * SKKNI Senior Programmer Certification Portfolio
 * Muhammad Yusuf Malik
 * 
 * This application demonstrates:
 * - J.620100.013.02: Application Architecture Design
 * - J.620100.016.02: Database Design (Elasticsearch + Neo4j)
 * - J.620100.017.02: Database Integration
 * - J.620100.022.01: Security Implementation
 * - J.620100.024.01: Testing Implementation
 * - J.620100.009.02: Algorithm Implementation
 */

const express = require('express');
const config = require('./config');
const logger = require('./config/logger');
const elasticsearchClient = require('./database/elasticsearch');
const neo4jClient = require('./database/neo4j');

// Import routes
const crawlRoutes = require('./routes/crawl');
const swaggerRoutes = require('./routes/swagger');

// Initialize Express application
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.use('/api/v1', crawlRoutes);
app.use('/api-docs', swaggerRoutes); // Swagger documentation

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Social & News Media Crawler',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      crawl: 'POST /api/v1/crawl',
      status: 'GET /api/v1/crawl/status',
      health: 'GET /health',
      apiDocs: 'GET /api-docs'
    },
    documentation: {
      swagger: `http://localhost:${config.server.port}/api-docs`,
      github: 'https://github.com/malikiy08/portofolio/tree/main/projects/social-news-crawler'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: config.server.env === 'development' ? err.message : 'An error occurred'
  });
});

/**
 * Initialize databases and start server
 * 
 * SKKNI: Demonstrates proper application initialization and error handling
 */
async function startServer() {
  try {
    logger.info('=== Initializing Social & News Media Crawler ===');

    // Initialize Elasticsearch
    logger.info('Initializing Elasticsearch...');
    await elasticsearchClient.initialize();
    logger.info('✓ Elasticsearch ready');

    // Initialize Neo4j
    logger.info('Initializing Neo4j...');
    await neo4jClient.initialize();
    logger.info('✓ Neo4j ready');

    // Start Express server
    const server = app.listen(config.server.port, () => {
      logger.info(`=== Server started successfully ===`);
      logger.info(`Environment: ${config.server.env}`);
      logger.info(`Port: ${config.server.port}`);
      logger.info(`API Base URL: http://localhost:${config.server.port}/api/v1`);
      logger.info('');
      logger.info('Available endpoints:');
      logger.info(`  POST http://localhost:${config.server.port}/api/v1/crawl`);
      logger.info(`  GET  http://localhost:${config.server.port}/api/v1/crawl/status`);
      logger.info(`  GET  http://localhost:${config.server.port}/health`);
      logger.info('');
      logger.info('📚 API Documentation (Swagger):');
      logger.info(`  http://localhost:${config.server.port}/api-docs`);
      logger.info('');
      logger.info('Press Ctrl+C to stop the server');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connections
        await neo4jClient.close();
        logger.info('Database connections closed');
        
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

module.exports = app;
