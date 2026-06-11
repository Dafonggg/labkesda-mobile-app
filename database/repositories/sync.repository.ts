import { db } from '../index';
import { uuidv4 } from '../../utils/uuid';

export interface SyncLogRecord {
  id: string;
  sync_type: string;
  total_data: number;
  success_data: number;
  failed_data: number;
  status: string;
  message: string;
  synced_at: string;
}

/**
 * Insert a sync log record.
 */
export async function insertSyncLog(
  data: Omit<SyncLogRecord, 'id'>,
): Promise<string> {
  const id = uuidv4();
  await db.runAsync(
    `INSERT INTO sync_logs (id, sync_type, total_data, success_data, failed_data, status, message, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.sync_type, data.total_data, data.success_data, data.failed_data, data.status, data.message, data.synced_at],
  );
  return id;
}

/**
 * Get recent sync logs.
 */
export async function getRecentSyncLogs(limit = 20): Promise<SyncLogRecord[]> {
  return db.getAllAsync<SyncLogRecord>(
    'SELECT * FROM sync_logs ORDER BY synced_at DESC LIMIT ?',
    [limit],
  );
}

/**
 * Get last sync time.
 */
export async function getLastSyncTime(): Promise<string | null> {
  const result = await db.getFirstAsync<{ synced_at: string }>(
    "SELECT synced_at FROM sync_logs WHERE status = 'completed' ORDER BY synced_at DESC LIMIT 1",
  );
  return result?.synced_at ?? null;
}
