// Main server file for Event Ticketing capstone
import App from './http/app.js';
import { getConfig, updateConfig } from './config.js';

// Server class
class Server {
  constructor() {
    this.app = new App();
    this.config = getConfig();
    this.isRunning = false;
  }

  // Start the server
  async start() {
    if (this.isRunning) {
      console.log('Server is already running');
      return;
    }

    try {
      // Add health check endpoint
      this.app.add('GET', '/health', () => ({ status: 'ok' }));

      // Start the application
      this.app.start(this.config.port);

      this.isRunning = true;

      // Log server start
      console.log(`Server started on port ${this.config.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Prefix: ${this.config.app.apiPrefix}`);

      return this;
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  // Stop the server
  async stop() {
    if (!this.isRunning) {
      console.log('Server is not running');
      return;
    }

    try {
      // Stop the application
      this.app.stop();

      this.isRunning = false;

      console.log('Server stopped');
      return this;
    } catch (error) {
      console.error('Failed to stop server:', error);
      throw error;
    }
  }

  // Get server status
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      uptime: process.uptime(),
    };
  }

  // Update configuration
  updateConfig(updates) {
    this.config = updateConfig(updates);
  }

  // Get configuration
  getConfig() {
    return this.config;
  }
}

export default Server;
export { Server };

// Start server when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new Server();
  await server.start();
}