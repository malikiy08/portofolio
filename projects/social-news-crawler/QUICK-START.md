# Quick Start Guide - Social & News Media Crawler

> For SKKNI Assessors and Technical Reviewers

---

## 🎯 What This Project Demonstrates

This project showcases **SKKNI Senior Programmer** competencies through a real-world implementation of an intelligent social media crawler with ML integration and dual-database architecture.

### Key Technical Achievements
- ✅ **Elasticsearch** integration for full-text search
- ✅ **Neo4j** graph database for relationship modeling
- ✅ **ML API** integration for sentiment analysis
- ✅ **Puppeteer** web scraping with anti-detection
- ✅ **Production-grade** code architecture

---

## 📖 Documentation Structure

### For Quick Assessment (30 minutes)
1. **[01-overview.md](./01-overview.md)** - Project goals and capabilities
2. **[02-architecture.md](./02-architecture.md)** - System design and data flow
3. **[src/README.md](./src/README.md)** - Source code overview

### For Deep Technical Review (2-3 hours)
4. **[04-database-design.md](./04-database-design.md)** - Elasticsearch + Neo4j schemas
5. **[05-security.md](./05-security.md)** - Security implementations
6. **[06-testing.md](./06-testing.md)** - Testing strategy
7. **[07-lessons-learned.md](./07-lessons-learned.md)** - Technical insights

### Source Code (Production Quality)
- **[src/](./src/)** - Full implementation with SKKNI comments

---

## 🚀 Running the Code

### Prerequisites
```bash
# Required
- Node.js 16+
- Elasticsearch 8.0+
- Neo4j 5.0+
- Redis 6.0+ (optional, for queue)
```

### Quick Setup
```bash
cd projects/social-news-crawler

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Start server
npm run dev
```

### View API Documentation (Swagger)

Open your browser and go to:
```
http://localhost:3000/api-docs
```

**Interactive Swagger UI** will show:
- ✅ All API endpoints with request/response examples
- ✅ Try it out functionality
- ✅ Schema definitions
- ✅ OpenAPI/Swagger specification

### Test the API

**Option 1: Via Swagger UI (Recommended)**
1. Open `http://localhost:3000/api-docs`
2. Click POST `/crawl`
3. Click "Try it out"
4. Click "Execute"

**Option 2: Via cURL**
```bash
curl -X POST http://localhost:3000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"keyword": "nodejs", "limit": 10}'

# Response
{
  "success": true,
  "message": "Crawl completed successfully",
  "data": {
    "total": 10,
    "processed": 10,
    "failed": 0
  }
}
```

---

## 📊 SKKNI Competency Mapping

| Code | Competency | Evidence File | Key Code |
|------|------------|---------------|----------|
| **J.620100.013.02** | Arsitektur Aplikasi | 02-architecture.md | src/services/crawlService.js |
| **J.620100.016.02** | Desain Basis Data | 04-database-design.md | src/database/* |
| **J.620100.017.02** | Integrasi Basis Data | 04-database-design.md | src/services/crawlService.js:74-150 |
| **J.620100.022.01** | Keamanan SI | 05-security.md | src/routes/crawl.js:20-35 |
| **J.620100.024.01** | Pengujian | 06-testing.md | 06-testing.md |
| **J.620100.009.02** | Algoritma | 07-lessons-learned.md | src/crawlers/twitterCrawler.js |

---

## 💡 Understanding the Architecture

### Data Pipeline (High Level)
```
Twitter → Scraper → ML API → Elasticsearch + Neo4j → Dashboard
```

### Key Files to Review

**1. Main Orchestrator**
- File: `src/services/crawlService.js`
- Shows: Complete pipeline orchestration, error handling, database integration

**2. Database Integration**
- File: `src/database/elasticsearch.js` - Search engine client
- File: `src/database/neo4j.js` - Graph database client
- Shows: Dual-database architecture implementation

**3. ML Integration**
- File: `src/services/mlService.js`
- Shows: External API integration with fallback handling

**4. Web Scraping**
- File: `src/crawlers/twitterCrawler.js`
- Shows: Puppeteer implementation with rate limiting

---

## 🔍 Code Quality Highlights

### Separation of Concerns
```
routes/     → API endpoints (interface layer)
services/   → Business logic (service layer)
database/   → Data access (persistence layer)
crawlers/   → Data collection (extraction layer)
```

### Async/Await Pattern
Every function properly uses `async/await` with comprehensive try-catch error handling.

### SKKNI Comments
Look for comments starting with `SKKNI:` in the code - they explain how each section demonstrates specific competencies.

---

## 📝 Note for Assessors

### This is a Skeleton/Boilerplate Implementation
- **Twitter Crawler:** Uses mock data (real implementation requires Twitter API access)
- **ML Service:** Mock sentiment analysis (production connects to actual ML API)
- **Purpose:** Demonstrate architecture, database integration, and coding standards

### What IS Real
- ✅ Complete project structure
- ✅ Database client implementations (Elasticsearch & Neo4j)
- ✅ Service layer architecture
- ✅ Error handling patterns
- ✅ Configuration management
- ✅ Logging infrastructure

### Production Considerations
The documentation (04-database-design.md, 05-security.md) describes how the production version would be enhanced with:
- Actual Twitter API integration
- Real ML service connection
- Job queue system (Bull + Redis)
- Authentication/authorization
- Comprehensive testing

---

## 📞 Contact

**Muhammad Yusuf Malik**  
Senior Backend Engineer  
GitHub: [@malikiy08](https://github.com/malikiy08)

---

*This project is part of the SKKNI Senior Programmer certification portfolio.*
