/**
 * Configuration Module
 * 
 * SKKNI Competency: J.620100.013.02 - Merancang Arsitektur Aplikasi
 * Demonstrates centralized configuration management following best practices
 */

require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
    },
    index: {
      tweets: 'tweets'
    }
  },

  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },

  mlApi: {
    url: process.env.ML_API_URL || 'http://localhost:5000/api/analyze',
    timeout: parseInt(process.env.ML_API_TIMEOUT) || 30000
  },

  crawler: {
    twitter: {
      rateLimitDelayMin: parseInt(process.env.TWITTER_RATE_LIMIT_DELAY_MIN) || 2000,
      rateLimitDelayMax: parseInt(process.env.TWITTER_RATE_LIMIT_DELAY_MAX) || 5000,
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT_CRAWLERS) || 3
    }
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
