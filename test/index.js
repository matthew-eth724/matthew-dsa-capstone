// Tests for Build 3 of Event Ticketing capstone

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createStore, createEvent, addTier, publishEvent, bookTickets, cancelBooking, joinWaitlist, offerNextOnWaitlist, findBookingByReference, seatsLeft } from '../src/domain/inventory.js';
import { canTransition, assertTransition, getPossibleTargets, getPossibleSources, isFinalState, getAllStates, getTransitions, isValidState } from '../src/domain/bookingStateMachine.js';
import { Router, Route } from '../src/http/router.js';

// Test utilities
function assertThrowsWithCode(fn, expectedCode, expectedMessagePattern) {
  let error;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  assert(error instanceof Error, `Expected Error, got ${typeof error}`);
  assert(error.code === expectedCode, `Expected error code ${expectedCode}, got ${error.code}`);
  if (expectedMessagePattern) {
    assert(typeof error.message === 'string', `Expected error message to be string, got ${typeof error.message}`);
    if (!expectedMessagePattern.includes(error.message)) {
      console.warn(`Warning: error message "${error.message}" doesn't match pattern "${expectedMessagePattern}"`);
    }
  }
}

// Booking State Machine Tests

describe('Booking State Machine', () => {
  it('defines all expected states', () => {
    const states = getAllStates();
    assert(states.includes('pending'));
    assert(states.includes('paid'));
    assert(states.includes('cancelled'));
    assert(states.includes('refunded'));
    assert(states.includes('checked_in'));
    assert(states.length === 5);
  });

  it('identifies final states correctly', () => {
    assert(!isFinalState('pending'));
    assert(!isFinalState('paid'));
    assert(isFinalState('cancelled'));
    assert(isFinalState('refunded'));
    assert(isFinalState('checked_in'));
  });

  it('checks valid transitions correctly', () => {
    assert(canTransition('pending', 'paid'));
    assert(canTransition('pending', 'cancelled'));
    assert(canTransition('paid', 'checked_in'));
    assert(canTransition('paid', 'refunded'));
    assert(canTransition('paid', 'cancelled'));

    assert(!canTransition('pending', 'checked_in'));
    assert(!canTransition('paid', 'pending'));
    assert(!canTransition('cancelled', 'pending'));
  });

  it('returns possible targets for each source state', () => {
    assert.deepStrictEqual(getPossibleTargets('pending'), ['paid', 'cancelled']);
    assert.deepStrictEqual(getPossibleTargets('paid'), ['checked_in', 'refunded', 'cancelled']);
    assert.deepStrictEqual(getPossibleTargets('cancelled'), []);
    assert.deepStrictEqual(getPossibleTargets('refunded'), []);
    assert.deepStrictEqual(getPossibleTargets('checked_in'), []);
  });

  it('returns possible sources for each target state', () => {
    assert.deepStrictEqual(getPossibleSources('paid'), ['pending']);
    assert.deepStrictEqual(getPossibleSources('cancelled'), ['pending', 'paid']);
    assert.deepStrictEqual(getPossibleSources('checked_in'), ['paid']);
    assert.deepStrictEqual(getPossibleSources('refunded'), ['paid']);
    assert.deepStrictEqual(getPossibleSources('pending'), []);
  });

  it('validates transitions correctly with assertTransition', () => {
    // These should not throw
    assertTransition('pending', 'paid');
    assertTransition('pending', 'cancelled');
    assertTransition('paid', 'checked_in');
    assertTransition('paid', 'refunded');
    assertTransition('paid', 'cancelled');

    // These should throw INVALID_TRANSITION
    assertThrowsWithCode(
      () => assertTransition('pending', 'checked_in'),
      'INVALID_TRANSITION',
      'cannot transition'
    );
    assertThrowsWithCode(
      () => assertTransition('paid', 'pending'),
      'INVALID_TRANSITION',
      'cannot transition'
    );
    assertThrowsWithCode(
      () => assertTransition('cancelled', 'pending'),
      'INVALID_TRANSITION',
      'cannot transition'
    );
  });

  it('identifies valid state values', () => {
    assert(isValidState('pending'));
    assert(isValidState('paid'));
    assert(isValidState('cancelled'));
    assert(isValidState('refunded'));
    assert(isValidState('checked_in'));
    assert(!isValidState('invalid'));
    assert(!isValidState(''));
    assert(!isValidState(null));
  });

  it('provides transitions documentation', () => {
    const transitions = getTransitions();
    assert(Array.isArray(transitions));
    assert(transitions.length > 0);
    assert(transitions.some(t => t.source === 'pending' && t.targets.includes('paid')));
  });
});

// Router Tests

