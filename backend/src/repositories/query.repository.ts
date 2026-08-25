import { query } from '../config/db';

export class QueryRepository {
  public static async getProducts() {
    const res = await query('SELECT * FROM products ORDER BY name ASC');
    return res.rows;
  }

  public static async getInventoryOverview() {
    const sql = `
      SELECT 
        p.product_id,
        p.name,
        COALESCE(SUM(b.remaining_quantity), 0)::integer as current_quantity,
        COALESCE(SUM(b.remaining_quantity * b.unit_price), 0) as total_inventory_cost
      FROM products p
      LEFT JOIN inventory_batches b ON p.product_id = b.product_id
      GROUP BY p.product_id, p.name
      ORDER BY p.product_id ASC;
    `;
    const res = await query(sql);
    
    return res.rows.map(row => {
      const current_quantity = parseInt(row.current_quantity, 10);
      const total_inventory_cost = parseFloat(row.total_inventory_cost);
      let avg_cost = 0;
      if (current_quantity > 0) {
        avg_cost = total_inventory_cost / current_quantity;
      }
      return {
        product_id: row.product_id,
        name: row.name,
        current_quantity,
        total_inventory_cost: total_inventory_cost.toFixed(2),
        average_cost_per_unit: avg_cost.toFixed(2)
      };
    });
  }

  public static async getInventoryProduct(productId: string) {
    const sql = `
      SELECT 
        p.product_id,
        p.name,
        COALESCE(SUM(b.remaining_quantity), 0)::integer as current_quantity,
        COALESCE(SUM(b.remaining_quantity * b.unit_price), 0) as total_inventory_cost
      FROM products p
      LEFT JOIN inventory_batches b ON p.product_id = b.product_id
      WHERE p.product_id = $1
      GROUP BY p.product_id, p.name;
    `;
    const res = await query(sql, [productId]);
    if (res.rows.length === 0) return null;
    
    const row = res.rows[0];
    const current_quantity = parseInt(row.current_quantity, 10);
    const total_inventory_cost = parseFloat(row.total_inventory_cost);
    let avg_cost = 0;
    if (current_quantity > 0) {
      avg_cost = total_inventory_cost / current_quantity;
    }
    return {
      product_id: row.product_id,
      name: row.name,
      current_quantity,
      total_inventory_cost: total_inventory_cost.toFixed(2),
      average_cost_per_unit: avg_cost.toFixed(2)
    };
  }

  public static async getTransactions(limit: number = 20, offset: number = 0) {
    const sql = `
      SELECT 
        id, product_id, 'purchase' as transaction_type, 
        original_quantity as quantity, unit_price, 
        (original_quantity * unit_price) as total_cost,
        purchased_at as timestamp
      FROM inventory_batches
      
      UNION ALL
      
      SELECT 
        id, product_id, 'sale' as transaction_type, 
        quantity, NULL as unit_price, 
        total_cost,
        sold_at as timestamp
      FROM sales
      
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2;
    `;
    const res = await query(sql, [limit, offset]);
    
    const countSql = `
      SELECT 
        (SELECT COUNT(*) FROM inventory_batches) + 
        (SELECT COUNT(*) FROM sales) as total_count;
    `;
    const countRes = await query(countSql);
    const total = parseInt(countRes.rows[0].total_count, 10);

    return {
      data: res.rows,
      total
    };
  }
}
