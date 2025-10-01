const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ClearBoard API',
      version: '1.0.0',
      description: 'API documentation for ClearBoard backend',
    },
    servers: [
      { url: 'http://localhost:8080' }
    ],
  },
  apis: ['./routes/*.js'], // Path to the API docs in your route files
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
