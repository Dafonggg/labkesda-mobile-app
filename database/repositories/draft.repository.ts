import { db } from '../index';
import { uuidv4 } from '../../utils/uuid';

export interface DraftSamplingRecord {
  id: string;
  sync_id: string;
  jadwal_sampling_id: string;
  jenis_sample: string;
  kondisi_sample: string;
  metode_pengambilan?: string;
  suhu: string;
  cuaca: string;
  latitude: number;
  longitude: number;
  lokasi_pengambilan: string;
  waktu_pengambilan: string;
  catatan: string;
  foto_count: number;
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed';
  retry_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Insert a new draft sampling record.
 */
export async function insertDraftSampling(
  data: Omit<DraftSamplingRecord, 'id' | 'sync_id' | 'sync_status' | 'retry_count' | 'created_at' | 'updated_at'>,
): Promise<string> {
  const id = uuidv4();
  const syncId = uuidv4();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO draft_sampling (
      id, sync_id, jadwal_sampling_id, jenis_sample, kondisi_sample, metode_pengambilan,
      suhu, cuaca, latitude, longitude, lokasi_pengambilan,
      waktu_pengambilan, catatan, foto_count, sync_status, retry_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [
      id,
      syncId,
      data.jadwal_sampling_id,
      data.jenis_sample,
      data.kondisi_sample,
      data.metode_pengambilan ?? null,
      data.suhu,
      data.cuaca,
      data.latitude,
      data.longitude,
      data.lokasi_pengambilan,
      data.waktu_pengambilan,
      data.catatan,
      data.foto_count ?? 0,
      now,
      now,
    ],
  );

  return id;
}

/**
 * Get all draft sampling records.
 */
export async function getAllDrafts(): Promise<DraftSamplingRecord[]> {
  return db.getAllAsync<DraftSamplingRecord>(
    'SELECT * FROM draft_sampling ORDER BY created_at DESC',
  );
}

/**
 * Get pending (unsynced) drafts.
 */
export async function getPendingDrafts(): Promise<DraftSamplingRecord[]> {
  return db.getAllAsync<DraftSamplingRecord>(
    "SELECT * FROM draft_sampling WHERE sync_status IN ('pending', 'failed') ORDER BY created_at ASC",
  );
}

/**
 * Mark a draft as synced (completed).
 */
export async function markDraftSynced(syncId: string): Promise<void> {
  await db.runAsync(
    "UPDATE draft_sampling SET sync_status = 'completed', updated_at = ? WHERE sync_id = ?",
    [new Date().toISOString(), syncId],
  );
}

/**
 * Mark a draft as failed and increment retry count.
 */
export async function markDraftFailed(syncId: string): Promise<void> {
  await db.runAsync(
    "UPDATE draft_sampling SET sync_status = 'failed', retry_count = retry_count + 1, updated_at = ? WHERE sync_id = ?",
    [new Date().toISOString(), syncId],
  );
}

/**
 * Delete a completed draft (cleanup after confirmed sync).
 */
export async function deleteCompletedDrafts(): Promise<void> {
  await db.runAsync(
    "DELETE FROM draft_sampling WHERE sync_status = 'completed'",
  );
}

/**
 * Get count of pending drafts.
 */
export async function getPendingDraftCount(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM draft_sampling WHERE sync_status IN ('pending', 'failed')",
  );
  return result?.count ?? 0;
}
