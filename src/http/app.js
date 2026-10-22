// HTTP server for Event Ticketing capstone
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
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

// HTTP server class
class App {
  constructor() {
    this.router = new Router();
    this.publicPath = resolve(process.cwd(), 'public');
  }

  // Add a route
  add(method, path, handler) {
    this.router.add(method, path, handler);
    return this;
  }

  // Route handler
  route(request, response) {
    const { method, url } = request;
    const parsedUrl = new URL(url, `http://localhost:${this.serverPort}`);
    const pathname = parsedUrl.pathname;

    // Find matching route
    const route = this.router.get(method, pathname);
    if (!route) {
      this.handleNotFound(response, pathname);
      return;
    }

    // Extract parameters
    const params = route.extractRequestParams(pathname);
    const query = Object.fromEntries(parsedUrl.searchParams);

    // Prepare request context
    const requestContext = {
      method,
      path: pathname,
      params,
      query,
      response,
      request,
    };

    try {
      // Execute route handler
      const result = route.handler(requestContext);

      // Handle async handlers
      if (result && typeof result.then === 'function') {
        result.then(responseData => {
          this.sendResponse(response, responseData);
        }).catch(error => {
          this.handleError(error, response);
        });
      } else {
        this.sendResponse(response, result);
      }
    } catch (error) {
      this.handleError(error, response);
    }
  }

  // Handle successful response
  sendResponse(response, data) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(data));
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
    response.writeHead(statusCode, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      error: { code, message }
    }));
  }

  // Serve static files
  serveStatic(response, path) {
    try {
      const filePath = resolve(this.publicPath, path);
      const content = readFileSync(filePath);

      // Determine content type based on file extension
      const contentType = this.getContentType(path);

      response.writeHead(200, { 'Content-Type': contentType });
      response.end(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.handleNotFound(response, path);
      } else {
        this.handleError(error, response);
      }
    }
  }

  // Get content type based on file extension
  getContentType(path) {
    const ext = path.split('.').pop().toLowerCase();
    const contentTypes = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      txt: 'text/plain',
      md: 'text/markdown',
    };

    return contentTypes[ext] || 'text/plain';
  }

  // Start the server
  start(port) {
    this.server = require('node:http').createServer((request, response) => {
      // Handle different content types
      const contentType = request.headers['content-type'] || '';

      if (request.method === 'GET' || request.method === 'HEAD') {
        this.handleStaticRequest(request, response);
      } else {
        this.handleApiRequest(request, response);
      }
    });

    this.server.listen(port, () => {
      console.log(`Server started on port ${port}`);
    });

    this.serverPort = port;

    // Handle server errors
    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      } else {
        console.error('Server error:', error);
      }
    });
  }

  // Handle static file requests
  handleStaticRequest(request, response) {
    const url = new URL(request.url, `http://localhost:${this.serverPort}`);
    let path = url.pathname;

    // Check router for registered routes first (e.g., /health)
    const route = this.router.get(request.method, path);
    if (route) {
      const params = route.extractRequestParams(path);
      const query = Object.fromEntries(url.searchParams);
      const requestContext = {
        method: request.method,
        path,
        params,
        query,
        response,
        request,
      };
      try {
        const result = route.handler(requestContext);
        if (result && typeof result.then === 'function') {
          result.then(responseData => {
            this.sendResponse(response, responseData);
          }).catch(error => {
            this.handleError(error, response);
          });
        } else {
          this.sendResponse(response, result);
        }
        return;
      } catch (error) {
        this.handleError(error, response);
        return;
      }
    }

    // Remove leading slash
    if (path === '/') {
      path = '/index.html';
    }

    this.serveStatic(response, path.substring(1)); // Remove leading slash
  }

  // Handle API requests
  handleApiRequest(request, response) {
    const url = new URL(request.url, `http://localhost:${this.serverPort}`);
    let path = url.pathname;

    // Parse request body
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      try {
        // Validate JSON only for API routes
        if (path.startsWith('/api/')) {
          if (body) {
            try {
              JSON.parse(body);
            } catch (error) {
              this.handleBadJson(error, response);
              return;
            }
          }

          this.route(request, response);
        } else {
          // Static files don't have request bodies
          this.route(request, response);
        }
      } catch (error) {
        this.handleError(error, response);
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