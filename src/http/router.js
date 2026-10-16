// HTTP router for Event Ticketing capstone
import { URL } from 'node:url';

// Route definition with method and path pattern
class Route {
  constructor(method, path, handler) {
    this.method = method.toUpperCase();
    this.path = path;
    this.handler = handler;
    this.params = this.extractParams(path);
  }

  // Extract route parameters (e.g., "/api/events/:id" -> ["id"])
  extractParams(path) {
    const params = [];
    const segments = path.split('/');
    for (const segment of segments) {
      if (segment.startsWith(':')) {
        params.push(segment.slice(1));
      }
    }
    return params;
  }

  // Match request method and path
  matches(requestMethod, requestPath) {
    return this.method === requestMethod && this.matchPath(requestPath);
  }

  // Match path with parameter substitution
  matchPath(requestPath) {
    const routeSegments = this.path.split('/');
    const requestSegments = requestPath.split('/');

    if (routeSegments.length !== requestSegments.length) {
      return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSeg = routeSegments[i];
      const requestSeg = requestSegments[i];

      if (routeSeg.startsWith(':')) {
        continue; // Parameter matches anything
      }

      if (routeSeg !== requestSeg) {
        return false;
      }
    }

    return true;
  }

  // Extract parameters from request path
  extractRequestParams(requestPath) {
    const routeSegments = this.path.split('/');
    const requestSegments = requestPath.split('/');
    const params = {};

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSeg = routeSegments[i];
      const requestSeg = requestSegments[i];

      if (routeSeg.startsWith(':')) {
        const paramName = routeSeg.slice(1);
        params[paramName] = requestSeg;
      }
    }

    return params;
  }
}

// Router class
class Router {
  constructor() {
    this.routes = [];
  }

  // Add a route
  add(method, path, handler) {
    const route = new Route(method, path, handler);
    this.routes.push(route);
    return this;
  }

  // Get routes for a specific path and method
  get(method, path) {
    return this.routes.find(route => route.matches(method, path));
  }

  // Get all routes
  getAll() {
    return this.routes;
  }

  // Clear all routes
  clear() {
    this.routes = [];
  }

  // Generate routes documentation
  getRoutesDocumentation() {
    return this.routes.map(route => (
      `${route.method} ${route.path}`
    ));
  }
}

// Export router and Route class
export { Router, Route };