import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import fs from "fs";
import path from "path";

// Load base definition from swagger.json
const swaggerJsonPath = path.resolve(__dirname, "./swagger.json");
const swaggerBase = JSON.parse(fs.readFileSync(swaggerJsonPath, "utf-8"));

const options: swaggerJsdoc.Options = {
  definition: {
    ...swaggerBase,
    info: {
      ...swaggerBase.info,
      title: "Inventory Management System API Documentation (JSDoc + JSON)",
    },
  },
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // Serve swagger docs
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "API Documentation"
  }));
  
  // Also expose swagger.json for legacy or programmatic access
  app.get("/api-docs/swagger.json", (req, res) => {
    res.json(swaggerSpec);
  });
}
