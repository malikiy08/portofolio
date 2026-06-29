/**
 * Machine Learning Service Integration
 * 
 * SKKNI Competency: J.620100.013.02 - Merancang Arsitektur Aplikasi
 * Demonstrates integration with external ML API for sentiment analysis
 * and keyword extraction
 * 
 * Note: This is a mock implementation. In production, this would call
 * the actual ML API developed by the ML team.
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../config/logger');

class MLService {
  /**
   * Analyze tweet text for sentiment and keywords
   * 
   * @param {string} text - Tweet text to analyze
   * @returns {Promise<Object>} Analysis results with sentiment and keywords
   * 
   * SKKNI: Demonstrates async/await pattern and error handling
   */
  async analyzeMetadata(text) {
    try {
      // In production, this would call the actual ML API:
      // const response = await axios.post(config.mlApi.url, { text }, {
      //   timeout: config.mlApi.timeout
      // });
      // return response.data;

      // Mock implementation for demonstration
      logger.info('Calling ML API (mock) for text analysis');
      
      // Simulate API delay
      await this.delay(100);

      // Generate mock sentiment analysis
      const sentiment = this.generateMockSentiment(text);
      
      // Generate mock keyword extraction
      const keywords = this.extractMockKeywords(text);

      const result = {
        sentiment,
        keywords,
        processed_at: new Date().toISOString()
      };

      logger.debug('ML analysis completed', { keywords_count: keywords.length });
      
      return result;
    } catch (error) {
      logger.error('ML API error:', error);
      
      // Fallback: return neutral sentiment if ML API fails
      // SKKNI: Demonstrates resilient error handling
      return {
        sentiment: {
          label: 'neutral',
          score: 0.5,
          confidence: 0.0
        },
        keywords: [],
        error: 'ML API unavailable',
        processed_at: new Date().toISOString()
      };
    }
  }

  /**
   * Mock sentiment analysis
   * Simulates ML API response for sentiment classification
   * 
   * @private
   */
  generateMockSentiment(text) {
    // Simple heuristic for demo purposes
    const lowerText = text.toLowerCase();
    
    const positiveWords = ['love', 'great', 'awesome', 'excellent', 'amazing', 'good', 'best'];
    const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'worst', 'horrible'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    let label, score;

    if (positiveCount > negativeCount) {
      label = 'positive';
      score = 0.6 + (Math.random() * 0.3); // 0.6-0.9
    } else if (negativeCount > positiveCount) {
      label = 'negative';
      score = 0.6 + (Math.random() * 0.3);
    } else {
      label = 'neutral';
      score = 0.4 + (Math.random() * 0.2); // 0.4-0.6
    }

    return {
      label,
      score: parseFloat(score.toFixed(2)),
      confidence: parseFloat((0.7 + Math.random() * 0.3).toFixed(2))
    };
  }

  /**
   * Mock keyword extraction
   * Simulates ML API keyword extraction
   * 
   * @private
   */
  extractMockKeywords(text) {
    // Extract hashtags and mentions as keywords
    const hashtags = text.match(/#\w+/g) || [];
    const mentions = text.match(/@\w+/g) || [];

    // Extract common technical terms
    const technicalTerms = ['nodejs', 'javascript', 'python', 'react', 'api', 'database', 
                           'ml', 'ai', 'cloud', 'docker', 'kubernetes'];
    
    const lowerText = text.toLowerCase();
    const foundTerms = technicalTerms.filter(term => lowerText.includes(term));

    // Combine all keywords and remove duplicates
    const allKeywords = [
      ...hashtags.map(h => h.slice(1).toLowerCase()),
      ...foundTerms,
      ...mentions.map(m => m.slice(1).toLowerCase())
    ];

    // Return unique keywords (max 10)
    return [...new Set(allKeywords)].slice(0, 10);
  }

  /**
   * Utility: Delay helper for async operations
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch analyze multiple texts
   * SKKNI: Demonstrates performance optimization with batch processing
   * 
   * @param {Array<string>} texts - Array of texts to analyze
   * @returns {Promise<Array<Object>>} Array of analysis results
   */
  async batchAnalyze(texts) {
    try {
      logger.info(`Batch analyzing ${texts.length} texts`);
      
      // Process in parallel for better performance
      const results = await Promise.all(
        texts.map(text => this.analyzeMetadata(text))
      );

      return results;
    } catch (error) {
      logger.error('Batch analysis error:', error);
      throw error;
    }
  }
}

module.exports = new MLService();