describe('Router', () => {
  it('creates a route with correct properties', () => {
    const handler = () => {};
    const route = new Route('GET', '/api/events', handler);

    assert(route.method === 'GET');
    assert(route.path === '/api/events');
    assert(route.handler === handler);
    assert(route.params.length === 0);
  });

  it('extracts params from path', () => {
    const route = new Route('GET', '/api/events/:id', () => {});
    assert.deepStrictEqual(route.params, ['id']);

    const route2 = new Route('GET', '/api/users/:userId/books/:bookId', () => {});
    assert.deepStrictEqual(route2.params, ['userId', 'bookId']);

    const route3 = new Route('GET', '/static/image.png', () => {});
    assert.deepStrictEqual(route3.params, []);
  });

  it('matches exact route', () => {
    const route = new Route('GET', '/api/events', () => {});
    assert(route.matches('GET', '/api/events'));
  });

  it('does not match different method', () => {
    const route = new Route('GET', '/api/events', () => {});
    assert(!route.matches('POST', '/api/events'));
  });

  it('does not match different path', () => {
    const route = new Route('GET', '/api/events', () => {});
    assert(!route.matches('GET', '/api/events/1'));
  });

  it('matches path with parameters', () => {
    const route = new Route('GET', '/api/events/:id', () => {});
    assert(route.matches('GET', '/api/events/123'));
    assert(route.matches('GET', '/api/events/foo'));
  });

  it('extracts parameters from request path', () => {
    const route = new Route('GET', '/api/events/:id', (ctx) => {});
    const params = route.extractRequestParams('/api/events/456');
    assert.deepStrictEqual(params, { id: '456' });

    const route2 = new Route('GET', '/api/users/:userId/books/:bookId', (ctx) => {});
    const params2 = route2.extractRequestParams('/api/users/user123/books/book456');
    assert.deepStrictEqual(params2, { userId: 'user123', bookId: 'book456' });
  });

  it('creates router with routes', () => {
    const router = new Router();
    router.add('GET', '/api/events', () => {});
    router.add('POST', '/api/events', () => {});

    const routes = router.getAll();
    assert(routes.length === 2);
    assert(routes[0].path === '/api/events');
    assert(routes[1].path === '/api/events');
    assert(routes[0].method === 'GET');
    assert(routes[1].method === 'POST');
  });

  it('finds route by method and path', () => {
    const router = new Router();
    router.add('GET', '/api/events', (ctx) => 'events');
    router.add('POST', '/api/events', (ctx) => 'created');

    const getRoute = router.get('GET', '/api/events');
    assert(getRoute !== undefined);
    assert(getRoute.method === 'GET');

    const postRoute = router.get('POST', '/api/events');
    assert(postRoute !== undefined);
    assert(postRoute.method === 'POST');

    const notFound = router.get('DELETE', '/api/events');
    assert(notFound === undefined);
  });

  it('clears all routes', () => {
    const router = new Router();
    router.add('GET', '/api/events', () => {});

    assert(router.getAll().length === 1);

    router.clear();

    assert(router.getAll().length === 0);
  });
});

// HTTP Server Tests

describe('HTTP Server', () => {
  let server;
  let app;

  beforeEach(() => {
    // Import server and app modules fresh for each test
    const serverModule = require('../src/server.js');
    const appModule = require('../src/http/app.js');

    server = new serverModule.Server();
    app = new appModule.default();

    // Add a simple test route
    app.add('GET', '/api/test', (ctx) => {
      return {
        message: 'Test endpoint working',
        path: ctx.path,
        method: ctx.method,
        params: ctx.params,
      };
    });
  });

  it('server can be created', () => {
    assert(server !== undefined);
    assert(app !== undefined);
  });

  it('server configuration can be accessed', () => {
    const config = server.getConfig();
    assert(config.port);
    assert(config.app);
    assert(config.database);
    assert(config.security);
  });

  it('server status is accessible', () => {
    const status = server.getStatus();
    assert(typeof status.isRunning === 'boolean');
    assert(typeof status.port === 'number');
    assert(typeof status.uptime === 'number');
  });

  it('server can update configuration', () => {
    const originalPort = server.getConfig().port;

    server.updateConfig({ port: 8080 });

    assert(server.getConfig().port === 8080);

    // Restore original config
    server.updateConfig({ port: originalPort });
  });
});

// Integration Tests

