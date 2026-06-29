# System Architecture - Social & News Media Crawler Engine

## 🏗️ Architecture Overview

The Social & News Media Crawler Engine is built using a **microservices-inspired architecture** with clear separation between data collection, ML processing, and storage layers. The system leverages Elasticsearch for search capabilities and Neo4j for relationship graph visualization, while integrating with an internal ML API for sentiment analysis and keyword extraction.

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Control Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Scheduler  │  │  Job Manager │  │   API Server │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Job Queue (Bull + Redis)                      │
└─────────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Crawler Workers                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Twitter    │  │   Facebook   │  │  News Media  │          │
│  │   Crawler    │  │   Crawler    │  │   Crawler    │          │
│  │ (Puppeteer)  │  │ (Puppeteer)  │  │  (Cheerio)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                    ┌─────────────────┐
                    │   Raw Tweet     │
                    │   Data Queue    │
                    └────────┬────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ML Processing Layer                           │
│                                                                  │
│                    ┌──────────────────┐                         │
│                    │  Internal ML API │  (Separate Team)        │
│                    │  ───────────────  │                        │
│                    │  • Sentiment      │                        │
│                    │  • Keywords       │                        │
│                    │  • Entities       │                        │
│                    └────────┬─────────┘                         │
└─────────────────────────────┼───────────────────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │ Processed Data  │
                    │  with ML Tags   │
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│    Elasticsearch         │  │         Neo4j            │
│  ─────────────────────   │  │  ──────────────────────  │
│  • Tweet content         │  │  • User nodes            │
│  • Sentiment scores      │  │  • Tweet nodes           │
│  • Extracted keywords    │  │  • TWEETS relationship   │
│  • Metadata              │  │  • REPLIES_TO            │
│  • Timestamps            │  │  • RETWEETS              │
│  • Full-text search      │  │  • MENTIONS              │
│  • Aggregations          │  │  • Network queries       │
└────────┬─────────────────┘  └─────────┬────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        ▼
          ┌─────────────────────────────┐
          │      Dashboard (UI)         │
          │  ────────────────────────   │
          │  • Search by keyword/time   │
          │  • Display tweets + ML tags │
          │  • Network visualization    │
          │  • Analytics & insights     │
          └─────────────────────────────┘
```

---

## 🔧 Core Components

### 1. Control Layer

#### **Scheduler**
- **Purpose:** Manages periodic crawling tasks
- **Technology:** Node-cron or Bull-based scheduler
- **Responsibilities:**
  - Trigger crawling jobs at specified intervals
  - Manage crawling frequency per platform
  - Handle timezone-aware scheduling
  - Implement backoff strategies during platform outages

**Example Configuration:**
```javascript
// Twitter: Every 5 minutes
schedule('*/5 * * * *', () => queueTwitterCrawl());

// Facebook: Every 15 minutes
schedule('*/15 * * * *', () => queueFacebookCrawl());

