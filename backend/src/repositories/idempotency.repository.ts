import { query } from '../config/db';

export class IdempotencyRepository {
  /**
   * Attempts to record the event. Returns true if successful (new event).
   * Returns false if event already exists (duplicate).
   */
  public static async recordEvent(eventId: string): Promise<boolean> {
    try {
      await query(`INSERT INTO processed_events (event_id) VALUES ($1)`, [eventId]);
      return true;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique violation error code
        return false;
      }
      throw error;
    }
  }
}