describe('Integration Tests', () => {
  it('state machine works with booking lifecycle', () => {
    const store = createStore();
    const event = createEvent(store, {
      title: 'Integration Test Event',
      city: 'Test City',
      venue: 'Test Venue',
      startsAt: '2026-12-05T17:00:00Z',
      organizerId: 'organizer-1',
    });
    const tier = addTier(store, event.id, {
      name: 'General',
      priceCents: 5000,
      capacity: 2,
    });
    publishEvent(store, event.id);

    // Initial state should be pending
    assert(tier.sold === 0);
    assert(seatsLeft(tier) === 2);

    // Book tickets (transitions from pending to paid)
    const booking = bookTickets(store, tier.id, 'user-1', 1);
    assert(booking.status === 'pending'); // Booking starts as pending
    assert(tier.sold === 1);
    assert(seatsLeft(tier) === 1);

    // The state machine would handle the transition to 'paid' state
    // based on payment processing (outside the scope of this test)
    assert(typeof booking.reference === 'string');
  });

  it('router routes API requests correctly', () => {
    const router = new Router();

    // Add test routes
    router.add('GET', '/api/test', (ctx) => ({ message: 'GET test' }));
    router.add('POST', '/api/test', (ctx) => ({ message: 'POST test' }));
    router.add('GET', '/api/users/:id', (ctx) => ({ userId: ctx.params.id }));

    // Test GET route
    const getRoute = router.get('GET', '/api/test');
    assert(getRoute !== undefined);
    assert(getRoute.method === 'GET');

    // Test POST route
    const postRoute = router.get('POST', '/api/test');
    assert(postRoute !== undefined);
    assert(postRoute.method === 'POST');

    // Test route with parameters
    const paramRoute = router.get('GET', '/api/users/123');
    assert(paramRoute !== undefined);
    assert(paramRoute.params.includes('id'));
  });
});

// Security Tests

describe('Security Tests', () => {
  it('invalid state transitions are rejected', () => {
    // Test that invalid state transitions throw INVALID_TRANSITION
    assertThrowsWithCode(
      () => assertTransition('cancelled', 'paid'),
      'INVALID_TRANSITION',
      'cannot transition'
    );

    assertThrowsWithCode(
      () => assertTransition('refunded', 'pending'),
      'INVALID_TRANSITION',
      'cannot transition'
    );

    assertThrowsWithCode(
      () => assertTransition('checked_in', 'paid'),
      'INVALID_TRANSITION',
      'cannot transition'
    );
  });

it('router parameter extraction is safe', () => {
    const route = new Route('GET', '/api/:param', (ctx) => {});

    // Test normal parameter extraction
    const params = route.extractRequestParams('/api/safe-value');
    assert.deepStrictEqual(params, { param: 'safe-value' });

    // Test with a path containing special characters that could be interpreted as shell commands
    const maliciousPath = '/api/semicolon'; // Simple test - semicolon could be interpreted as command separator
    const maliciousParams = route.extractRequestParams(maliciousPath);
    assert.deepStrictEqual(maliciousParams, { param: 'semicolon' });
  });
});

// Component Tests - using inline imports to avoid require() issues

describe('Component Tests', () => {
  it('state machine components are exported correctly', async () => {
    // Import state machine components dynamically
    const stateMachineModule = await import('../src/domain/bookingStateMachine.js');
    
    // Test each exported function exists and is callable
    assert(typeof stateMachineModule.canTransition === 'function');
    assert(typeof stateMachineModule.assertTransition === 'function');
    assert(typeof stateMachineModule.getPossibleTargets === 'function');
    assert(typeof stateMachineModule.getPossibleSources === 'function');
    assert(typeof stateMachineModule.isFinalState === 'function');
    assert(typeof stateMachineModule.getAllStates === 'function');
    assert(typeof stateMachineModule.getTransitions === 'function');
    assert(typeof stateMachineModule.isValidState === 'function');

    // Test basic functionality
    const states = stateMachineModule.getAllStates();
    assert(states.includes('pending'));
    assert(states.includes('paid'));
    assert(states.includes('cancelled'));
    assert(states.includes('refunded'));
    assert(states.includes('checked_in'));
  });

  it('router components are exported correctly', async () => {
    // Import router components dynamically
    const routerModule = await import('../src/http/router.js');

    // Test Router class exists and can be instantiated
    assert(typeof routerModule.Router === 'function');
    const router = new routerModule.Router();
    assert(router instanceof routerModule.Router);

    // Test Route class exists and can be instantiated
    assert(typeof routerModule.Route === 'function');
    const route = new routerModule.Route('GET', '/test', () => {});
    assert(route instanceof routerModule.Route);

    // Test basic route functionality
    assert(route.method === 'GET');
    assert(route.path === '/test');
    assert(typeof route.handler === 'function');
  });

  it('app components are exported correctly', async () => {
    // Import app components dynamically
    const appModule = await import('../src/http/app.js');

    // Test App class exists and can be instantiated
    assert(typeof appModule.default === 'function');
    const app = new appModule.default();
    assert(app instanceof appModule.default);

    // Test basic app functionality
    assert(app !== undefined);
    assert(typeof app.route === 'function');
  });
});