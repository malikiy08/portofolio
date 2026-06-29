# Security Implementation - Social & News Media Crawler Engine

## 🔒 Security Overview

Security is a critical aspect of the crawler system, covering data protection, authentication, authorization, and compliance with platform terms of service.

### Security Principles
- **Least Privilege:** Components have minimal required permissions
- **Defense in Depth:** Multiple layers of security controls
- **Data Privacy:** Collect only publicly available data
- **Secure by Default:** Security features enabled out-of-the-box
- **Compliance:** Respect robots.txt and platform ToS

---

## 🛡️ Authentication & Authorization

### 1. API Authentication

**API Key-Based Authentication**

```javascript
// Middleware for API key validation
const authenticateAPIKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'API key is required'
    });
  }
  
  // Validate API key (check against database or environment)
  const isValid = await validateAPIKey(apiKey);
  
  if (!isValid) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid API key'
    });
  }
  
  // Attach user/client info to request
  req.client = await getClientByAPIKey(apiKey);
  next();
};

// Apply to all API routes
app.use('/api', authenticateAPIKey);
```

**API Key Generation & Storage**

```javascript
const crypto = require('crypto');

// Generate secure API key
function generateAPIKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Store hashed version in database
const hashedKey = crypto
  .createHash('sha256')
  .update(apiKey)
  .digest('hex');

await db.collection('api_keys').insertOne({
  keyHash: hashedKey,
  clientId: 'client_123',
  createdAt: new Date(),
  permissions: ['crawl:twitter', 'crawl:facebook', 'data:read']
});
```

### 2. Role-Based Access Control (RBAC)

```javascript
// Permission middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.client.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

// Usage
app.post('/crawl/twitter', 
  requirePermission('crawl:twitter'), 
  triggerTwitterCrawl
);
```

---

## 🔐 Data Protection

### 1. Credential Management

**Environment Variables for Sensitive Data**

```bash
# .env file (never commit to version control)
TWITTER_API_KEY=your_twitter_api_key
FACEBOOK_ACCESS_TOKEN=your_facebook_token
MONGODB_URI=mongodb://user:password@localhost:27017/crawler
REDIS_PASSWORD=your_redis_password
API_SECRET_KEY=your_secret_key_for_jwt
```

**Loading Environment Variables**

```javascript
require('dotenv').config();

const config = {
  twitter: {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET
  },
  mongodb: {
    uri: process.env.MONGODB_URI
  }
};

// Validate required env vars on startup
const requiredEnvVars = [
  'TWITTER_API_KEY',
  'MONGODB_URI',
  'REDIS_PASSWORD'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### 2. Data Encryption

**Encryption at Rest**

```javascript
const crypto = require('crypto');

// Encrypt sensitive data before storing
class EncryptionService {
  constructor(secretKey) {
    this.algorithm = 'aes-256-gcm';
    this.key = crypto.scryptSync(secretKey, 'salt', 32);
  }
  
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage: Store encrypted tokens
const encryption = new EncryptionService(process.env.ENCRYPTION_KEY);
const encryptedToken = encryption.encrypt(userToken);

await db.collection('credentials').insertOne({
  userId: 'user_123',
  token: encryptedToken
});
```

**Encryption in Transit (HTTPS/TLS)**

```javascript
const https = require('https');
const fs = require('fs');

// Load SSL certificates
const options = {
  key: fs.readFileSync('ssl/private-key.pem'),
  cert: fs.readFileSync('ssl/certificate.pem')
};

// Create HTTPS server
https.createServer(options, app).listen(443, () => {
  console.log('HTTPS server running on port 443');
});
```

### 3. Input Validation & Sanitization

```javascript
const { body, query, validationResult } = require('express-validator');

// Validation middleware for crawl requests
const validateCrawlRequest = [
  body('query')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .escape(),
  
  body('maxResults')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .toInt(),
  
  body('filters.language')
    .optional()
    .isIn(['en', 'id', 'es', 'fr']),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        details: errors.array()
      });
    }
    next();
  }
];

