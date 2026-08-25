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
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', inventoryRoutes);

app.get('/api/health', InventoryController.getHealth);

app.get('/api-docs/swagger.json', (req, res) => {
  const filePath = path.resolve(__dirname, './config/swagger.json');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.resolve(__dirname, '../src/config/swagger.json'));
  }
});

app.get('/api-docs', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Inventory Management System - API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow: -y-scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin: 0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js" charset="UTF-8"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/api-docs/swagger.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "BaseLayout"
        });
      };
    </script>
  </body>
</html>
  `;
  res.send(html);
});

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await startKafkaConsumer();
});
