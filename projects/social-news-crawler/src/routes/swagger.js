/**
 * Swagger/OpenAPI Documentation Route
 * 
 * SKKNI Competency: J.620100.014.02 - Membuat Dokumen Arsitektur
 * Demonstrates API documentation using OpenAPI/Swagger specification
 */

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const router = express.Router();

// Load Swagger YAML file
const swaggerDocument = YAML.load(path.join(__dirname, '../../swagger.yaml'));

// Swagger UI options
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Social Crawler API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    }
  }
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Serve raw OpenAPI JSON
router.get('/json', (req, res) => {
  res.json(swaggerDocument);
});

module.exports = router;
