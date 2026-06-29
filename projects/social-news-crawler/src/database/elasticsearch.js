/**
 * Elasticsearch Client
 * 
 * SKKNI Competency: J.620100.017.02 - Mengintegrasikan Basis Data dengan Aplikasi
 * Demonstrates integration with search engine for full-text search capabilities
 */

const { Client } = require('@elastic/elasticsearch');
const config = require('../config');
const logger = require('../config/logger');

class ElasticsearchClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Connect to Elasticsearch with retry logic
   * SKKNI: J.620100.017.02 - Demonstrates robust connection management
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        this.client = new Client({
          node: config.elasticsearch.node,
          auth: {
            username: config.elasticsearch.auth.username,
            password: config.elasticsearch.auth.password
          },
          maxRetries: 5,
          requestTimeout: 30000,
          sniffOnStart: true
        });

        // Health check
        await this.client.ping();
        this.isConnected = true;
        logger.info('Elasticsearch connected successfully');
        return;
      } catch (error) {
        retries++;
        logger.warn(`Elasticsearch connection attempt ${retries}/${maxRetries} failed:`, error.message);

        if (retries >= maxRetries) {
          logger.error('Elasticsearch connection failed after maximum retries');
          throw error;
        }

        // Exponential backoff
        await this.delay(Math.pow(2, retries) * 1000);
      }
    }
  }

  /**
   * Initialize Elasticsearch index with proper mapping
   * SKKNI: J.620100.016.02 - Merancang Basis Data
   */
  async initialize() {
    try {
      await this.connect();

      const indexExists = await this.client.indices.exists({
        index: config.elasticsearch.index.tweets
      });

      if (!indexExists) {
        await this.client.indices.create({
          index: config.elasticsearch.index.tweets,
          body: {
            mappings: {
              properties: {
                tweet_id: { type: 'keyword' },
                text: {
                  type: 'text',
                  analyzer: 'standard',
                  fields: { keyword: { type: 'keyword' } }
                },
                author: {
                  properties: {
                    user_id: { type: 'keyword' },
                    username: { type: 'keyword' },
                    display_name: {
                      type: 'text',
                      fields: { keyword: { type: 'keyword' } }
                    }
                  }
                },
                timestamp: { type: 'date' },
                sentiment: {
                  properties: {
                    label: { type: 'keyword' },
                    score: { type: 'float' }
                  }
                },
                keywords: { type: 'keyword' },
                mentions: { type: 'keyword' },
                reply_to_tweet_id: { type: 'keyword' },
                retweet_of_tweet_id: { type: 'keyword' }
              }
            }
          }
        });
        logger.info('Elasticsearch index created successfully');
      }
    } catch (error) {
      logger.error('Elasticsearch initialization error:', error);
      throw error;
    }
  }

  /**
   * Index a single tweet document
   * @param {Object} tweetData - Tweet data with ML results
   */
  async indexTweet(tweetData) {
    try {
      const response = await this.client.index({
        index: config.elasticsearch.index.tweets,
        id: tweetData.tweet_id,
        body: tweetData
      });

      logger.info(`Tweet indexed: ${tweetData.tweet_id}`);
      return response;
    } catch (error) {
      logger.error(`Error indexing tweet ${tweetData.tweet_id}:`, error);
      throw error;
    }
  }

  /**
   * Bulk index multiple tweets for better performance
   * SKKNI: Demonstrates performance optimization techniques
   */
  async bulkIndexTweets(tweets) {
    try {
      const body = tweets.flatMap(tweet => [
        { index: { _index: config.elasticsearch.index.tweets, _id: tweet.tweet_id } },
        tweet
      ]);

      const response = await this.client.bulk({ body });

      if (response.errors) {
        logger.warn('Some tweets failed to index', {
          errors: response.items.filter(item => item.index.error)
        });
      }

      logger.info(`Bulk indexed ${tweets.length} tweets`);
      return response;
    } catch (error) {
      logger.error('Bulk indexing error:', error);
      throw error;
    }
  }

  /**
   * Search tweets by keyword and time range
   */
  async searchTweets(keyword, startDate, endDate, size = 100) {
    try {
      const response = await this.client.search({
        index: config.elasticsearch.index.tweets,
        body: {
          query: {
            bool: {
              must: [
                { match: { text: keyword } },
                {
                  range: {
                    timestamp: {
                      gte: startDate,
                      lte: endDate
                    }
                  }
                }
              ]
            }
          },
          sort: [{ timestamp: 'desc' }],
          size
        }
      });

      return response.hits.hits.map(hit => hit._source);
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Delete a tweet (for rollback scenarios)
   * SKKNI: Demonstrates transaction rollback capability
   */
  async deleteTweet(tweetId) {
    try {
      await this.client.delete({
        index: config.elasticsearch.index.tweets,
        id: tweetId
      });
      logger.debug(`Tweet deleted from Elasticsearch: ${tweetId}`);
    } catch (error) {
      if (error.meta?.statusCode !== 404) {
        logger.error(`Error deleting tweet ${tweetId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Disconnect from Elasticsearch
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      logger.info('Elasticsearch disconnected');
    }
  }

  /**
   * Utility: Delay helper
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ElasticsearchClient();
