import { PoolClient } from 'pg';
import { SaleAllocation } from '../types';
import format from 'pg-format';

export class SalesRepository {
  public static async createSale(
    client: PoolClient,
    productId: string,
    quantity: number,
    totalCost: string | number,
    soldAt: Date
  ): Promise<string> {
    const query = `
      INSERT INTO sales (product_id, quantity, total_cost, sold_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const values = [productId, quantity, totalCost, soldAt];
    const res = await client.query(query, values);
    return res.rows[0].id;
  }

  public static async createAllocations(
    client: PoolClient,
    saleId: string,
    allocations: SaleAllocation[]
  ): Promise<void> {
    if (allocations.length === 0) return;
    
    const values = allocations.map(a => [
      saleId,
      a.batch_id,
      a.quantity,
      a.unit_cost,
      a.total_cost
    ]);

    const query = format(
      `INSERT INTO sale_allocations (sale_id, batch_id, quantity, unit_cost, total_cost) VALUES %L`,
      values
    );

    await client.query(query);
  }
}
