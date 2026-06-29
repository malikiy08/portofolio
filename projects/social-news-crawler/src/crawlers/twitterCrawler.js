/**
 * Twitter Crawler Module
 * 
 * SKKNI Competency: J.620100.013.02 - Merancang Arsitektur Aplikasi
 * Demonstrates web scraping implementation with Puppeteer
 * 
 * SKKNI Competency: J.620100.009.02 - Menerapkan Algoritma Pemrograman
 * Shows algorithm implementation for data extraction and processing
 */

const puppeteer = require('puppeteer');
const config = require('../config');
const logger = require('../config/logger');

class TwitterCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser instance
   * SKKNI: Resource management and initialization
   */
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      logger.info('Twitter crawler initialized');
    } catch (error) {
      logger.error('Crawler initialization error:', error);
      throw error;
    }
  }

  /**
   * Crawl tweets by keyword
   * 
   * @param {string} keyword - Search keyword
   * @param {number} limit - Maximum number of tweets to crawl
   * @returns {Promise<Array>} Array of tweet objects
   * 
   * SKKNI: J.620100.009.02 - Complex algorithm for data extraction
   */
  async crawlByKeyword(keyword, limit = 10) {
    try {
      logger.info(`Starting crawl for keyword: "${keyword}", limit: ${limit}`);

      if (!this.browser) {
        await this.initialize();
      }

      // NOTE: This is a MOCK/SKELETON implementation
      // Real Twitter crawling would require proper authentication
      // and handling of dynamic content loading
      
      // For demonstration, we generate mock data
      const tweets = await this.generateMockTweets(keyword, limit);

      logger.info(`Crawl completed: ${tweets.length} tweets extracted`);
      
      return tweets;
    } catch (error) {
      logger.error('Crawl error:', error);
      throw error;
    }
  }

  /**
   * Generate mock tweet data for demonstration
   * 
   * In production, this would be replaced with actual Puppeteer scraping logic:
   * - Navigate to Twitter search page
   * - Wait for tweets to load
   * - Extract tweet elements
   * - Parse tweet data (id, text, author, interactions)
   * 
   * @private
   */
  async generateMockTweets(keyword, limit) {
    const tweets = [];
    const baseTimestamp = Date.now();

    for (let i = 0; i < limit; i++) {
      const tweetId = `tweet_${Date.now()}_${i}`;
      const authorId = `user_${Math.floor(Math.random() * 1000)}`;
      const username = `user${Math.floor(Math.random() * 1000)}`;

      // Simulate different tweet types
      const tweetType = Math.random();
      let tweet;

      if (tweetType < 0.3) {
        // Reply tweet (30% chance)
        tweet = {
          tweet_id: tweetId,
          text: `Great discussion about ${keyword}! I totally agree with this point.`,
          author: {
            user_id: authorId,
            username: username,
            display_name: `User ${username}`
          },
          timestamp: new Date(baseTimestamp - (i * 3600000)).toISOString(),
          reply_to_tweet_id: `original_tweet_${Math.floor(Math.random() * 100)}`,
          reply_to_user_id: `user_${Math.floor(Math.random() * 1000)}`,
          retweet_of_tweet_id: null,
          mentions: []
        };
      } else if (tweetType < 0.5) {
        // Retweet (20% chance)
        tweet = {
          tweet_id: tweetId,
          text: `RT: Amazing insights on ${keyword}!`,
          author: {
            user_id: authorId,
            username: username,
            display_name: `User ${username}`
          },
          timestamp: new Date(baseTimestamp - (i * 3600000)).toISOString(),
          reply_to_tweet_id: null,
          reply_to_user_id: null,
          retweet_of_tweet_id: `original_tweet_${Math.floor(Math.random() * 100)}`,
          retweet_of_user_id: `user_${Math.floor(Math.random() * 1000)}`,
          mentions: []
        };
      } else {
        // Original tweet with possible mentions (50% chance)
        const hasMentions = Math.random() > 0.5;
        const mentions = hasMentions ? [
          `user_${Math.floor(Math.random() * 1000)}`,
          `user_${Math.floor(Math.random() * 1000)}`
        ] : [];

        tweet = {
          tweet_id: tweetId,
          text: `Just discovered something amazing about ${keyword}! ${hasMentions ? '@user123 @user456' : ''} #tech #development`,
          author: {
            user_id: authorId,
            username: username,
            display_name: `User ${username}`
          },
          timestamp: new Date(baseTimestamp - (i * 3600000)).toISOString(),
          reply_to_tweet_id: null,
          reply_to_user_id: null,
          retweet_of_tweet_id: null,
          mentions: mentions
        };
      }

      tweets.push(tweet);

      // Simulate rate limiting delay
      await this.delay(
        this.randomDelay(
          config.crawler.twitter.rateLimitDelayMin,
          config.crawler.twitter.rateLimitDelayMax
        )
      );
    }

    return tweets;
  }

  /**
   * Random delay generator for rate limiting
   * SKKNI: Demonstrates rate limiting algorithm
   * 
   * @private
   */
  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Delay utility
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close browser and cleanup resources
   * SKKNI: Proper resource management
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.info('Crawler closed');
      }
    } catch (error) {
      logger.error('Error closing crawler:', error);
    }
  }
}

module.exports = TwitterCrawler;
