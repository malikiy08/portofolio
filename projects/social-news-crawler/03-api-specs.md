# API Specifications - Social & News Media Crawler Engine

## 📡 API Overview

The crawler system exposes a RESTful API for triggering crawls, monitoring job status, and querying collected data.

**Base URL:** `http://localhost:3000/api/v1`
**Authentication:** API Key (Header: `X-API-Key`)
**Content-Type:** `application/json`

### 📚 Interactive API Documentation

**Swagger/OpenAPI:** `http://localhost:3000/api-docs`

The API is fully documented using **OpenAPI 3.0** specification with interactive Swagger UI:
- ✅ Try out endpoints directly from browser
- ✅ View request/response schemas
- ✅ See example requests and responses
- ✅ Download OpenAPI specification (JSON/YAML)

**OpenAPI Spec File:** `swagger.yaml` (root of project)

---

## 🎯 SKKNI Competency Demonstration

This API documentation demonstrates:
- **J.620100.013.02** - RESTful API architecture design
- **J.620100.014.02** - API documentation using OpenAPI/Swagger standard
- **J.620100.022.01** - Input validation and security headers

---

## 🔐 Authentication

All API requests require an API key in the request header:

```http
X-API-Key: your-api-key-here
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

---

## 🚀 Crawler Endpoints

### 1. Trigger Twitter Crawl

**Endpoint:** `POST /crawl/twitter`

**Description:** Initiates a Twitter crawling job for specific keywords or user timelines.

**Request Body:**
```json
{
  "type": "search",
  "query": "#nodejs OR #javascript",
  "maxResults": 100,
  "filters": {
    "language": "id",
    "since": "2023-01-01",
    "until": "2023-12-31"
  }
}
```

**Alternative - User Timeline:**
```json
{
  "type": "timeline",
  "username": "nodejs",
  "maxResults": 50
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "jobId": "twitter_1234567890",
  "status": "queued",
  "estimatedTime": "2-5 minutes",
  "message": "Twitter crawl job queued successfully"
}
```

---

### 2. Trigger Facebook Crawl

**Endpoint:** `POST /crawl/facebook`

**Description:** Initiates a Facebook page/group crawling job.

**Request Body:**
```json
{
  "type": "page",
  "target": "TechCrunch",
  "maxPosts": 50,
  "includeComments": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "jobId": "facebook_9876543210",
  "status": "queued",
  "estimatedTime": "5-10 minutes",
  "message": "Facebook crawl job queued successfully"
}
```

---

### 3. Trigger News Crawl

**Endpoint:** `POST /crawl/news`

**Description:** Initiates a news article crawling job from specified sources.

**Request Body:**
```json
{
  "sources": ["kompas.com", "detik.com", "tempo.co"],
  "categories": ["teknologi", "bisnis"],
  "maxArticles": 100,
  "dateRange": {
    "from": "2023-01-01",
    "to": "2023-12-31"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "jobId": "news_5555555555",
  "status": "queued",
  "estimatedTime": "10-20 minutes",
  "sources": 3,
  "message": "News crawl job queued successfully"
}
```

---

## 📊 Job Management Endpoints

### 4. Get Job Status

**Endpoint:** `GET /jobs/:jobId/status`

**Description:** Retrieve the current status of a crawling job.

**Response (200 OK) - In Progress:**
```json
{
  "jobId": "twitter_1234567890",
  "status": "processing",
  "progress": {
    "current": 45,
    "total": 100,
    "percentage": 45
  },
  "startedAt": "2023-06-15T10:30:00Z",
  "estimatedCompletion": "2023-06-15T10:35:00Z"
}
```

**Response (200 OK) - Completed:**
```json
{
  "jobId": "twitter_1234567890",
  "status": "completed",
  "results": {
    "totalProcessed": 100,
    "successful": 98,
    "failed": 2,
    "duplicates": 15
  },
  "startedAt": "2023-06-15T10:30:00Z",
  "completedAt": "2023-06-15T10:34:22Z",
  "duration": "4m 22s"
}
```

**Response (200 OK) - Failed:**
```json
{
  "jobId": "twitter_1234567890",
  "status": "failed",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Twitter API rate limit exceeded",
    "retryAfter": "2023-06-15T11:00:00Z"
  },
  "startedAt": "2023-06-15T10:30:00Z",
  "failedAt": "2023-06-15T10:32:15Z"
}
```

---

### 5. List All Jobs

**Endpoint:** `GET /jobs`

**Description:** List all crawling jobs with optional filters.

**Query Parameters:**
- `status` (optional): `queued`, `processing`, `completed`, `failed`
- `platform` (optional): `twitter`, `facebook`, `news`
- `limit` (optional): Number of results (default: 50, max: 200)
- `page` (optional): Page number (default: 1)

**Example Request:**
```
GET /jobs?status=completed&platform=twitter&limit=20&page=1
```

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "jobId": "twitter_1234567890",
      "platform": "twitter",
      "status": "completed",
      "createdAt": "2023-06-15T10:30:00Z",
      "completedAt": "2023-06-15T10:34:22Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalJobs": 100,
    "limit": 20
  }
}
```

