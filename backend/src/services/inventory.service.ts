import { getClient } from '../config/db';
import { InventoryRepository } from '../repositories/inventory.repository';
import { SalesRepository } from '../repositories/sales.repository';
import { FifoEngine } from './fifo.engine';

export class InventoryService {
  public static async processPurchase(
    productId: string,
    quantity: number,
    unitPrice: string | number,
    purchasedAt: Date
  ): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      await InventoryRepository.createBatch(client, productId, quantity, unitPrice, purchasedAt);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public static async processSale(
    productId: string,
    quantity: number,
    soldAt: Date
  ): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const batches = await InventoryRepository.getAvailableBatchesForUpdate(client, productId);

      const fifoResult = FifoEngine.processSale(batches, quantity);

      for (const batch of fifoResult.updatedBatches) {
        // Only update if the quantity actually changed to save DB updates
        const originalBatch = batches.find(b => b.id === batch.id);
        if (originalBatch && originalBatch.remaining_quantity !== batch.remaining_quantity) {
          await InventoryRepository.updateBatchRemainingQuantity(
            client,
            batch.id,
            batch.remaining_quantity
          );
        }
      }

      const saleId = await SalesRepository.createSale(
        client,
        productId,
        quantity,
        fifoResult.totalSaleCost,
        soldAt
      );

      await SalesRepository.createAllocations(client, saleId, fifoResult.allocations);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
