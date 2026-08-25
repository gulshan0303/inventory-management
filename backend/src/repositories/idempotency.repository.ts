import { PoolClient } from 'pg';

export class IdempotencyRepository {
  /**
   * Attempts to record the event within the given transaction.
   * Returns true if successful (new event).
   * Returns false if event already exists (duplicate).
   */
  public static async recordEvent(client: PoolClient, eventId: string): Promise<boolean> {
    try {
      await client.query(`INSERT INTO processed_events (event_id) VALUES ($1)`, [eventId]);
      return true;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique violation error code
        return false;
      }
      throw error;
    }
  }
}
