export interface InventoryBatch {
  id: string;
  product_id: string;
  original_quantity: number;
  remaining_quantity: number;
  unit_price: string; 
  purchased_at: Date;
}

export interface SaleAllocation {
  batch_id: string;
  quantity: number;
  unit_cost: string;
  total_cost: string;
}

export interface FifoResult {
  allocations: SaleAllocation[];
  totalSaleCost: string;
  updatedBatches: InventoryBatch[];
}