---

## 📥 Data Query Endpoints

### 6. Query Twitter Data

**Endpoint:** `GET /data/twitter`

**Description:** Query collected Twitter data.

**Query Parameters:**
- `keyword` (optional): Search in tweet text
- `author` (optional): Filter by username
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)
- `minEngagement` (optional): Minimum likes + retweets
- `limit` (optional): Number of results (default: 50)
- `sort` (optional): `date_desc`, `date_asc`, `engagement_desc`

**Example Request:**
```
GET /data/twitter?keyword=nodejs&from=2023-01-01&limit=10&sort=engagement_desc
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "tweetId": "1234567890",
      "text": "Just released a new Node.js package! #nodejs",
      "author": {
        "username": "developer123",
        "displayName": "John Developer"
      },
      "timestamp": "2023-06-15T10:30:00Z",
      "engagement": {
        "likes": 250,
        "retweets": 75,
        "replies": 12
      },
      "url": "https://twitter.com/developer123/status/1234567890"
    }
  ],
  "total": 1543,
  "page": 1,
  "limit": 10
}
```

---

### 7. Query Facebook Data

**Endpoint:** `GET /data/facebook`

**Query Parameters:** Similar to Twitter endpoint

**Response:** Similar structure to Twitter data endpoint

---

### 8. Query News Data

**Endpoint:** `GET /data/news`

**Description:** Query collected news articles.

**Query Parameters:**
- `keyword` (optional): Search in title/content
- `source` (optional): Filter by news source
- `category` (optional): Filter by category
- `from` (optional): Publication date start
- `to` (optional): Publication date end
- `limit` (optional): Number of results

**Example Request:**
```
GET /data/news?source=kompas.com&category=teknologi&limit=5
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "url": "https://kompas.com/tech/article-123",
      "title": "Tren Teknologi AI di 2023",
      "content": "Artificial Intelligence terus berkembang...",
      "author": "Tech Reporter",
      "publishedAt": "2023-06-15T08:00:00Z",
      "source": "kompas.com",
      "category": "teknologi",
      "image": "https://kompas.com/images/article-123.jpg"
    }
  ],
  "total": 234,
  "page": 1,
  "limit": 5
}
```

---

## 📈 Statistics Endpoints

### 9. Get Crawler Statistics

**Endpoint:** `GET /stats`

**Description:** Get overall crawler performance statistics.

**Response (200 OK):**
```json
{
  "twitter": {
    "totalCrawled": 150000,
    "last24h": 3500,
    "avgPerHour": 145,
    "successRate": 98.5
  },
  "facebook": {
    "totalCrawled": 85000,
    "last24h": 2100,
    "avgPerHour": 87,
    "successRate": 96.2
  },
  "news": {
    "totalArticles": 45000,
    "last24h": 1200,
    "avgPerHour": 50,
    "successRate": 99.1
  },
  "system": {
    "activeJobs": 5,
    "queuedJobs": 12,
    "uptime": "15d 7h 23m"
  }
}
```

---

## ⚠️ Error Responses

### Standard Error Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Malformed request body |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 404 | `JOB_NOT_FOUND` | Job ID does not exist |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Crawler service down |

---

## 🔄 Rate Limiting

API requests are rate-limited to prevent abuse:

- **Standard tier:** 100 requests per hour
- **Premium tier:** 1000 requests per hour

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1686825600
```

---

## 📝 Example Usage

### cURL Example

```bash
# Trigger Twitter crawl
curl -X POST http://localhost:3000/api/v1/crawl/twitter \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "search",
    "query": "#nodejs",
    "maxResults": 100
  }'

# Check job status
curl http://localhost:3000/api/v1/jobs/twitter_1234567890/status \
  -H "X-API-Key: your-api-key"
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

const API_KEY = 'your-api-key';
const BASE_URL = 'http://localhost:3000/api/v1';

async function triggerTwitterCrawl() {
  const response = await axios.post(
    `${BASE_URL}/crawl/twitter`,
    {
      type: 'search',
      query: '#nodejs',
      maxResults: 100
    },
    {
      headers: { 'X-API-Key': API_KEY }
    }
  );
  
  return response.data.jobId;
}
```

---

*This API specification is part of the SKKNI Senior Programmer certification portfolio.*
