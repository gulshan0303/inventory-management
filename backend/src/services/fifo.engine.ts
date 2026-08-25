import Big from 'big.js';
import { InventoryBatch, SaleAllocation, FifoResult } from '../types';
import { InsufficientInventoryError } from '../errors/applicationErrors';

export class FifoEngine {
  /**
   * Process a sale against a set of available inventory batches.
   * Assumes batches are pre-sorted by (purchased_at ASC, id ASC)
   * @param batches The available inventory batches for the product
   * @param saleQuantity The quantity to be sold
   */
  public static processSale(batches: InventoryBatch[], saleQuantity: number): FifoResult {
    if (saleQuantity <= 0) {
      throw new Error('Sale quantity must be strictly positive');
    }

    let remainingToSell = saleQuantity;
    const allocations: SaleAllocation[] = [];
    const updatedBatches: InventoryBatch[] = [];
    let totalSaleCost = Big(0);

    for (const batch of batches) {
      if (remainingToSell <= 0) break;
      if (batch.remaining_quantity <= 0) continue;

      const quantityFromBatch = Math.min(batch.remaining_quantity, remainingToSell);
      const unitCost = Big(batch.unit_price);
      const batchCost = unitCost.times(quantityFromBatch);

      allocations.push({
        batch_id: batch.id,
        quantity: quantityFromBatch,
        unit_cost: unitCost.toFixed(4),
        total_cost: batchCost.toFixed(4),
      });

      totalSaleCost = totalSaleCost.plus(batchCost);
      remainingToSell -= quantityFromBatch;

      updatedBatches.push({
        ...batch,
        remaining_quantity: batch.remaining_quantity - quantityFromBatch,
      });
    }

    if (remainingToSell > 0) {
      throw new InsufficientInventoryError(`Insufficient inventory. Short by ${remainingToSell} units.`);
    }

    return {
      allocations,
      totalSaleCost: totalSaleCost.toFixed(4),
      updatedBatches,
    };
  }
}
