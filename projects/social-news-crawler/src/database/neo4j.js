/**
 * Neo4j Graph Database Client
 * 
 * SKKNI Competency: J.620100.016.02 - Merancang Basis Data
 * Demonstrates graph database design for relationship modeling
 * 
 * SKKNI Competency: J.620100.017.02 - Mengintegrasikan Basis Data dengan Aplikasi
 * Shows integration of graph database for complex relationship queries
 */

const neo4j = require('neo4j-driver');
const config = require('../config');
const logger = require('../config/logger');

class Neo4jClient {
  constructor() {
    this.driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password)
    );
  }

  /**
   * Initialize database constraints and indexes
   * SKKNI: J.620100.016.02 - Database design with proper constraints
   */
  async initialize() {
    const session = this.driver.session();
    try {
      // Create unique constraints
      await session.run('CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE');
      await session.run('CREATE CONSTRAINT tweet_id IF NOT EXISTS FOR (t:Tweet) REQUIRE t.id IS UNIQUE');

      // Create indexes for performance
      await session.run('CREATE INDEX user_username IF NOT EXISTS FOR (u:User) ON (u.username)');
      await session.run('CREATE INDEX tweet_timestamp IF NOT EXISTS FOR (t:Tweet) ON (t.timestamp)');

      logger.info('Neo4j constraints and indexes created');
    } catch (error) {
      logger.error('Neo4j initialization error:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create or update User node
   * @param {Object} userData - User information
   */
  async createUser(userData) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MERGE (u:User {id: $userId})
        SET u.username = $username,
            u.display_name = $displayName,
            u.created_at = datetime()
        RETURN u
        `,
        {
          userId: userData.user_id,
          username: userData.username,
          displayName: userData.display_name || userData.username
        }
      );

      logger.debug(`User node created/updated: ${userData.username}`);
      return result.records[0].get('u');
    } catch (error) {
      logger.error(`Error creating user ${userData.username}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create Tweet node and TWEETS relationship
   * SKKNI: Demonstrates graph relationship modeling
   */
  async createTweetWithAuthor(tweetData, authorData) {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MERGE (u:User {id: $authorId})
        SET u.username = $username,
            u.display_name = $displayName
        
        MERGE (t:Tweet {id: $tweetId})
        SET t.text = $text,
            t.timestamp = datetime($timestamp)
        
        MERGE (u)-[r:TWEETS]->(t)
        SET r.created_at = datetime()
        
        RETURN u, t, r
        `,
        {
          authorId: authorData.user_id,
          username: authorData.username,
          displayName: authorData.display_name || authorData.username,
          tweetId: tweetData.tweet_id,
          text: tweetData.text,
          timestamp: tweetData.timestamp
        }
      );

      logger.debug(`Tweet node created with TWEETS relationship: ${tweetData.tweet_id}`);
      return result.records[0];
    } catch (error) {
      logger.error(`Error creating tweet ${tweetData.tweet_id}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create REPLIES_TO relationship between tweets
   * SKKNI: J.620100.016.02 - Complex relationship modeling
   */
  async createReplyRelationship(replyTweetId, originalTweetId) {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (reply:Tweet {id: $replyId})
        MATCH (original:Tweet {id: $originalId})
        MERGE (reply)-[r:REPLIES_TO]->(original)
        SET r.created_at = datetime()
        RETURN r
        `,
        { replyId: replyTweetId, originalId: originalTweetId }
      );

      logger.debug(`REPLIES_TO relationship created: ${replyTweetId} -> ${originalTweetId}`);
    } catch (error) {
      logger.error('Error creating reply relationship:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create RETWEETS relationship
   */
  async createRetweetRelationship(userId, tweetId) {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (u:User {id: $userId})
        MATCH (t:Tweet {id: $tweetId})
        MERGE (u)-[r:RETWEETS]->(t)
        SET r.created_at = datetime()
        RETURN r
        `,
        { userId, tweetId }
      );

      logger.debug(`RETWEETS relationship created: User ${userId} -> Tweet ${tweetId}`);
    } catch (error) {
      logger.error('Error creating retweet relationship:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create MENTIONS relationship
   */
  async createMentionRelationship(tweetId, mentionedUserId) {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (t:Tweet {id: $tweetId})
        MATCH (u:User {id: $mentionedUserId})
        MERGE (t)-[r:MENTIONS]->(u)
        SET r.created_at = datetime()
        RETURN r
        `,
        { tweetId, mentionedUserId }
      );

      logger.debug(`MENTIONS relationship created: Tweet ${tweetId} -> User ${mentionedUserId}`);
    } catch (error) {
      logger.error('Error creating mention relationship:', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Create multiple MENTIONS relationships in batch
   * SKKNI: J.620100.009.02 - Demonstrates algorithm optimization
   *
   * @param {string} tweetId - Tweet ID
   * @param {Array<string>} mentionedUserIds - Array of mentioned user IDs
   */
  async createMentionsInBatch(tweetId, mentionedUserIds) {
    if (!mentionedUserIds || mentionedUserIds.length === 0) {
      return;
    }

    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (t:Tweet {id: $tweetId})
        UNWIND $userIds AS userId
        MERGE (u:User {id: userId})
        SET u.username = 'user_' + userId,
            u.display_name = 'User ' + userId
        MERGE (t)-[r:MENTIONS]->(u)
        SET r.created_at = datetime()
        RETURN count(r) as mentionsCreated
        `,
        { tweetId, userIds: mentionedUserIds }
      );

      logger.debug(`Batch created ${mentionedUserIds.length} MENTIONS relationships for tweet ${tweetId}`);
    } catch (error) {
      logger.error('Error creating mentions in batch:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Delete tweet and its relationships (for rollback)
   * SKKNI: Demonstrates transaction rollback capability
   */
  async deleteTweet(tweetId) {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (t:Tweet {id: $tweetId})
        DETACH DELETE t
        `,
        { tweetId }
      );
      logger.debug(`Tweet deleted from Neo4j: ${tweetId}`);
    } catch (error) {
      logger.error(`Error deleting tweet ${tweetId}:`, error);
    } finally {
      await session.close();
    }
  }

  /**
   * Close driver connection
   */
  async close() {
    await this.driver.close();
    logger.info('Neo4j driver closed');
  }
}

module.exports = new Neo4jClient();
