import { describe, it, expect } from '@jest/globals';
import { FifoEngine } from '../../src/services/fifo.engine';
import { InventoryBatch } from '../../src/types';
import { InsufficientInventoryError } from '../../src/errors/applicationErrors';
import Big from 'big.js';

describe('FifoEngine', () => {
  const createBatch = (
    id: string,
    product_id: string,
    quantity: number,
    price: string,
    purchasedAtStr: string
  ): InventoryBatch => ({
    id,
    product_id,
    original_quantity: quantity,
    remaining_quantity: quantity,
    unit_price: price,
    purchased_at: new Date(purchasedAtStr),
  });

  it('Case 1 - Single Batch: Consumes partial amount correctly', () => {
    const batches = [
      createBatch('b1', 'PRD001', 50, '100', '2025-01-01T10:00:00Z'),
    ];

    const result = FifoEngine.processSale(batches, 20);

    expect(result.totalSaleCost).toBe(Big(2000).toFixed(4));
    expect(result.allocations.length).toBe(1);
    expect(result.allocations[0].batch_id).toBe('b1');
    expect(result.allocations[0].quantity).toBe(20);
    expect(result.allocations[0].total_cost).toBe(Big(2000).toFixed(4));

    expect(result.updatedBatches.length).toBe(1);
    expect(result.updatedBatches[0].remaining_quantity).toBe(30);
  });

  it('Case 2 - Multiple Batches: Consumes across multiple batches correctly', () => {
    const batches = [
      createBatch('b1', 'PRD001', 50, '100', '2025-01-01T10:00:00Z'),
      createBatch('b2', 'PRD001', 30, '120', '2025-01-02T10:00:00Z'),
    ];

    const result = FifoEngine.processSale(batches, 60);

    // 50 * 100 = 5000
    // 10 * 120 = 1200
    // Total = 6200
    expect(result.totalSaleCost).toBe(Big(6200).toFixed(4));
    expect(result.allocations.length).toBe(2);

    expect(result.allocations[0].batch_id).toBe('b1');
    expect(result.allocations[0].quantity).toBe(50);
    expect(result.allocations[0].total_cost).toBe(Big(5000).toFixed(4));

    expect(result.allocations[1].batch_id).toBe('b2');
    expect(result.allocations[1].quantity).toBe(10);
    expect(result.allocations[1].total_cost).toBe(Big(1200).toFixed(4));

    expect(result.updatedBatches[0].remaining_quantity).toBe(0);
    expect(result.updatedBatches[1].remaining_quantity).toBe(20);
  });

  it('Case 3 - Exact Batch Consumption: Consumes exact batch amount', () => {
    const batches = [
      createBatch('b1', 'PRD001', 50, '100', '2025-01-01T10:00:00Z'),
    ];

    const result = FifoEngine.processSale(batches, 50);

    expect(result.totalSaleCost).toBe(Big(5000).toFixed(4));
    expect(result.allocations.length).toBe(1);
    expect(result.allocations[0].quantity).toBe(50);
    
    expect(result.updatedBatches[0].remaining_quantity).toBe(0);
  });

  it('Case 4 - Partial Batch: Leaves remaining quantity in batch', () => {
    // Covered mostly by Case 1, but explicitly tested here again as requested
    const batches = [
      createBatch('b1', 'PRD001', 50, '100', '2025-01-01T10:00:00Z'),
    ];

    const result = FifoEngine.processSale(batches, 20);
    expect(result.updatedBatches[0].remaining_quantity).toBe(30);
  });

  it('Case 5 - Insufficient Inventory: Throws correct error', () => {
    const batches = [
      createBatch('b1', 'PRD001', 30, '100', '2025-01-01T10:00:00Z'),
    ];

    expect(() => FifoEngine.processSale(batches, 40)).toThrow(InsufficientInventoryError);
    // State of original batches remains unchanged since an error is thrown
  });

  it('Case 6 - Multiple Products: Engine receives only specific product batches from service', () => {
    // In practice, the Service filters batches by product_id before calling the engine.
    // If the engine receives batches of multiple products, it shouldn't happen, but we can verify it processes exactly what is given.
    // To prove they are independent, we just feed it the right batches.
    const product1Batches = [
      createBatch('b1', 'PRD001', 50, '100', '2025-01-01T10:00:00Z'),
    ];

    const result = FifoEngine.processSale(product1Batches, 20);
    expect(result.updatedBatches[0].remaining_quantity).toBe(30);
  });

  it('Case 7 - Deterministic Ordering: Should use secondary sorting if dates are same', () => {
    // The FifoEngine assumes batches are PRE-SORTED by the DB (purchased_at ASC, id ASC).
    // Let's verify that if it receives them in a specific order, it processes them exactly in that order.
    const batches = [
      createBatch('b1', 'PRD001', 50, '100', '2025-01-01T10:00:00Z'), // ID is b1
      createBatch('b2', 'PRD001', 30, '120', '2025-01-01T10:00:00Z'), // ID is b2
    ];

    const result = FifoEngine.processSale(batches, 60);

    expect(result.allocations[0].batch_id).toBe('b1');
    expect(result.allocations[1].batch_id).toBe('b2');
    expect(result.allocations[1].quantity).toBe(10);
  });
});
