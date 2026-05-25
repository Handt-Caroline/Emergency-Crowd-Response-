// src/config/swagger.js
//
// Swagger / OpenAPI documentation for the ECRS REST API.
// Serves an interactive API documentation page at /api-docs
//
// Setup: this file defines the OpenAPI spec. Server.js mounts it with
// swagger-ui-express so the docs are browsable in any web browser.

const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ECRS API',
      version: '1.0.0',
      description:
        'Emergency Crowd Response System — REST API. ' +
        'Connects bystanders to the nearest suitable hospital in real time.',
      contact: { name: 'ECRS Team — Group 3, The ICT University' }
    },
    servers: [
      { url: 'https://ecrs-yaounde.duckdns.org', description: 'Production' },
      { url: 'http://localhost:4001', description: 'Local development' }
    ],
    tags: [
      { name: 'Alerts', description: 'Emergency alert creation and lifecycle' },
      { name: 'Auth', description: 'Hospital registration and login' },
      { name: 'Admin', description: 'Administrator operations' },
      { name: 'Institutions', description: 'Public hospital listing' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Alert: {
          type: 'object',
          properties: {
            device_id:      { type: 'string', example: 'device_abc123' },
            emergency_type: { type: 'string', example: 'MEDICAL' },
            situation:      { type: 'string', example: 'CHEST_PAIN,COLD_SWEAT' },
            victims_count:  { type: 'string', enum: ['ONE','TWO','MANY','UNKNOWN'], example: 'ONE' },
            latitude:       { type: 'number', example: 3.9700 },
            longitude:      { type: 'number', example: 11.5400 }
          },
          required: ['device_id','emergency_type','situation','latitude','longitude']
        },
        DispatchResult: {
          type: 'object',
          properties: {
            alertId:     { type: 'integer', example: 42 },
            dispatched:  { type: 'boolean', example: true },
            hospital:    { type: 'string', example: 'Hopital Central de Yaounde' },
            distance_km: { type: 'number', example: 0.27 }
          }
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email:    { type: 'string', example: 'bastos@ecrs.cm' },
            password: { type: 'string', example: 'hospital123' }
          },
          required: ['email','password']
        }
      }
    },
    paths: {
      '/api/alerts': {
        post: {
          tags: ['Alerts'],
          summary: 'Create an emergency alert and dispatch it',
          description:
            'Captures the bystander GPS and symptoms, ranks qualifying hospitals ' +
            'by distance and capacity, dispatches to the best one, and returns the result. ' +
            'Accepts JSON or multipart/form-data (when a photo is attached).',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Alert' } } }
          },
          responses: {
            '201': { description: 'Alert created and dispatched',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/DispatchResult' } } } },
            '400': { description: 'Missing required fields' },
            '413': { description: 'Photo too large' }
          }
        }
      },
      '/api/alerts/{id}/confirm': {
        patch: {
          tags: ['Alerts'],
          summary: 'Hospital confirms an alert',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Alert confirmed; bystander notified' } }
        }
      },
      '/api/alerts/{id}/decline': {
        patch: {
          tags: ['Alerts'],
          summary: 'Hospital declines an alert (reroutes to next hospital)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Alert rerouted to next-best hospital' } }
        }
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new hospital (status: pending approval)',
          responses: { '201': { description: 'Hospital registered, awaiting admin approval' } }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Hospital login (returns JWT)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
          },
          responses: {
            '200': { description: 'Login successful, JWT returned' },
            '401': { description: 'Invalid credentials' }
          }
        }
      },
      '/api/auth/me/capacity': {
        patch: {
          tags: ['Auth'],
          summary: 'Hospital updates its available bed capacity',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Capacity updated' } }
        }
      },
      '/api/admin/login': {
        post: {
          tags: ['Admin'],
          summary: 'Administrator login (returns JWT)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
          },
          responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } }
        }
      },
      '/api/admin/institutions': {
        get: {
          tags: ['Admin'],
          summary: 'List all hospitals (with status)',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'List of hospitals' } }
        }
      },
      '/api/admin/institutions/{id}/approve': {
        patch: {
          tags: ['Admin'],
          summary: 'Approve a pending hospital',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Hospital approved' } }
        }
      },
      '/api/admin/stats': {
        get: {
          tags: ['Admin'],
          summary: 'System statistics (alerts, hospitals, dispatch rates)',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Statistics object' } }
        }
      },
      '/api/institutions': {
        get: {
          tags: ['Institutions'],
          summary: 'Public list of approved hospitals',
          responses: { '200': { description: 'List of approved hospitals' } }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
