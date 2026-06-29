# Database Design - Social & News Media Crawler Engine

## 🗄️ Database Overview

The crawler system uses a **dual-database architecture** combining Elasticsearch for full-text search and analytics, and Neo4j for relationship graph modeling, with Redis for job queue management.

### Technology Stack
- **Search Engine:** Elasticsearch 8.0+ (Full-text search, analytics)
- **Graph Database:** Neo4j 5.0+ (Relationship modeling, network analysis)
- **Queue & Cache:** Redis 6.0+ (Job queue, rate limiting, caching)

### Design Principles
- **Search-First:** Elasticsearch optimized for keyword search and time-range queries
- **Relationship-Centric:** Neo4j models user interactions as graph (tweets, replies, retweets, mentions)
- **ML Integration:** Store ML-processed data (sentiment, keywords) for rich analytics
- **High Write Throughput:** Bulk indexing for thousands of tweets per hour
- **Query Performance:** Sub-second response for search and graph traversal

---

## 🔍 Elasticsearch Schema Design

### Index: `tweets`

**Purpose:** Store processed tweets with ML results for full-text search and analytics

**Index Mapping:**
```json
{
  "mappings": {
    "properties": {
      "tweet_id": {
        "type": "keyword"
      },
      "text": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "author": {
        "properties": {
          "user_id": { "type": "keyword" },
          "username": { "type": "keyword" },
          "display_name": {
            "type": "text",
            "fields": { "keyword": { "type": "keyword" } }
          },
          "verified": { "type": "boolean" },
          "followers": { "type": "integer" },
          "following": { "type": "integer" }
        }
      },
      "timestamp": {
        "type": "date",
        "format": "strict_date_optional_time"
      },
      "crawled_at": {
        "type": "date"
      },
      "sentiment": {
        "properties": {
          "label": { "type": "keyword" },
          "positive": { "type": "float" },
          "negative": { "type": "float" },
          "neutral": { "type": "float" }
        }
      },
      "keywords": {
        "type": "keyword"
      },
      "entities": {
        "type": "nested",
        "properties": {
          "type": { "type": "keyword" },
          "value": { "type": "keyword" }
        }
      },
      "hashtags": {
        "type": "keyword"
      },
      "mentions": {
        "type": "keyword"
      },
      "urls": {
        "type": "keyword"
      },
      "engagement": {
        "properties": {
          "likes": { "type": "integer" },
          "retweets": { "type": "integer" },
          "replies": { "type": "integer" },
          "views": { "type": "integer" }
        }
      },
      "language": {
        "type": "keyword"
      },
      "source": {
        "type": "keyword"
      }
    }
  }
}
```

**Example Document:**
```json
{
  "tweet_id": "1234567890123456789",
  "text": "I love building scalable systems with Node.js! #nodejs #javascript",
  "author": {
    "user_id": "987654321",
    "username": "developer123",
    "display_name": "John Developer",
    "verified": false,
    "followers": 5000,
    "following": 1200
  },
  "timestamp": "2023-06-15T10:30:00Z",
  "crawled_at": "2023-06-15T10:35:00Z",
  "sentiment": {
    "label": "positive",
    "positive": 0.85,
    "negative": 0.05,
    "neutral": 0.10
  },
  "keywords": ["nodejs", "javascript", "scalable", "systems"],
  "entities": [
    { "type": "technology", "value": "Node.js" }
  ],
  "hashtags": ["nodejs", "javascript"],
  "mentions": [],
  "urls": [],
  "engagement": {
    "likes": 250,
    "retweets": 75,
    "replies": 12,
    "views": 3500
  },
  "language": "en",
  "source": "search"
}
```

### Common Query Patterns

**1. Search by Keyword + Time Range**
```json
GET /tweets/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "text": "nodejs"
          }
        },
        {
          "range": {
            "timestamp": {
              "gte": "2023-01-01",
              "lte": "2023-12-31"
            }
          }
        }
      ]
    }
  },
  "sort": [
    { "timestamp": "desc" }
  ],
  "size": 100
}
```

**2. Sentiment Aggregation**
```json
GET /tweets/_search
{
  "size": 0,
  "query": {
    "match": { "text": "nodejs" }
  },
  "aggs": {
    "sentiment_distribution": {
      "terms": {
        "field": "sentiment.label"
      }
    }
  }
}
```

**3. Top Keywords**
```json
GET /tweets/_search
{
  "size": 0,
  "aggs": {
    "popular_keywords": {
      "terms": {
        "field": "keywords",
        "size": 20
      }
    }
  }
}
```

---

## 🕸️ Neo4j Graph Model

### Node Types

**1. User Node**
```cypher
CREATE (u:User {
  id: '987654321',
  username: 'developer123',
  display_name: 'John Developer',
  verified: false,
  followers: 5000,
  following: 1200
})
```

