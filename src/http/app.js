// Express HTTP server for Event Ticketing capstone
import express from 'express';
import { resolve } from 'node:path';
import { Router, Route } from './router.js';

// Error response class
class AppError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Express server class
class App {
  constructor() {
    this.app = express();
    this.router = new Router();
    this.publicPath = resolve(process.cwd(), 'public');
    this.serverPort = null;
    
    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
    
    this.setupRoutes();
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // API routes - delegate to custom router
    this.app.use('/api', (req, res, next) => {
      // Parse path without /api prefix for router matching
      const path = req.path;
      const route = this.router.get(req.method, path);
      if (!route) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Path ${path} not found` } });
      }
      
      const params = route.extractRequestParams(path);
      const query = req.query;
      
      const requestContext = {
        method: req.method,
        path,
        params,
        query,
        response: res,
        request: req,
      };

      try {
        const result = route.handler(requestContext);
        if (result && typeof result.then === 'function') {
          result.then(responseData => {
            res.json(responseData);
          }).catch(error => {
            this.handleError(error, res);
          });
        } else {
          res.json(result);
        }
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Catch-all for unknown API paths
    this.app.use('/api', (req, res) => {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Path ${req.path} not found` } });
    });

    // Static file serving from public/
    this.app.use(express.static(this.publicPath, {
      index: 'index.html',
      fallthrough: true,
    }));

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      this.handleError(err, res);
    });
  }

  // Add a route to the custom router
  add(method, path, handler) {
    this.router.add(method, path, handler);
    return this;
  }

  // Handle successful response
  sendResponse(response, data) {
    response.json(data);
  }

  // Handle not found error
  handleNotFound(response, path) {
    this.sendErrorResponse(response, 404, 'NOT_FOUND', `Path ${path} not found`);
  }

  // Handle bad JSON error
  handleBadJson(error, response) {
    this.sendErrorResponse(response, 400, 'BAD_JSON', 'Invalid JSON in request body');
  }

  // Handle application error
  handleError(error, response) {
    if (error instanceof AppError) {
      this.sendErrorResponse(response, error.statusCode, error.code, error.message);
    } else {
      // Security: never expose stack traces to client
      this.sendErrorResponse(
        response,
        500,
        'INTERNAL_ERROR',
        'An unexpected error occurred'
      );
      // Log the error for debugging
      console.error('Internal server error:', error);
    }
  }

  // Send error response
  sendErrorResponse(response, statusCode, code, message) {
    response.status(statusCode).json({
      error: { code, message }
    });
  }

  // Start the server
  start(port) {
    this.serverPort = port;
    this.server = this.app.listen(port, () => {
      console.log(`Server started on port ${port}`);
    });

    // Handle server errors
    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      } else {
        console.error('Server error:', error);
      }
    });
  }

  // Stop the server
  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('Server stopped');
      });
    }
  }
}

export default App;