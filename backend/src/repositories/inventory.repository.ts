import { PoolClient } from 'pg';
import { InventoryBatch } from '../types';

export class InventoryRepository {
  public static async createBatch(
    client: PoolClient,
    productId: string,
    quantity: number,
    unitPrice: string | number,
    purchasedAt: Date
  ): Promise<InventoryBatch> {
    const query = `
      INSERT INTO inventory_batches (product_id, original_quantity, remaining_quantity, unit_price, purchased_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [productId, quantity, quantity, unitPrice, purchasedAt];
    const res = await client.query(query, values);
    return res.rows[0];
  }

  public static async getAvailableBatchesForUpdate(
    client: PoolClient,
    productId: string
  ): Promise<InventoryBatch[]> {
    const query = `
      SELECT * FROM inventory_batches
      WHERE product_id = $1 AND remaining_quantity > 0
      ORDER BY purchased_at ASC, id ASC
      FOR UPDATE;
    `;
    const res = await client.query(query, [productId]);
    return res.rows;
  }

  public static async updateBatchRemainingQuantity(
    client: PoolClient,
    batchId: string,
    remainingQuantity: number
  ): Promise<void> {
    const query = `
      UPDATE inventory_batches
      SET remaining_quantity = $1, updated_at = NOW()
      WHERE id = $2;
    `;
    await client.query(query, [remainingQuantity, batchId]);
  }
}