**2. Tweet Node**
```cypher
CREATE (t:Tweet {
  id: '1234567890123456789',
  text: 'I love Node.js! #nodejs',
  timestamp: datetime('2023-06-15T10:30:00Z'),
  likes: 250,
  retweets: 75,
  replies: 12
})
```

**3. Hashtag Node (Optional)**
```cypher
CREATE (h:Hashtag {
  tag: 'nodejs',
  count: 15000
})
```

### Relationship Types

**1. TWEETS Relationship**
```cypher
// User creates a tweet
MATCH (u:User {id: '987654321'})
MATCH (t:Tweet {id: '1234567890123456789'})
MERGE (u)-[:TWEETS {
  timestamp: datetime('2023-06-15T10:30:00Z')
}]->(t)
```

**2. REPLIES_TO Relationship**
```cypher
// Tweet A is a reply to Tweet B
MATCH (reply:Tweet {id: '111111'})
MATCH (original:Tweet {id: '222222'})
MERGE (reply)-[:REPLIES_TO {
  timestamp: datetime('2023-06-15T10:35:00Z')
}]->(original)
```

**3. RETWEETS Relationship**
```cypher
// User retweets a tweet
MATCH (u:User {id: '333333'})
MATCH (t:Tweet {id: '444444'})
MERGE (u)-[:RETWEETS {
  timestamp: datetime('2023-06-15T11:00:00Z')
}]->(t)
```

**4. MENTIONS Relationship**
```cypher
// Tweet mentions a user
MATCH (t:Tweet {id: '555555'})
MATCH (u:User {id: '666666'})
MERGE (t)-[:MENTIONS]->(u)
```

**5. HAS_HASHTAG Relationship (Optional)**
```cypher
// Tweet contains hashtag
MATCH (t:Tweet {id: '777777'})
MATCH (h:Hashtag {tag: 'nodejs'})
MERGE (t)-[:HAS_HASHTAG]->(h)
```

### Graph Visualization Use Cases

**1. Find All Replies to a Tweet**
```cypher
// Find all direct replies to a specific tweet
MATCH (reply:Tweet)-[:REPLIES_TO]->(original:Tweet {id: '1234567890'})
MATCH (user:User)-[:TWEETS]->(reply)
RETURN reply, user
ORDER BY reply.timestamp DESC
LIMIT 50
```

**2. Retweet Chain Analysis**
```cypher
// Find who retweeted a tweet and their follower counts
MATCH (user:User)-[r:RETWEETS]->(tweet:Tweet {id: '1234567890'})
RETURN user.username, user.followers, r.timestamp
ORDER BY user.followers DESC
LIMIT 20
```

**3. Conversation Thread Visualization**
```cypher
// Get full conversation tree (replies to replies)
MATCH path = (original:Tweet {id: '1234567890'})<-[:REPLIES_TO*1..3]-(reply:Tweet)
MATCH (user:User)-[:TWEETS]->(reply)
RETURN path, user
```

**4. Influential Users in a Topic**
```cypher
// Find users who tweet about a topic and have many retweets
MATCH (u:User)-[:TWEETS]->(t:Tweet)
WHERE t.text CONTAINS 'nodejs'
WITH u, COUNT(t) as tweet_count
MATCH (u)-[:TWEETS]->(t2:Tweet)<-[r:RETWEETS]-(retweeter:User)
RETURN u.username, u.followers, tweet_count, COUNT(r) as total_retweets
ORDER BY total_retweets DESC
LIMIT 10
```

**5. Network Graph for Dashboard**
```cypher
// Get network for keyword + timerange (for visualization)
MATCH (u:User)-[:TWEETS]->(t:Tweet)
WHERE t.text CONTAINS $keyword
  AND t.timestamp >= datetime($startDate)
  AND t.timestamp <= datetime($endDate)
OPTIONAL MATCH (t)<-[:REPLIES_TO]-(reply:Tweet)<-[:TWEETS]-(replier:User)
OPTIONAL MATCH (t)<-[:RETWEETS]-(retweeter:User)
OPTIONAL MATCH (t)-[:MENTIONS]->(mentioned:User)
RETURN u, t, reply, replier, retweeter, mentioned
LIMIT 500
```

---

## 🔴 Redis Data Structures (Queue & Cache)

### 1. Job Queue (using Bull)

```
Queue: crawl-jobs
- Stores pending crawl jobs
- Supports priority, delay, retry
- Automatic cleanup of completed jobs
```

### 2. Rate Limiting

```redis
# Key format: ratelimit:twitter:2023-06-15:10
# Type: String (counter)
# TTL: 3600 seconds (1 hour)

INCR ratelimit:twitter:2023-06-15:10
EXPIRE ratelimit:twitter:2023-06-15:10 3600
```

