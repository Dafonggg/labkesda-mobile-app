import { db } from '../index';
import { uuidv4 } from '../../utils/uuid';

export interface OfflineFileRecord {
  id: string;
  draft_sampling_id: string;
  sample_id?: string;
  local_uri: string;
  file_type: string;
  uploaded: number;
  created_at: string;
}

/**
 * Insert an offline file reference.
 */
export async function insertOfflineFile(
  draftSamplingId: string,
  localUri: string,
  fileType: string,
): Promise<string> {
  const id = uuidv4();
  await db.runAsync(
    `INSERT INTO offline_files (id, draft_sampling_id, sample_id, local_uri, file_type, uploaded, created_at)
     VALUES (?, ?, NULL, ?, ?, 0, ?)`,
    [id, draftSamplingId, localUri, fileType, new Date().toISOString()],
  );
  return id;
}

/**
 * Link a file to a backend sample_id (set after successful data sync).
 */
export async function linkFileToSample(draftSamplingId: string, sampleId: string): Promise<void> {
  await db.runAsync(
    'UPDATE offline_files SET sample_id = ? WHERE draft_sampling_id = ? AND uploaded = 0',
    [sampleId, draftSamplingId],
  );
}

/**
 * Get all un-uploaded files for a draft.
 */
export async function getUnuploadedFiles(draftSamplingId: string): Promise<OfflineFileRecord[]> {
  return db.getAllAsync<OfflineFileRecord>(
    'SELECT * FROM offline_files WHERE draft_sampling_id = ? AND uploaded = 0',
    [draftSamplingId],
  );
}

/**
 * Mark a file as uploaded.
 */
export async function markFileUploaded(id: string): Promise<void> {
  await db.runAsync('UPDATE offline_files SET uploaded = 1 WHERE id = ?', [id]);
}

/**
 * Get count of pending uploads.
 */
export async function getPendingFileCount(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_files WHERE uploaded = 0',
  );
  return result?.count ?? 0;
}
