import { getPendingDrafts, markDraftSynced, markDraftFailed } from '../repositories/draft.repository';
import { getUnuploadedFiles, markFileUploaded } from '../repositories/file.repository';
import { insertSyncLog } from '../repositories/sync.repository';
import { syncSampling, uploadSampleImage } from '@/services/sampling.service';
import { useSyncStore } from '@/stores/sync.store';
import { useNetworkStore } from '@/stores/network.store';
import type { SyncSamplingItem } from '@/services/sampling.service';

/**
 * Exponential backoff delays (in ms) for retry.
 */
const RETRY_DELAYS = [5000, 10000, 30000, 60000];
const MAX_RETRIES = 5;

/**
 * Execute the full sync pipeline:
 * 1. Check if online
 * 2. Get pending drafts from SQLite
 * 3. Upload pending files first
 * 4. Batch sync sampling data
 * 5. Update statuses
 * 6. Log result
 */
export async function executeSyncPipeline(): Promise<{
  synced: number;
  failed: number;
  total: number;
}> {
  const isOnline = useNetworkStore.getState().isOnline;
  if (!isOnline) {
    return { synced: 0, failed: 0, total: 0 };
  }

  const { setSyncStatus, setSyncProgress, markSynced: markStoreSynced, setPendingCount } =
    useSyncStore.getState();

  setSyncStatus('syncing');
  setSyncProgress(0);

  const pendingDrafts = await getPendingDrafts();
  const total = pendingDrafts.length;

  if (total === 0) {
    setSyncStatus('idle');
    return { synced: 0, failed: 0, total: 0 };
  }

  let synced = 0;
  let failed = 0;

  // Step 1: Upload pending files for each draft
  for (const draft of pendingDrafts) {
    try {
      const pendingFiles = await getUnuploadedFiles(draft.id);
      for (const file of pendingFiles) {
        try {
          const formData = new FormData();
          formData.append('image', {
            uri: file.local_uri,
            type: `image/${file.file_type}`,
            name: `sample_${file.id}.${file.file_type}`,
          } as unknown as Blob);
          formData.append('draft_sampling_id', draft.id);

          await uploadSampleImage(formData);
          await markFileUploaded(file.id);
        } catch {
          // File upload failure doesn't block sampling sync
        }
      }
    } catch {
      // Continue with sync even if file operations fail
    }
  }

  setSyncProgress(30);

  // Step 2: Batch sync sampling data
  const samples: SyncSamplingItem[] = pendingDrafts
    .filter((d) => d.retry_count < MAX_RETRIES)
    .map((d) => {
      let jumlah_sample: number | undefined;
      let jumlah_sample_unit: string | undefined;
      let jumlah_sample_detail: string | undefined;
      try {
        if (d.catatan) {
          const parsed = JSON.parse(d.catatan);
          jumlah_sample = typeof parsed.jumlah_sample === 'number' ? parsed.jumlah_sample : parseFloat(parsed.jumlah_sample);
          jumlah_sample_unit = parsed.jumlah_sample_unit || undefined;
          jumlah_sample_detail = parsed.jumlah_sample_detail || undefined;
        }
      } catch (e) {
        // Fallback if not valid JSON
      }

      return {
        sync_id: d.sync_id,
        jadwal_sampling_id: d.jadwal_sampling_id,
        jenis_sample: d.jenis_sample,
        kondisi_sample: d.kondisi_sample,
        suhu: d.suhu,
        cuaca: d.cuaca,
        latitude: d.latitude,
        longitude: d.longitude,
        lokasi_pengambilan: d.lokasi_pengambilan,
        waktu_pengambilan: d.waktu_pengambilan,
        catatan: d.catatan,
        jumlah_sample: isNaN(jumlah_sample as number) ? undefined : jumlah_sample,
        jumlah_sample_unit,
        jumlah_sample_detail,
      };
    });

  if (samples.length > 0) {
    try {
      const response = await syncSampling({ samples });

      setSyncProgress(80);

      // Mark successful ones
      synced = response.data.synced;
      failed = response.data.failed;

      // Mark each draft accordingly
      for (const draft of pendingDrafts) {
        const isFailed = response.data.errors?.some((e) => e.sync_id === draft.sync_id);
        if (isFailed) {
          await markDraftFailed(draft.sync_id);
        } else {
          await markDraftSynced(draft.sync_id);
        }
      }
    } catch {
      // Entire batch failed
      failed = samples.length;
      for (const draft of pendingDrafts) {
        await markDraftFailed(draft.sync_id);
      }
    }
  }

  setSyncProgress(100);

  // Step 3: Log the sync result
  await insertSyncLog({
    sync_type: 'push',
    total_data: total,
    success_data: synced,
    failed_data: failed,
    status: failed === 0 ? 'completed' : 'partial',
    message: `Synced ${synced}/${total} samples`,
    synced_at: new Date().toISOString(),
  });

  // Step 4: Update store
  if (failed === 0) {
    markStoreSynced();
  } else {
    setSyncStatus('failed');
  }

  // Refresh pending count
  const { getPendingDraftCount } = await import('../repositories/draft.repository');
  const newCount = await getPendingDraftCount();
  setPendingCount(newCount);

  return { synced, failed, total };
}

/**
 * Get retry delay for a given attempt.
 */
export function getRetryDelay(retryCount: number): number {
  if (retryCount >= RETRY_DELAYS.length) return RETRY_DELAYS[RETRY_DELAYS.length - 1];
  return RETRY_DELAYS[retryCount];
}