### 3. Content Hash Cache

```redis
# Key format: hash:twitter:{contentHash}
# Type: String (tweetId)
# TTL: 86400 seconds (24 hours)

SET hash:twitter:a1b2c3... "1234567890123456789" EX 86400
```

### 4. Session Management

```redis
# Key format: session:{crawlerId}
# Type: Hash
# Stores cookies, tokens for authenticated crawling

HSET session:twitter_crawler_1 cookies "cookie_value"
HSET session:twitter_crawler_1 token "auth_token"
```

---

## 🔗 Database Integration Pattern

### Dashboard Query Flow

When user searches for keyword + time range:

**Step 1: Query Elasticsearch**
```javascript
// Get matching tweets with ML results
const esResponse = await esClient.search({
  index: 'tweets',
  body: {
    query: {
      bool: {
        must: [
          { match: { text: keyword } },
          { range: { timestamp: { gte: startDate, lte: endDate } } }
        ]
      }
    },
    size: 500
  }
});

// Extract tweet IDs
const tweetIds = esResponse.hits.hits.map(hit => hit._source.tweet_id);
```

**Step 2: Query Neo4j for Relationships**
```cypher
// Get network graph for these tweets
MATCH (u:User)-[:TWEETS]->(t:Tweet)
WHERE t.id IN $tweetIds
OPTIONAL MATCH (t)<-[:REPLIES_TO]-(reply:Tweet)<-[:TWEETS]-(replier:User)
OPTIONAL MATCH (t)<-[:RETWEETS]-(retweeter:User)
OPTIONAL MATCH (t)-[:MENTIONS]->(mentioned:User)
RETURN u, t, reply, replier, retweeter, mentioned
```

**Step 3: Combine Results**
```javascript
// Merge ES data (content + ML) with Neo4j data (relationships)
const combinedData = {
  tweets: esResponse.hits.hits.map(hit => hit._source),
  network: neo4jResponse.records.map(record => ({
    nodes: extractNodes(record),
    relationships: extractRelationships(record)
  }))
};

// Send to dashboard for visualization
return combinedData;
```

---

## ⚡ Performance Optimization Strategies

### 1. Elasticsearch Bulk Indexing

```javascript
// Bulk index for better performance
const body = processedTweets.flatMap(tweet => [
  { index: { _index: 'tweets', _id: tweet.tweet_id } },
  tweet
]);

await esClient.bulk({ body });
```

### 2. Neo4j Batch Import

```cypher
// Use UNWIND for batch node/relationship creation
UNWIND $tweets AS tweet
MERGE (u:User {id: tweet.author.user_id})
SET u.username = tweet.author.username,
    u.display_name = tweet.author.display_name,
    u.followers = tweet.author.followers
MERGE (t:Tweet {id: tweet.tweet_id})
SET t.text = tweet.text,
    t.timestamp = datetime(tweet.timestamp)
MERGE (u)-[:TWEETS]->(t)
```

### 3. Redis Caching Layer

```javascript
// Cache frequently accessed data
const cacheKey = `search:${keyword}:${startDate}:${endDate}`;

// Check cache first
let results = await redis.get(cacheKey);

if (!results) {
  // Query databases
  results = await searchElasticsearch(keyword, startDate, endDate);

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(results));
}

return JSON.parse(results);
```

### 4. Neo4j Index Optimization

```cypher
// Create indexes on frequently queried properties
CREATE INDEX user_id_index FOR (u:User) ON (u.id);
CREATE INDEX tweet_id_index FOR (t:Tweet) ON (t.id);
CREATE INDEX tweet_timestamp_index FOR (t:Tweet) ON (t.timestamp);

// Composite index for complex queries
CREATE INDEX user_tweet_index FOR (u:User) ON (u.id, u.followers);
```

### 5. Elasticsearch Index Settings

```json
PUT /tweets
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s",
    "index": {
      "max_result_window": 10000
    }
  }
}
```

---

## 📊 Summary

This database design demonstrates a **sophisticated dual-database architecture**:

- **Elasticsearch** provides powerful full-text search and analytics capabilities for tweet content and ML results
- **Neo4j** models complex relationship networks enabling graph-based visualization and social network analysis
- **Redis** serves as high-performance queue and cache layer
- **Integration pattern** efficiently combines search results with relationship data for rich dashboard experience

### SKKNI Competency Demonstration

This design showcases:
- ✅ **J.620100.016.02** - Advanced database design with appropriate technology selection
- ✅ **J.620100.017.02** - Complex database integration with multiple data stores
- ✅ Advanced understanding of search engines, graph databases, and caching strategies
- ✅ Performance optimization techniques for high-throughput data processing

---

*This database design is part of the SKKNI Senior Programmer certification portfolio.*
