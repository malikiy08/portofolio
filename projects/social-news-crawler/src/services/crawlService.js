/**
 * Crawl Service - Main Orchestrator
 * 
 * SKKNI Competency: J.620100.013.02 - Merancang Arsitektur Aplikasi
 * Demonstrates service layer pattern and separation of concerns
 * 
 * This service orchestrates the entire crawl pipeline:
 * 1. Scrape tweets from Twitter
 * 2. Send to ML API for analysis
 * 3. Store in Elasticsearch (search)
 * 4. Store in Neo4j (relationships)
 */

const TwitterCrawler = require('../crawlers/twitterCrawler');
const mlService = require('./mlService');
const elasticsearchClient = require('../database/elasticsearch');
const neo4jClient = require('../database/neo4j');
const logger = require('../config/logger');

class CrawlService {
  /**
   * Execute complete crawl pipeline
   * 
   * @param {string} keyword - Search keyword
   * @param {number} limit - Maximum tweets to process
   * @returns {Promise<Object>} Crawl results summary
   * 
   * SKKNI: J.620100.017.02 - Integration of multiple databases
   * SKKNI: J.620100.009.02 - Complex data processing algorithm
   */
  async executeCrawl(keyword, limit = 10) {
    const crawler = new TwitterCrawler();
    let processedCount = 0;
    let failedCount = 0;

    try {
      logger.info(`=== Starting crawl pipeline ===`);
      logger.info(`Keyword: "${keyword}", Limit: ${limit}`);

      // Step 1: Scrape tweets
      logger.info('Step 1: Scraping tweets...');
      const rawTweets = await crawler.crawlByKeyword(keyword, limit);
      logger.info(`Scraped ${rawTweets.length} tweets`);

      // Step 2: Process each tweet through the pipeline
      logger.info('Step 2: Processing tweets through ML and database pipeline...');

      for (const rawTweet of rawTweets) {
        try {
          await this.processSingleTweet(rawTweet);
          processedCount++;
        } catch (error) {
          logger.error(`Failed to process tweet ${rawTweet.tweet_id}:`, error);
          failedCount++;
        }
      }

      logger.info(`=== Crawl pipeline completed ===`);
      logger.info(`Processed: ${processedCount}, Failed: ${failedCount}`);

      return {
        success: true,
        total: rawTweets.length,
        processed: processedCount,
        failed: failedCount,
        keyword,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Crawl pipeline error:', error);
      throw error;
    } finally {
      await crawler.close();
    }
  }

  /**
   * Process a single tweet through the complete pipeline
   * 
   * SKKNI: Demonstrates async/await pattern and error handling
   * 
   * @private
   */
  async processSingleTweet(rawTweet) {
    try {
      // Step 2a: ML Analysis
      const mlResults = await mlService.analyzeMetadata(rawTweet.text);

      // Step 2b: Prepare data for Elasticsearch
      const esDocument = {
        tweet_id: rawTweet.tweet_id,
        text: rawTweet.text,
        author: rawTweet.author,
        timestamp: rawTweet.timestamp,
        sentiment: mlResults.sentiment,
        keywords: mlResults.keywords,
        mentions: rawTweet.mentions || [],
        reply_to_tweet_id: rawTweet.reply_to_tweet_id,
        retweet_of_tweet_id: rawTweet.retweet_of_tweet_id,
        indexed_at: new Date().toISOString()
      };

      // Step 2c: Save to Elasticsearch
      await elasticsearchClient.indexTweet(esDocument);

      // Step 2d: Save to Neo4j (graph relationships)
      await this.saveToNeo4j(rawTweet);

      logger.debug(`Tweet ${rawTweet.tweet_id} processed successfully`);

    } catch (error) {
      logger.error(`Error processing tweet ${rawTweet.tweet_id}:`, error);
      throw error;
    }
  }

  /**
   * Save tweet and relationships to Neo4j
   * 
   * SKKNI: J.620100.016.02 - Complex relationship modeling
   * 
   * @private
   */
  async saveToNeo4j(tweet) {
    try {
      // Create user and tweet nodes with TWEETS relationship
      await neo4jClient.createTweetWithAuthor(
        {
          tweet_id: tweet.tweet_id,
          text: tweet.text,
          timestamp: tweet.timestamp
        },
        tweet.author
      );

      // Create REPLIES_TO relationship if it's a reply
      if (tweet.reply_to_tweet_id && tweet.reply_to_user_id) {
        // Create original tweet node if it doesn't exist
        await neo4jClient.createUser({
          user_id: tweet.reply_to_user_id,
          username: `user_${tweet.reply_to_user_id}`,
          display_name: `User ${tweet.reply_to_user_id}`
        });

        await neo4jClient.createTweetWithAuthor(
          {
            tweet_id: tweet.reply_to_tweet_id,
            text: 'Original tweet (placeholder)',
            timestamp: tweet.timestamp
          },
          {
            user_id: tweet.reply_to_user_id,
            username: `user_${tweet.reply_to_user_id}`,
            display_name: `User ${tweet.reply_to_user_id}`
          }
        );

        await neo4jClient.createReplyRelationship(
          tweet.tweet_id,
          tweet.reply_to_tweet_id
        );
      }

      // Create RETWEETS relationship if it's a retweet
      if (tweet.retweet_of_tweet_id && tweet.retweet_of_user_id) {
        await neo4jClient.createRetweetRelationship(
          tweet.author.user_id,
          tweet.retweet_of_tweet_id
        );
      }

      // Create MENTIONS relationships
      if (tweet.mentions && tweet.mentions.length > 0) {
        for (const mentionedUserId of tweet.mentions) {
          // Create mentioned user if doesn't exist
          await neo4jClient.createUser({
            user_id: mentionedUserId,
            username: `user_${mentionedUserId}`,
            display_name: `User ${mentionedUserId}`
          });

          await neo4jClient.createMentionRelationship(
            tweet.tweet_id,
            mentionedUserId
          );
        }
      }

    } catch (error) {
      logger.error(`Neo4j save error for tweet ${tweet.tweet_id}:`, error);
      throw error;
    }
  }
}

module.exports = new CrawlService();
