import { query } from '../config/db';

export interface EventStep {
  name: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  error?: string;
}

export interface EventStatusData {
  event_id: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  event_type: 'purchase' | 'sale';
  product_id: string;
  quantity: number;
  unit_price: string | null;
  steps: EventStep[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export class EventRepository {
  public static initialSteps(): EventStep[] {
    return [
      { name: 'PUBLISHED', status: 'PENDING' },
      { name: 'CONSUMED', status: 'PENDING' },
      { name: 'VALIDATED', status: 'PENDING' },
      { name: 'FIFO_PROCESSED', status: 'PENDING' },
      { name: 'DATABASE_COMMITTED', status: 'PENDING' }
    ];
  }

  public static async createEventStatus(
    eventId: string,
    eventType: 'purchase' | 'sale',
    productId: string,
    quantity: number,
    unitPrice: number | string | null,
    steps: EventStep[]
  ): Promise<void> {
    const sql = `
      INSERT INTO event_status (event_id, status, event_type, product_id, quantity, unit_price, steps)
      VALUES ($1, 'PENDING', $2, $3, $4, $5, $6)
      ON CONFLICT (event_id) DO NOTHING;
    `;
    await query(sql, [eventId, eventType, productId, quantity, unitPrice, JSON.stringify(steps)]);
  }

  public static async updateEventSteps(
    eventId: string,
    steps: EventStep[],
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED',
    errorMessage: string | null = null
  ): Promise<void> {
    const sql = `
      UPDATE event_status
      SET steps = $1, status = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $4;
    `;
    await query(sql, [JSON.stringify(steps), status, errorMessage, eventId]);
  }

  public static async getEventStatus(eventId: string): Promise<EventStatusData | null> {
    const sql = `
      SELECT * FROM event_status WHERE event_id = $1;
    `;
    const res = await query(sql, [eventId]);
    if (res.rows.length === 0) return null;
    
    const row = res.rows[0];
    return {
      ...row,
      quantity: parseInt(row.quantity, 10),
      steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps
    };
  }
}
