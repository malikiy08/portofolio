# Testing Strategy - Social & News Media Crawler Engine

## 🧪 Testing Overview

Comprehensive testing strategy covering unit tests, integration tests, end-to-end tests, and performance testing to ensure crawler reliability and correctness.

### Testing Objectives
- **Reliability:** Ensure crawlers handle errors gracefully
- **Correctness:** Verify data extraction accuracy
- **Performance:** Validate throughput targets (thousands/hour)
- **Regression Prevention:** Catch breaking changes early
- **Code Quality:** Maintain 80%+ test coverage

### Testing Stack
- **Unit Testing:** Jest, Mocha/Chai
- **Integration Testing:** Supertest, Testcontainers
- **E2E Testing:** Puppeteer, Playwright
- **Performance Testing:** k6, Artillery
- **Coverage:** Istanbul/nyc

---

## 🎯 Unit Testing

### 1. Data Extraction Tests

```javascript
// tests/extractors/twitter-extractor.test.js
const { extractTweetData } = require('../../src/extractors/twitter');

describe('Twitter Data Extractor', () => {
  it('should extract tweet data correctly', () => {
    const mockHTML = `
      <article data-testid="tweet">
        <div data-testid="tweetText">Hello world! #nodejs</div>
        <a href="/user123">@developer</a>
        <time datetime="2023-06-15T10:30:00Z">Jun 15</time>
      </article>
    `;
    
    const result = extractTweetData(mockHTML);
    
    expect(result).toMatchObject({
      text: 'Hello world! #nodejs',
      author: { username: 'developer' },
      timestamp: '2023-06-15T10:30:00Z',
      hashtags: ['nodejs']
    });
  });
  
  it('should handle missing fields gracefully', () => {
    const mockHTML = '<article></article>';
    
    const result = extractTweetData(mockHTML);
    
    expect(result).toMatchObject({
      text: '',
      author: { username: '' },
      timestamp: null,
      hashtags: []
    });
  });
  
  it('should extract engagement metrics', () => {
    const mockHTML = `
      <div data-testid="like">250</div>
      <div data-testid="retweet">75</div>
      <div data-testid="reply">12</div>
    `;
    
    const result = extractEngagement(mockHTML);
    
    expect(result).toEqual({
      likes: 250,
      retweets: 75,
      replies: 12
    });
  });
});
```

### 2. Data Validation Tests

```javascript
// tests/validators/post-validator.test.js
const { validateTwitterPost } = require('../../src/validators');

describe('Post Validator', () => {
  it('should accept valid post', () => {
    const validPost = {
      tweetId: '1234567890',
      text: 'Valid tweet',
      author: { username: 'user123' },
      createdAt: new Date().toISOString()
    };
    
    const result = validateTwitterPost(validPost);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject post without required fields', () => {
    const invalidPost = {
      text: 'Missing tweetId'
    };
    
    const result = validateTwitterPost(invalidPost);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('tweetId is required');
  });
  
  it('should sanitize dangerous content', () => {
    const maliciousPost = {
      tweetId: '123',
      text: '<script>alert("xss")</script>',
      author: { username: 'user' }
    };
    
    const result = validateTwitterPost(maliciousPost);
    
    expect(result.sanitized.text).not.toContain('<script>');
  });
});
```

### 3. Deduplication Logic Tests

```javascript
// tests/services/deduplication.test.js
const { generateContentHash, isDuplicate } = require('../../src/services/deduplication');

describe('Deduplication Service', () => {
  it('should generate consistent hash for same content', () => {
    const post1 = { text: 'Hello', author: 'user1', url: 'http://x.com/1' };
    const post2 = { text: 'Hello', author: 'user1', url: 'http://x.com/1' };
    
    const hash1 = generateContentHash(post1);
    const hash2 = generateContentHash(post2);
    
    expect(hash1).toBe(hash2);
  });
  
  it('should generate different hash for different content', () => {
    const post1 = { text: 'Hello', author: 'user1' };
    const post2 = { text: 'World', author: 'user1' };
    
    const hash1 = generateContentHash(post1);
    const hash2 = generateContentHash(post2);
    
    expect(hash1).not.toBe(hash2);
  });
  
  it('should detect duplicates from database', async () => {
    const post = { 
      text: 'Test post',
      contentHash: 'abc123'
    };
    
    // Mock database to return existing post
    jest.spyOn(db, 'findOne').mockResolvedValue({ contentHash: 'abc123' });
    
    const result = await isDuplicate(post);
    
    expect(result).toBe(true);
  });
});
```

---

## 🔗 Integration Testing

### 1. Database Integration Tests

```javascript
// tests/integration/database.test.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { saveTwitterPost } = require('../../src/services/database');

describe('Database Integration', () => {
  let mongod, client, db;
  
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
  });
  
  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });
  
  it('should save post to database', async () => {
    const post = {
      tweetId: '123',
      text: 'Test tweet',
      author: { username: 'testuser' },
      createdAt: new Date()
    };
    
    await saveTwitterPost(db, post);
    
    const saved = await db.collection('twitter_posts').findOne({ tweetId: '123' });
    expect(saved).toMatchObject(post);
  });
  
  it('should prevent duplicate insertion', async () => {
    const post = {
      tweetId: '456',
      text: 'Duplicate test',
      contentHash: 'hash456'
    };
    
    // Insert once
    await saveTwitterPost(db, post);
    
    // Try to insert again
    await expect(saveTwitterPost(db, post)).rejects.toThrow('Duplicate');
  });
});
```

