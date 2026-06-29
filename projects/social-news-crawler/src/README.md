# Social & News Media Crawler - Source Code

> **SKKNI Senior Programmer Certification Portfolio**  
> **Author:** Muhammad Yusuf Malik

This directory contains the production-grade source code implementation demonstrating competency in software architecture, database integration, and algorithm implementation.

---

## 📁 Project Structure

```
src/
├── config/
│   ├── index.js              # Centralized configuration
│   └── logger.js             # Winston logger setup
├── crawlers/
│   └── twitterCrawler.js     # Puppeteer-based Twitter scraper
├── services/
│   ├── crawlService.js       # Main orchestration service
│   └── mlService.js          # ML API integration (mock)
├── database/
│   ├── elasticsearch.js      # Elasticsearch client
│   └── neo4j.js              # Neo4j graph database client
├── routes/
│   └── crawl.js              # API route handlers
└── index.js                  # Application entry point
```

---

## 🎯 SKKNI Competency Demonstration

### J.620100.013.02 - Merancang Arsitektur Aplikasi
**Evidence:**
- Clean separation of concerns (routes, services, database, crawlers)
- Service layer pattern implementation
- Microservices-inspired architecture
- See: `src/services/crawlService.js`

### J.620100.016.02 - Merancang Basis Data
**Evidence:**
- Elasticsearch index mapping design
- Neo4j graph model with constraints
- See: `src/database/elasticsearch.js`, `src/database/neo4j.js`

### J.620100.017.02 - Mengintegrasikan Basis Data
**Evidence:**
- Dual-database integration (Elasticsearch + Neo4j)
- Complex relationship modeling
- Transaction handling
- See: `src/services/crawlService.js` (processSingleTweet, saveToNeo4j)

### J.620100.022.01 - Implementasi Keamanan
**Evidence:**
- Input validation with express-validator
- Environment variable management
- Error handling without exposing internals
- See: `src/routes/crawl.js`, `src/config/index.js`

### J.620100.009.02 - Menerapkan Algoritma
**Evidence:**
- Web scraping algorithm with rate limiting
- Data processing pipeline
- Batch processing optimization
- See: `src/crawlers/twitterCrawler.js`, `src/services/mlService.js`

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Elasticsearch 8.0+
- Neo4j 5.0+
- Redis 6.0+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

### Running the Application

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

### API Documentation (Swagger)

Once the server is running, open your browser:

```
http://localhost:3000/api-docs
```

This will show the **interactive Swagger UI** where you can:
- ✅ View all API endpoints
- ✅ See request/response schemas
- ✅ Try out API calls directly from browser
- ✅ Download OpenAPI spec

### Making a Crawl Request

**Option 1: Via Swagger UI**
1. Open `http://localhost:3000/api-docs`
2. Click on `POST /crawl`
3. Click "Try it out"
4. Edit request body and click "Execute"

**Option 2: Via cURL**
```bash
curl -X POST http://localhost:3000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "nodejs",
    "limit": 10
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Crawl completed successfully",
  "data": {
    "total": 10,
    "processed": 10,
    "failed": 0,
    "keyword": "nodejs",
    "timestamp": "2023-06-15T10:30:00.000Z"
  }
}
```

---

## 🔧 Configuration

All configuration is managed through environment variables (`.env` file):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `ELASTICSEARCH_NODE` | Elasticsearch URL | http://localhost:9200 |
| `NEO4J_URI` | Neo4j connection URI | bolt://localhost:7687 |
| `ML_API_URL` | ML API endpoint | http://localhost:5000/api/analyze |

See `.env.example` for complete list.

---

## 📊 Data Flow

```
1. API Request (POST /api/v1/crawl)
          ↓
2. Twitter Crawler (Puppeteer)
   - Scrape tweets
   - Extract: text, author, interactions
          ↓
3. ML Service (Internal API)
   - Sentiment analysis
   - Keyword extraction
          ↓
4. Dual Storage
   ├─→ Elasticsearch (search & analytics)
   └─→ Neo4j (relationship graph)
          ↓
5. Response (processed count)
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# With coverage
npm test -- --coverage
```

---

## 📝 Code Quality

```bash
# Linting
npm run lint

# Auto-fix
npm run lint -- --fix
```

---

## 🔍 Important Notes

### Mock Implementation
This is a **skeleton/boilerplate** implementation with mock data for demonstration purposes:

- **Twitter Crawler:** Uses mock data instead of actual scraping (real implementation would require Twitter API access)
- **ML Service:** Mock sentiment analysis (production would call actual ML API)

### Production Considerations
For production deployment:

1. Implement actual Twitter API integration
2. Connect to real ML service
3. Add authentication/authorization
4. Implement job queue (Bull/Redis)
5. Add comprehensive error handling
6. Implement monitoring and alerting

---

## 📖 Related Documentation

- [Project Overview](../01-overview.md)
- [Architecture Design](../02-architecture.md)
- [Database Design](../04-database-design.md)
- [Security Implementation](../05-security.md)

---

*This source code is part of the SKKNI Senior Programmer certification portfolio.*
