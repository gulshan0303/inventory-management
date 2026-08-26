import express from 'express';
import { startKafkaConsumer } from './kafka/consumer';
import inventoryRoutes from './routes/inventory.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';
import cors from 'cors';

import { InventoryController } from './controllers/inventory.controller';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.get('/api/health', InventoryController.getHealth);
app.use('/api', inventoryRoutes);

import { setupSwagger } from './config/swaggerSetup';

setupSwagger(app);

app.use(errorHandler);

import { disconnectKafkaConsumer } from './kafka/consumer';
import { disconnectKafkaProducer } from './kafka/producer';
import { pool } from './config/db';

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await startKafkaConsumer();
    console.log('Kafka consumer started successfully');
  } catch (error) {
    console.error('Failed to start Kafka consumer. Event processing will be disabled until Kafka is available.', error);
  }
});

const gracefulShutdown = async () => {
  console.log('Initiating graceful shutdown...');
  server.close(() => console.log('HTTP server closed'));
  
  await disconnectKafkaConsumer();
  await disconnectKafkaProducer();
  
  if (pool) {
    await pool.end();
    console.log('Database pool closed');
  }
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);


