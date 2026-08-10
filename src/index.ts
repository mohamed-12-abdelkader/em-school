import { applyMigrations } from './db/migrate';
import { config, logger } from './utils';
import { app } from './app';

const startServer = async () => {
  try {
    logger.info('Applying database migrations...');
    await applyMigrations(config.DATABASE_URL, 'up');
    logger.info('Database migrations completed successfully');

    const PORT = config.PORT;
    logger.info(`Starting server on port ${PORT}...`);

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
    });

    server.on('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Set PORT env var to a free port.`);
        process.exit(1);
      }
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Received shutdown signal. Closing server...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    console.error('Full error details:', error);
    process.exit(1);
  }
};

startServer();
