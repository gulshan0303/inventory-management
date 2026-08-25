import { z } from 'zod';

export const PurchaseEventSchema = z.object({
  event_id: z.string().uuid(),
  product_id: z.string().min(1),
  event_type: z.literal('purchase'),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  timestamp: z.string().datetime(),
});

export const SaleEventSchema = z.object({
  event_id: z.string().uuid(),
  product_id: z.string().min(1),
  event_type: z.literal('sale'),
  quantity: z.number().int().positive(),
  timestamp: z.string().datetime(),
});

export const InventoryEventSchema = z.discriminatedUnion('event_type', [
  PurchaseEventSchema,
  SaleEventSchema,
]);

export type PurchaseEvent = z.infer<typeof PurchaseEventSchema>;
export type SaleEvent = z.infer<typeof SaleEventSchema>;
export type InventoryEvent = z.infer<typeof InventoryEventSchema>;
