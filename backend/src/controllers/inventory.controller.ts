import { Request, Response, NextFunction } from 'express';
import { QueryRepository } from '../repositories/query.repository';
import { getKafkaProducer } from '../kafka/producer';
import { kafka } from '../kafka/config';
import { EventRepository } from '../repositories/event.repository';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { ValidationError } from '../errors/applicationErrors';
import { query } from '../config/db';

const PaginationSchema = z.object({
  page: z.string().regex(/^\d+$/).optional().transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z.string().regex(/^\d+$/).optional().transform(v => (v ? parseInt(v, 10) : 20)),
});

const CreateTransactionSchema = z.object({
  product_id: z.string().min(1),
  event_type: z.enum(['purchase', 'sale']),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive().optional(),
}).refine(data => {
  if (data.event_type === 'purchase' && data.unit_price === undefined) {
    return false;
  }
  return true;
}, {
  message: "Unit price is required for purchase",
  path: ["unit_price"]
});

export class InventoryController {
  public static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await QueryRepository.getProducts();
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  public static async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await QueryRepository.getInventoryOverview();
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }

  public static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = PaginationSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid pagination parameters');
      }

      const { page, limit } = parsed.data;
      const safeLimit = Math.min(limit, 100); 
      const offset = (page - 1) * safeLimit;

      const result = await QueryRepository.getTransactions(safeLimit, offset);
      
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit: safeLimit,
          total: result.total,
          totalPages: Math.ceil(result.total / safeLimit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = CreateTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid transaction parameters');
      }

      const { product_id, event_type, quantity, unit_price } = parsed.data;
      const event_id = randomUUID();

      const event = {
        event_id,
        product_id,
        event_type,
        quantity,
        ...(event_type === 'purchase' ? { unit_price } : {}),
        timestamp: new Date().toISOString(),
      };

      const producer = await getKafkaProducer();
      await producer.send({
        topic: process.env.KAFKA_TOPIC || 'inventory-events',
        messages: [
          { key: product_id, value: JSON.stringify(event) }
        ],
      });

      res.status(201).json({
        success: true,
        data: { event_id }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async simulateBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const events = [
        { product_id: 'PRD001', event_type: 'purchase', quantity: 50, unit_price: 100.0 },
        { product_id: 'PRD001', event_type: 'purchase', quantity: 30, unit_price: 120.0 },
        { product_id: 'PRD001', event_type: 'sale', quantity: 60 },
        { product_id: 'PRD002', event_type: 'purchase', quantity: 100, unit_price: 80.0 },
        { product_id: 'PRD002', event_type: 'sale', quantity: 20 },
        { product_id: 'PRD001', event_type: 'purchase', quantity: 40, unit_price: 150.0 },
        { product_id: 'PRD001', event_type: 'sale', quantity: 10 }
      ];

      // Start background process to publish events
      (async () => {
        try {
          const producer = await getKafkaProducer();
          const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
          
          for (const e of events) {
            const event = {
              event_id: randomUUID(),
              product_id: e.product_id,
              event_type: e.event_type,
              quantity: e.quantity,
              ...(e.event_type === 'purchase' ? { unit_price: e.unit_price } : {}),
              timestamp: new Date().toISOString(),
            };
            
            await producer.send({
              topic: process.env.KAFKA_TOPIC || 'inventory-events',
              messages: [
                { key: e.product_id, value: JSON.stringify(event) }
              ]
            });
            console.log(`[UI Batch Sim] Published ${e.event_type} event for ${e.product_id}`);
            await delay(1000);
          }
        } catch (err: any) {
          console.error('[UI Batch Sim] Error in background simulator:', err.message);
        }
      })();

      res.json({
        success: true,
        data: { message: 'Batch simulation started' }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resetDatabase(req: Request, res: Response, next: NextFunction) {
    try {
      await query('TRUNCATE TABLE sale_allocations, sales, inventory_batches, processed_events, event_status CASCADE');
      res.json({
        success: true,
        message: 'Database reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getHealth(req: Request, res: Response) {
    let dbStatus = 'healthy';
    let kafkaStatus = 'healthy';
    let isHealthy = true;

    // 1. Check Database
    try {
      await query('SELECT 1');
    } catch (err) {
      console.error('Health Check: DB unhealthy:', err);
      dbStatus = 'unhealthy';
      isHealthy = false;
    }

    // 2. Check Kafka
    try {
      const admin = kafka.admin();
      await admin.connect();
      await admin.disconnect();
    } catch (err) {
      console.error('Health Check: Kafka unhealthy:', err);
      kafkaStatus = 'unhealthy';
      isHealthy = false;
    }

    const payload = {
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        services: {
          api: { status: 'healthy' },
          database: { status: dbStatus },
          kafka: { status: kafkaStatus }
        },
        timestamp: new Date().toISOString()
      }
    };

    if (isHealthy) {
      res.json(payload);
    } else {
      res.status(503).json(payload);
    }
  }

  public static async getTransactionDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Transaction ID is required');
      }

      // Check if it's a sale
      const saleQuery = 'SELECT * FROM sales WHERE id = $1';
      const saleRes = await query(saleQuery, [id]);
      
      if (saleRes.rows.length === 0) {
        // Check if it's a purchase (batch)
        const batchQuery = 'SELECT * FROM inventory_batches WHERE id = $1';
        const batchRes = await query(batchQuery, [id]);
        
        if (batchRes.rows.length > 0) {
          res.status(400).json({
            success: false,
            message: 'FIFO allocation details are not applicable to purchase transactions.'
          });
          return;
        }
        
        res.status(404).json({
          success: false,
          message: 'Transaction not found.'
        });
        return;
      }

      const sale = saleRes.rows[0];

      // Get allocations
      const allocQuery = `
        SELECT 
          sa.batch_id,
          sa.quantity,
          sa.unit_cost,
          sa.total_cost,
          ib.remaining_quantity
        FROM sale_allocations sa
        JOIN inventory_batches ib ON sa.batch_id = ib.id
        WHERE sa.sale_id = $1
        ORDER BY ib.purchased_at ASC;
      `;
      const allocRes = await query(allocQuery, [id]);

      res.json({
        success: true,
        data: {
          id: sale.id,
          productId: sale.product_id,
          quantity: parseInt(sale.quantity, 10),
          totalCost: parseFloat(sale.total_cost),
          soldAt: sale.sold_at,
          allocations: allocRes.rows.map(row => ({
            batchId: row.batch_id,
            quantity: parseInt(row.quantity, 10),
            unitCost: parseFloat(row.unit_cost),
            totalCost: parseFloat(row.total_cost),
            remainingQuantity: parseInt(row.remaining_quantity, 10)
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getSingleInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.productId as string;
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const result = await QueryRepository.getInventoryProduct(productId);
      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Product not found in inventory.'
        });
        return;
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getEventStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.eventId as string;
      if (!eventId) {
        throw new ValidationError('Event ID is required');
      }

      const status = await EventRepository.getEventStatus(eventId);
      if (!status) {
        res.status(404).json({
          success: false,
          message: 'Event not found.'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          eventId: status.event_id,
          status: status.status,
          eventType: status.event_type,
          productId: status.product_id,
          quantity: status.quantity,
          steps: status.steps,
          errorMessage: status.error_message
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async simulateScenario(req: Request, res: Response, next: NextFunction) {
    try {
      const { scenario_id } = req.body;
      if (!scenario_id) {
        throw new ValidationError('Scenario ID is required');
      }

      // Predefined scenarios
      const scenarios: Record<string, Array<{ product_id: string; event_type: 'purchase' | 'sale'; quantity: number; unit_price?: number }>> = {
        'scenario-1': [
          { product_id: 'PRD001', event_type: 'purchase', quantity: 50, unit_price: 100.0 },
          { product_id: 'PRD001', event_type: 'purchase', quantity: 30, unit_price: 120.0 },
          { product_id: 'PRD001', event_type: 'sale', quantity: 20 }
        ],
        'scenario-2': [
          { product_id: 'PRD001', event_type: 'purchase', quantity: 50, unit_price: 100.0 },
          { product_id: 'PRD001', event_type: 'purchase', quantity: 30, unit_price: 120.0 },
          { product_id: 'PRD001', event_type: 'sale', quantity: 60 }
        ],
        'scenario-3': [
          { product_id: 'PRD001', event_type: 'purchase', quantity: 50, unit_price: 100.0 },
          { product_id: 'PRD002', event_type: 'purchase', quantity: 100, unit_price: 80.0 },
          { product_id: 'PRD001', event_type: 'sale', quantity: 20 }
        ],
        'scenario-4': [
          { product_id: 'PRD001', event_type: 'purchase', quantity: 50, unit_price: 100.0 },
          { product_id: 'PRD001', event_type: 'sale', quantity: 50 }
        ],
        'scenario-5': [
          { product_id: 'PRD001', event_type: 'purchase', quantity: 20, unit_price: 100.0 },
          { product_id: 'PRD001', event_type: 'sale', quantity: 50 }
        ]
      };

      const scenarioEvents = scenarios[scenario_id];
      if (!scenarioEvents) {
        throw new ValidationError('Invalid scenario ID');
      }

      // Clean database state first
      await query('TRUNCATE TABLE sale_allocations, sales, inventory_batches, processed_events, event_status CASCADE');

      const eventsWithIds = scenarioEvents.map(e => ({
        event_id: randomUUID(),
        ...e
      }));

      // Initialize all event statuses as PENDING
      for (const e of eventsWithIds) {
        await EventRepository.createEventStatus(
          e.event_id,
          e.event_type,
          e.product_id,
          e.quantity,
          e.unit_price || null,
          EventRepository.initialSteps()
        );
      }

      // Background process to publish events
      (async () => {
        try {
          const producer = await getKafkaProducer();
          const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
          
          for (const e of eventsWithIds) {
            const eventPayload = {
              event_id: e.event_id,
              product_id: e.product_id,
              event_type: e.event_type,
              quantity: e.quantity,
              ...(e.event_type === 'purchase' ? { unit_price: e.unit_price } : {}),
              timestamp: new Date().toISOString(),
            };

            const steps = EventRepository.initialSteps();
            try {
              await producer.send({
                topic: process.env.KAFKA_TOPIC || 'inventory-events',
                messages: [
                  { key: e.product_id, value: JSON.stringify(eventPayload) }
                ]
              });
              
              steps[0].status = 'SUCCESS';
              await EventRepository.updateEventSteps(e.event_id, steps, 'PENDING');
            } catch (err: any) {
              steps[0].status = 'FAILED';
              steps[0].error = err.message || 'Failed to publish event';
              await EventRepository.updateEventSteps(e.event_id, steps, 'FAILED', err.message || 'Failed to publish event');
            }

            console.log(`[Scenario Sim] Published ${e.event_type} event for ${e.product_id} - Qty: ${e.quantity}`);
            await delay(1000); // 1s delay
          }
        } catch (err: any) {
          console.error('[Scenario Sim] Background runner error:', err.message);
        }
      })();

      res.json({
        success: true,
        data: {
          scenario_id,
          event_ids: eventsWithIds.map(e => e.event_id)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