### 2. Redis Queue Tests

```javascript
// tests/integration/queue.test.js
const Queue = require('bull');
const { createCrawlJob, processCrawlJob } = require('../../src/services/queue');

describe('Job Queue Integration', () => {
  let queue;
  
  beforeAll(() => {
    queue = new Queue('test-queue', {
      redis: { host: 'localhost', port: 6379, db: 1 } // Use test DB
    });
  });
  
  afterAll(async () => {
    await queue.close();
  });
  
  it('should queue crawl job', async () => {
    const jobData = {
      platform: 'twitter',
      query: '#test',
      maxResults: 10
    };
    
    const job = await createCrawlJob(queue, jobData);
    
    expect(job.id).toBeDefined();
    expect(job.data).toMatchObject(jobData);
  });
  
  it('should process job successfully', async () => {
    const job = await queue.add({ platform: 'twitter', query: '#test' });
    
    const result = await processCrawlJob(job);
    
    expect(result.status).toBe('completed');
    expect(result.itemsProcessed).toBeGreaterThan(0);
  });
  
  it('should retry failed jobs', async () => {
    const job = await queue.add(
      { platform: 'twitter', query: 'invalid' },
      { attempts: 3 }
    );
    
    // Simulate failure
    jest.spyOn(crawlService, 'crawl').mockRejectedValue(new Error('Failed'));
    
    await expect(processCrawlJob(job)).rejects.toThrow();
    
    expect(job.attemptsMade).toBeLessThanOrEqual(3);
  });
});
```

---

## 🌐 End-to-End Testing

### 1. Full Crawl Workflow Test

```javascript
// tests/e2e/twitter-crawl.e2e.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Twitter Crawl E2E', () => {
  it('should complete full crawl workflow', async () => {
    // 1. Trigger crawl
    const triggerResponse = await request(app)
      .post('/api/v1/crawl/twitter')
      .set('X-API-Key', process.env.TEST_API_KEY)
      .send({
        type: 'search',
        query: '#nodejs',
        maxResults: 10
      });
    
    expect(triggerResponse.status).toBe(200);
    expect(triggerResponse.body.jobId).toBeDefined();
    
    const jobId = triggerResponse.body.jobId;
    
    // 2. Poll for completion
    let status = 'queued';
    let attempts = 0;
    
    while (status !== 'completed' && attempts < 30) {
      const statusResponse = await request(app)
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('X-API-Key', process.env.TEST_API_KEY);
      
      status = statusResponse.body.status;
      attempts++;
      
      if (status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      }
    }
    
    expect(status).toBe('completed');
    
    // 3. Verify data was saved
    const dataResponse = await request(app)
      .get('/api/v1/data/twitter')
      .set('X-API-Key', process.env.TEST_API_KEY)
      .query({ keyword: 'nodejs', limit: 10 });
    
    expect(dataResponse.status).toBe(200);
    expect(dataResponse.body.data).toBeInstanceOf(Array);
    expect(dataResponse.body.data.length).toBeGreaterThan(0);
  });
});
```

---

## ⚡ Performance Testing

### 1. Load Testing with k6

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 users
    { duration: '3m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be below 10%
  },
};

export default function () {
  const url = 'http://localhost:3000/api/v1/data/twitter';
  const params = {
    headers: {
      'X-API-Key': process.env.TEST_API_KEY,
    },
  };
  
  const response = http.get(url, params);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### 2. Throughput Testing

```javascript
// tests/performance/throughput.test.js
describe('Crawler Throughput', () => {
  it('should process at least 1000 posts per hour', async () => {
    const startTime = Date.now();
    const targetCount = 1000;
    
    // Trigger crawl
    const job = await createCrawlJob({
      platform: 'twitter',
      query: '#test',
      maxResults: targetCount
    });
    
    // Wait for completion
    await waitForJobCompletion(job.id, 60 * 60 * 1000); // 1 hour max
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000 / 60; // minutes
    
    const result = await getJobResult(job.id);
    const throughput = result.itemsProcessed / duration * 60; // per hour
    
    expect(throughput).toBeGreaterThanOrEqual(1000);
  });
});
```

---

## 📊 Test Coverage

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**'
  ]
};
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- tests/unit/extractors

# Run integration tests only
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance
```

---

## 🔍 Monitoring & Observability in Tests

```javascript
// tests/monitoring/metrics.test.js
describe('Metrics Collection', () => {
  it('should track successful requests', async () => {
    const initialCount = await getMetric('crawler.requests.success');
    
    await crawlPage('https://example.com');
    
    const finalCount = await getMetric('crawler.requests.success');
    
    expect(finalCount).toBe(initialCount + 1);
  });
  
  it('should track error rates', async () => {
    const initialErrors = await getMetric('crawler.requests.error');
    
    // Trigger error scenario
    await expect(crawlPage('https://invalid-url')).rejects.toThrow();
    
    const finalErrors = await getMetric('crawler.requests.error');
    
    expect(finalErrors).toBe(initialErrors + 1);
  });
});
```

---

## ✅ Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5
        ports:
          - 27017:27017
      redis:
        image: redis:6
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

*This testing strategy demonstrates SKKNI competency unit J.620100.024.01 (Implementing Software Testing Plan).*
