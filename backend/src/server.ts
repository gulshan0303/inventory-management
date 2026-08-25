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
app.use('/api', inventoryRoutes);

app.get('/api/health', InventoryController.getHealth);

import { setupSwagger } from './config/swaggerSetup';

setupSwagger(app);

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await startKafkaConsumer();
});
