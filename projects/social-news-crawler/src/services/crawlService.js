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

      // Step 2: Process tweets through ML and database pipeline with batch processing
      logger.info('Step 2: Processing tweets through ML and database pipeline...');

      // SKKNI: J.620100.009.02 - Demonstrates performance optimization with batch processing
      const BATCH_SIZE = 5; // Process 5 tweets concurrently

      for (let i = 0; i < rawTweets.length; i += BATCH_SIZE) {
        const batch = rawTweets.slice(i, i + BATCH_SIZE);
        logger.debug(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} tweets`);

        // Process batch concurrently
        const results = await Promise.allSettled(
          batch.map(tweet => this.processSingleTweet(tweet))
        );

        // Count results
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            processedCount++;
            logger.debug(`Tweet ${batch[index].tweet_id} processed successfully`);
          } else {
            failedCount++;
            logger.error(`Failed to process tweet ${batch[index].tweet_id}:`, result.reason);
          }
        });
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
   * Process a single tweet through the complete pipeline with transaction support
   *
   * SKKNI: Demonstrates async/await pattern, error handling, and transaction management
   *
   * @private
   */
  async processSingleTweet(rawTweet) {
    let esIndexed = false;
    let neo4jSaved = false;

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

      // Step 2c: Save to both databases with transaction-like behavior
      // SKKNI: J.620100.017.02 - Demonstrates distributed transaction handling
      try {
        // Save to Elasticsearch first
        await elasticsearchClient.indexTweet(esDocument);
        esIndexed = true;

        // Then save to Neo4j
        await this.saveToNeo4j(rawTweet);
        neo4jSaved = true;

        logger.debug(`Tweet ${rawTweet.tweet_id} processed successfully`);

      } catch (dbError) {
        // Rollback: If Neo4j fails but Elasticsearch succeeded, remove from ES
        if (esIndexed && !neo4jSaved) {
          logger.warn(`Rolling back Elasticsearch entry for tweet ${rawTweet.tweet_id}`);
          await elasticsearchClient.deleteTweet(rawTweet.tweet_id)
            .catch(rollbackError =>
              logger.error('Rollback failed:', rollbackError)
            );
        }
        throw dbError;
      }

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

      // Create MENTIONS relationships in batch (optimized)
      // SKKNI: J.620100.009.02 - Demonstrates batch processing optimization
      if (tweet.mentions && tweet.mentions.length > 0) {
        await neo4jClient.createMentionsInBatch(
          tweet.tweet_id,
          tweet.mentions
        );
      }

    } catch (error) {
      logger.error(`Neo4j save error for tweet ${tweet.tweet_id}:`, error);
      throw error;
    }
  }
}

module.exports = new CrawlService();
