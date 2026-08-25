import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock DB
jest.mock('../../src/config/db', () => ({
  query: jest.fn()
}));

// Mock Kafka
jest.mock('../../src/kafka/producer', () => ({
  getKafkaProducer: (jest.fn() as any).mockImplementation(() => Promise.resolve({
    send: (jest.fn() as any).mockResolvedValue([{ topic: 'test', partition: 0, baseOffset: '0' }]),
    connect: (jest.fn() as any).mockResolvedValue(undefined),
    disconnect: (jest.fn() as any).mockResolvedValue(undefined),
    admin: (jest.fn() as any).mockReturnValue({
      connect: (jest.fn() as any).mockResolvedValue(undefined),
      disconnect: (jest.fn() as any).mockResolvedValue(undefined),
      describeCluster: (jest.fn() as any).mockResolvedValue({ brokers: [{ id: 1, host: 'localhost', port: 9092 }] })
    })
  })),
  kafka: {
    admin: (jest.fn() as any).mockReturnValue({
      connect: (jest.fn() as any).mockResolvedValue(undefined),
      disconnect: (jest.fn() as any).mockResolvedValue(undefined),
      describeCluster: (jest.fn() as any).mockResolvedValue({ brokers: [{ id: 1, host: 'localhost', port: 9092 }] })
    })
  }
}));

import { query } from '../../src/config/db';
import { InventoryController } from '../../src/controllers/inventory.controller';

const mockQuery = query as any;

describe('Enhancements API Integration Tests', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      query: {},
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('GET /api/health', () => {
    it('should return 200 and healthy when DB and Kafka are up', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ now: new Date() }] });

      await InventoryController.getHealth(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'healthy',
            services: expect.objectContaining({
              api: { status: 'healthy' },
              database: { status: 'healthy' },
              kafka: { status: 'healthy' }
            })
          })
        })
      );
    });

    it('should return 503 and degraded when DB is down', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Connection Refused'));

      await InventoryController.getHealth(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: expect.objectContaining({
            status: 'degraded',
            services: expect.objectContaining({
              database: { status: 'unhealthy' }
            })
          })
        })
      );
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return 404 when transaction is not found', async () => {
      mockReq.params.id = '6cb7f3e8-5d27-4bf7-9a8c-a1d2e3f4b5c6';
      mockQuery.mockResolvedValueOnce({ rows: [] }); // sales search
      mockQuery.mockResolvedValueOnce({ rows: [] }); // inventory_batches search

      await InventoryController.getTransactionDetails(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Transaction not found.'
        })
      );
    });

    it('should return 400 when transaction is a purchase (not a sale)', async () => {
      mockReq.params.id = '6cb7f3e8-5d27-4bf7-9a8c-a1d2e3f4b5c6';
      mockQuery.mockResolvedValueOnce({ rows: [] }); // sales search (not found)
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '6cb7f3e8-5d27-4bf7-9a8c-a1d2e3f4b5c6'
        }]
      }); // inventory_batches search (found purchase)

      await InventoryController.getTransactionDetails(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'FIFO allocation details are not applicable to purchase transactions.'
        })
      );
    });

    it('should return 200 and details for a sale transaction', async () => {
      mockReq.params.id = '6cb7f3e8-5d27-4bf7-9a8c-a1d2e3f4b5c6';
      // 1. Transaction query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: '6cb7f3e8-5d27-4bf7-9a8c-a1d2e3f4b5c6',
          product_id: 'PRD001',
          transaction_type: 'sale',
          quantity: 60,
          total_cost: '6200.00',
          timestamp: '2026-08-25T08:00:00Z'
        }]
      });
      // 2. Allocations query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            batch_id: 'batch-1',
            quantity_allocated: 50,
            unit_price: '100.00',
            total_allocated_cost: '5000.00',
            remaining_quantity: 0
          },
          {
            batch_id: 'batch-2',
            quantity_allocated: 10,
            unit_price: '120.00',
            total_allocated_cost: '1200.00',
            remaining_quantity: 20
          }
        ]
      });

      await InventoryController.getTransactionDetails(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: '6cb7f3e8-5d27-4bf7-9a8c-a1d2e3f4b5c6',
            quantity: 60,
            totalCost: 6200.00,
            allocations: expect.any(Array)
          })
        })
      );
    });
  });

  describe('GET /api/events/:eventId/status', () => {
    it('should return event status and steps', async () => {
      mockReq.params.eventId = 'f7d3a2e1-a37f-4f51-873b-489cd34ef234';
      mockQuery.mockResolvedValueOnce({
        rows: [{
          event_id: 'f7d3a2e1-a37f-4f51-873b-489cd34ef234',
          status: 'SUCCESS',
          event_type: 'sale',
          product_id: 'PRD001',
          quantity: 60,
          steps: JSON.stringify([
            { name: 'PUBLISHED', status: 'SUCCESS' },
            { name: 'CONSUMED', status: 'SUCCESS' }
          ]),
          error_message: null
        }]
      });

      await InventoryController.getEventStatus(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            eventId: 'f7d3a2e1-a37f-4f51-873b-489cd34ef234',
            status: 'SUCCESS',
            steps: expect.any(Array)
          })
        })
      );
    });
  });

  describe('POST /api/simulate-scenario', () => {
    it('should initialize scenario events status and trigger async simulation', async () => {
      mockReq.body.scenario_id = 'scenario-1';
      mockQuery.mockResolvedValue({ rows: [] }); // TRUNCATE and INSERTs

      await InventoryController.simulateScenario(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            scenario_id: 'scenario-1',
            event_ids: expect.any(Array)
          })
        })
      );
    });
  });
});