app.post('/crawl/twitter', validateCrawlRequest, triggerTwitterCrawl);
```

---

## 🚦 Rate Limiting & DDoS Protection

### 1. API Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all API routes
app.use('/api', globalLimiter);

// Endpoint-specific rate limiter
const crawlLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 crawl jobs per hour
  keyGenerator: (req) => req.client.id, // Per client, not per IP
});

app.post('/crawl/*', crawlLimiter);
```

### 2. Platform-Specific Rate Limiting

```javascript
// Twitter rate limit handling
class TwitterRateLimiter {
  constructor(redis) {
    this.redis = redis;
    this.limits = {
      search: { requests: 450, window: 15 * 60 * 1000 }, // 450 per 15 min
      timeline: { requests: 900, window: 15 * 60 * 1000 }
    };
  }
  
  async checkLimit(endpoint) {
    const key = `ratelimit:twitter:${endpoint}:${Date.now()}`;
    const current = await this.redis.get(key) || 0;
    
    if (current >= this.limits[endpoint].requests) {
      const ttl = await this.redis.ttl(key);
      throw new Error(`Rate limit exceeded. Retry after ${ttl} seconds`);
    }
    
    await this.redis.incr(key);
    await this.redis.expire(key, this.limits[endpoint].window / 1000);
  }
  
  async waitIfNeeded(endpoint) {
    try {
      await this.checkLimit(endpoint);
    } catch (error) {
      // Exponential backoff
      await this.delay(Math.min(60000, Math.pow(2, retryCount) * 1000));
      await this.checkLimit(endpoint);
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🕵️ Anti-Detection & Evasion (Ethical Use Only)

### 1. User-Agent Rotation

```javascript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Use in Puppeteer
await page.setUserAgent(getRandomUserAgent());
```

### 2. Request Timing Randomization

```javascript
// Add random delays between requests
function randomDelay(min = 1000, max = 5000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Usage
for (const url of urls) {
  await crawlPage(url);
  await randomDelay(2000, 5000); // 2-5 seconds between requests
}
```

---

## 🔍 Security Monitoring & Logging

### 1. Structured Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log security events
logger.warn('Failed authentication attempt', {
  ip: req.ip,
  apiKey: req.headers['x-api-key']?.substring(0, 8) + '...',
  timestamp: new Date()
});
```

### 2. Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet()); // Applies multiple security headers

// Custom security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
```

---

## ⚠️ Vulnerability Prevention

### 1. NoSQL Injection Prevention

```javascript
// Bad: Direct use of user input
const query = { username: req.body.username };

// Good: Sanitize input
const sanitize = require('mongo-sanitize');
const query = { username: sanitize(req.body.username) };
```

### 2. Dependency Vulnerability Scanning

```bash
# Regular dependency audits
npm audit

# Fix vulnerabilities
npm audit fix

# Use Snyk for continuous monitoring
npx snyk test
```

---

## 📋 Compliance & Ethical Considerations

### 1. Robots.txt Compliance

```javascript
const robotsParser = require('robots-parser');

async function canCrawl(url) {
  const robotsUrl = new URL('/robots.txt', url).href;
  const robotsTxt = await fetch(robotsUrl).then(r => r.text());
  const robots = robotsParser(robotsUrl, robotsTxt);
  
  return robots.isAllowed(url, 'CustomCrawlerBot');
}

// Check before crawling
if (await canCrawl(targetUrl)) {
  await crawlPage(targetUrl);
}
```

### 2. Data Privacy

- **Collect Only Public Data:** No scraping of private/protected content
- **Respect User Privacy:** Anonymize personal identifiers when possible
- **Data Retention Policy:** Delete old data after retention period
- **GDPR Compliance:** Allow data deletion requests

---

*This security implementation demonstrates SKKNI competency unit J.620100.022.01 (Implementing Information System Security).*