// News: Every 30 minutes
schedule('*/30 * * * *', () => queueNewsCrawl());
```

#### **Job Manager**
- **Purpose:** Orchestrates crawling jobs and worker allocation
- **Technology:** Bull job queue with Redis backend
- **Responsibilities:**
  - Queue management (priorities, delays, retries)
  - Worker pool management
  - Job status tracking
  - Failed job handling and retry logic

**Job Priority Levels:**
- **High:** Real-time trending topics
- **Medium:** Regular scheduled crawls
- **Low:** Historical data backfill

#### **API Server**
- **Purpose:** External interface for triggering crawls and retrieving data
- **Technology:** Express.js or Fastify
- **Endpoints:**
  - `POST /crawl/twitter` - Trigger Twitter crawl
  - `POST /crawl/facebook` - Trigger Facebook crawl
  - `POST /crawl/news` - Trigger news crawl
  - `GET /status/:jobId` - Check job status
  - `GET /data` - Query collected data

---

### 2. Message Queue Layer

#### **Redis Queue (Bull)**
- **Purpose:** Distribute crawling jobs to workers
- **Features:**
  - Job persistence (survives crashes)
  - Delayed jobs for rate limiting
  - Job prioritization
  - Automatic retry with exponential backoff
  - Concurrency control

**Queue Configuration:**
```javascript
const crawlQueue = new Queue('crawl-jobs', {
  redis: { host: 'localhost', port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});
```

---

### 3. Crawler Workers

Each platform has dedicated crawler workers optimized for its specific requirements.

#### **Twitter Crawler**
**Technology:** Puppeteer (for web scraping) or Twitter API (if available)

**Features:**
- Search tweets by keywords/hashtags
- User timeline crawling
- Trending topics extraction
- Rate limiting (respect Twitter's limits)

**Data Extracted:**
- Tweet ID, text, timestamp
- User information (username, followers)
- Media attachments (URLs)
- Engagement metrics (likes, retweets)
- Hashtags and mentions

#### **Facebook Crawler**
**Technology:** Puppeteer/Playwright (headless browser automation)

**Features:**
- Public page post scraping
- Group posts (public groups only)
- Comment extraction
- Anti-detection mechanisms (user-agent rotation, delays)

**Data Extracted:**
- Post ID, content, timestamp
- Author information
- Media (images, videos - URLs only)
- Engagement (reactions, comments, shares)

**Challenges & Solutions:**
- **Dynamic Content:** Use headless browser to render JavaScript
- **Login Walls:** Focus on publicly accessible content
- **Rate Limiting:** Implement intelligent delays between requests

#### **News Media Crawler**
**Technology:** Cheerio (for static sites) + Puppeteer (for dynamic sites)

**Target Platforms:**
- Major news outlets (detik.com, kompas.com, tempo.co, etc.)
- Tech news sites
- Industry-specific publications

**Features:**
- Article discovery (homepage, category pages)
- Full article extraction
- Metadata extraction (author, date, category)
- Image scraping

**Data Extracted:**
- Article URL, title, full text
- Publication date and author
- Category/tags
- Featured image
- Related articles

**Extraction Strategy:**
```javascript
// CSS selector-based extraction
const article = {
  title: $('h1.article-title').text(),
  content: $('.article-content').text(),
  author: $('.author-name').text(),
  date: $('.publish-date').attr('datetime'),
  image: $('img.featured').attr('src')
};
```

---

### 4. Data Processing Layer

#### **Extraction Module**
- Parse HTML/JSON responses
- Handle different page structures per platform
- Error handling for malformed data

#### **Normalization Module**
- Standardize date formats (ISO 8601)
- Clean text (remove HTML tags, normalize whitespace)
- URL normalization
- Character encoding fixes

#### **Deduplication Module**
- Content-based hashing (MD5/SHA256 of core content)
- Database check before insertion
- Update existing records if content changed

**Deduplication Strategy:**
```javascript
// Generate content hash
const contentHash = crypto
  .createHash('sha256')
  .update(post.text + post.author + post.url)
  .digest('hex');

// Check if exists
const exists = await db.findOne({ contentHash });
if (!exists) {
  await db.insert({ ...post, contentHash });
}
```

---

### 5. Storage Layer

#### **MongoDB (Primary Database)**
**Collections:**

**`twitter_posts`**
```javascript
{
  _id: ObjectId,
  tweetId: String,
  text: String,
  author: {
    username: String,
    displayName: String,
    followers: Number
  },
  timestamp: Date,
  media: [String],
  engagement: {
    likes: Number,
    retweets: Number,
    replies: Number
  },
  contentHash: String,
  crawledAt: Date
}
```

**`facebook_posts`**
```javascript
{
  _id: ObjectId,
  postId: String,
  content: String,
  author: String,
  timestamp: Date,
  media: [String],
  engagement: {
    reactions: Number,
    comments: Number,
    shares: Number
  },
  contentHash: String,
  crawledAt: Date
}
```

**`news_articles`**
```javascript
{
  _id: ObjectId,
  url: String (unique),
  title: String,
  content: String,
  author: String,
  publishedAt: Date,
  source: String,
  category: String,
  image: String,
  contentHash: String,
  crawledAt: Date
}
```

#### **Redis (Cache & Queue)**
**Use Cases:**
- Job queue storage
- Rate limiting counters
- Session management
- Temporary data cache

---

## 🔄 Data Flow

### End-to-End Processing Pipeline (Twitter Focus)

**Phase 1: Data Collection**

1. **Job Creation**
   - Scheduler triggers crawl OR API receives manual trigger
   - Job added to Bull queue with parameters (keywords, time range, filters)

2. **Crawler Execution**
   - Worker picks job from queue
   - Puppeteer launches headless browser
   - Navigate to Twitter search/timeline
   - Handle anti-detection (user-agent, delays)

3. **Data Extraction**
   - Extract tweet data: ID, text, author, timestamp
   - Extract relationships: replies, retweets, mentions
   - Handle pagination and scrolling
   - Respect rate limits

**Phase 2: ML Processing**

4. **Send to ML API**
   - Format tweet data for ML API
   - POST request to internal ML service
   - Include: tweet ID, text, metadata

```javascript
// Example ML API request
const mlResponse = await axios.post('http://ml-api/analyze', {
  tweet_id: '1234567890',
  text: 'I love Node.js! #nodejs #javascript',
  timestamp: '2023-06-15T10:30:00Z'
});
```

5. **Receive ML Results**
   - Sentiment score (e.g., positive: 0.85, negative: 0.05, neutral: 0.10)
   - Extracted keywords: ['nodejs', 'javascript', 'programming']
   - Entities (optional): technologies, people, organizations

```javascript
// ML API response
{
  tweet_id: '1234567890',
  sentiment: {
    positive: 0.85,
    negative: 0.05,
    neutral: 0.10,
    label: 'positive'
  },
  keywords: ['nodejs', 'javascript', 'programming'],
  entities: [
    { type: 'technology', value: 'Node.js' }
  ]
}
```

6. **Error Handling**
   - Retry failed ML API calls (3 attempts with exponential backoff)
   - Log failures for manual review
   - Continue processing queue (don't block on failures)

**Phase 3: Dual Storage**

7. **Save to Elasticsearch**
   - Index processed tweet with ML results
   - Store: content, sentiment, keywords, metadata, timestamp
   - Enable full-text search and aggregations

```javascript
await elasticsearchClient.index({
  index: 'tweets',
  id: tweet.id,
  body: {
    tweet_id: tweet.id,
    text: tweet.text,
    author: tweet.author,
    timestamp: tweet.timestamp,
    sentiment: mlResult.sentiment,
    keywords: mlResult.keywords,
    hashtags: tweet.hashtags,
    engagement: tweet.engagement
  }
});
```

8. **Save to Neo4j (Graph Relationships)**
   - Create/update User node
   - Create Tweet node
   - Create relationships: TWEETS, REPLIES_TO, RETWEETS, MENTIONS

```cypher
// Neo4j Cypher query
MERGE (u:User {id: $userId, username: $username})
MERGE (t:Tweet {id: $tweetId, text: $text})
MERGE (u)-[:TWEETS {timestamp: $timestamp}]->(t)

// If it's a reply
MATCH (original:Tweet {id: $originalTweetId})
MATCH (reply:Tweet {id: $replyTweetId})
MERGE (reply)-[:REPLIES_TO]->(original)

// If it's a retweet
MATCH (user:User {id: $userId})
MATCH (tweet:Tweet {id: $tweetId})
MERGE (user)-[:RETWEETS {timestamp: $timestamp}]->(tweet)
```

**Phase 4: Completion**

9. **Job Finalization**
   - Mark job as complete
   - Update statistics (processed count, success rate)
   - Cleanup temporary data
   - Trigger next batch if needed

---

## ⚡ Performance Optimizations

### Concurrency
- **Worker Pools:** Multiple workers process jobs in parallel
- **Batch Processing:** Group similar requests together
- **Connection Pooling:** Reuse database connections

### Caching
- **DNS Caching:** Reduce DNS lookup time
- **Response Caching:** Cache static resources
- **Query Results:** Cache frequent database queries in Redis

### Resource Management
- **Memory:** Stream processing for large responses
- **CPU:** Distribute parsing across workers
- **Network:** Request throttling and batching

---

## 🔐 Security Considerations

- **Credential Management:** Environment variables for API keys
- **Rate Limiting:** Respect platform ToS
- **Data Privacy:** Only collect publicly available data
- **Error Handling:** Don't expose internal errors externally

---

## 📊 Scalability Strategy

### Horizontal Scaling
- Add more worker instances
- Distributed Redis for queue
- MongoDB sharding for large datasets

### Vertical Scaling
- Increase worker concurrency
- Optimize database queries
- Increase memory for larger batches

---

*See [04-database-design.md](./04-database-design.md) for detailed database schema and optimization strategies.*
