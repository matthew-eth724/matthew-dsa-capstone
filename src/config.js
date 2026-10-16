// Server configuration for Event Ticketing capstone

// Server configuration
const config = {
  // Server port from environment variable or default
  port: parseInt(process.env.PORT, 10) || 3000,

  // Server settings
  serverOptions: {
    // Keep-alive timeout in milliseconds
    keepAliveTimeout: 5000,

    // Timeout for receiving request headers
    headersTimeout: 5000,

    // Maximum request header size
    maxHeadersCount: 100,

    // Server name
    name: 'Event Ticketing API',

    // Server version
    version: '1.0.0',
  },

  // Application settings
  app: {
    // Enable detailed error messages in development
    detailedErrors: process.env.NODE_ENV !== 'production',

    // Static file path
    publicPath: process.env.PUBLIC_PATH || './public',

    // API prefix
    apiPrefix: '/api',

    // Security headers
    securityHeaders: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  },

  // Logging configuration
  logging: {
    // Log level
    level: process.env.LOG_LEVEL || 'info',

    // Log format
    format: process.env.LOG_FORMAT || 'combined',

    // Log file path
    file: process.env.LOG_FILE,

    // Enable console logging
    console: process.env.ENABLE_CONSOLE_LOG !== 'false',
  },

  // Database configuration
  database: {
    // SQLite database path
    path: process.env.DB_PATH || './data/ticketing.db',

    // Connection timeout
    timeout: 5000,

    // Read-only mode
    readOnly: process.env.DB_READONLY === 'true',
  },

  // Security configuration
  security: {
    // Enable CORS
    cors: process.env.ENABLE_CORS === 'true',

    // CORS origins
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

    // Rate limiting
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    },

    // API key authentication
    apiKey: process.env.API_KEY,

    // JWT secret
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
  },

  // Application metadata
  metadata: {
    name: 'Event Ticketing and Booking API',
    description: 'A comprehensive event ticketing and booking API',
    version: '1.0.0',
    author: 'Event Ticketing Team',
    license: 'MIT',
    repository: 'https://github.com/yourusername/event-ticketing',
  },
};

// Validate configuration
function validateConfig(config) {
  // Validate port
  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid port number');
  }

  // Validate database path
  if (!config.database.path) {
    throw new Error('Database path is required');
  }

  // Validate JWT secret in production
  if (process.env.NODE_ENV === 'production' && !config.security.jwtSecret) {
    throw new Error('JWT secret is required in production');
  }

  return config;
}

// Get configuration
function getConfig() {
  return validateConfig(config);
}

// Update configuration
function updateConfig(updates) {
  Object.assign(config, updates);
  return validateConfig(config);
}

export { getConfig, updateConfig, config };