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
router.post('/simulate-batch', InventoryController.simulateBatch);
router.post('/simulate-scenario', InventoryController.simulateScenario);
router.post('/reset', InventoryController.resetDatabase);

export default router;
