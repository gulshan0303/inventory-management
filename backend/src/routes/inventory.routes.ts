import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/products', InventoryController.getProducts);
router.get('/inventory', InventoryController.getInventory);
router.get('/inventory/:productId', InventoryController.getSingleInventory);
router.get('/transactions', InventoryController.getTransactions);
router.get('/transactions/:id', InventoryController.getTransactionDetails);
router.get('/events/:eventId/status', InventoryController.getEventStatus);
router.post('/transactions', InventoryController.createTransaction);
/**
 * @swagger
 * /simulate-batch:
 *   post:
 *     summary: Run Legacy Batch Simulator
 *     description: Publishes 7 events to Kafka (1 per second) for demonstration.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Batch simulation started
 */
router.post('/simulate-batch', InventoryController.simulateBatch);

/**
 * @swagger
 * /simulate-scenario:
 *   post:
 *     summary: Run Predefined Scenario
 *     description: Executes a specific scenario by publishing events to Kafka.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scenario_id:
 *                 type: string
 *                 example: "scenario-1"
 *     responses:
 *       200:
 *         description: Scenario started
 */
router.post('/simulate-scenario', InventoryController.simulateScenario);

/**
 * @swagger
 * /reset:
 *   post:
 *     summary: Reset Database
 *     description: Clears all inventory data for testing.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Database reset successfully
 */
router.post('/reset', InventoryController.resetDatabase);

export default router;
