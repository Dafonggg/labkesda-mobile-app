import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncSampling, uploadSampleImage } from '@/services/sampling.service';
import { useSyncStore } from '@/stores/sync.store';
import type { SyncSamplingPayload, SyncSamplingResponse } from '@/services/sampling.service';

/**
 * Sync sampling data (batch push to server).
 */
export function useSyncSampling() {
  const queryClient = useQueryClient();
  const { setSyncStatus, markSynced, decrementPending } = useSyncStore();

  return useMutation({
    mutationFn: (payload: SyncSamplingPayload) => syncSampling(payload),
    onMutate: () => {
      setSyncStatus('syncing');
    },
    onSuccess: (response) => {
      markSynced();
      decrementPending(response.data.synced);
      // Refresh jadwal list after sync
      queryClient.invalidateQueries({ queryKey: ['mobile', 'jadwal'] });
    },
    onError: () => {
      setSyncStatus('failed');
    },
  });
}

export interface PhotoUploadItem {
  uri: string;
  mimeType?: string;
  fileName?: string;
}

export interface UploadPhotosOptions {
  sampleId: string;
  photos: PhotoUploadItem[];
  onProgress?: (uploaded: number, total: number) => void;
  onPhotoSuccess?: (index: number) => void;
  onPhotoError?: (index: number, error: string) => void;
}

/**
 * Upload a batch of photos sequentially to a sample.
 * Returns count of successful uploads.
 */
export async function uploadPhotosSequentially(opts: UploadPhotosOptions): Promise<number> {
  let successCount = 0;
  for (let i = 0; i < opts.photos.length; i++) {
    const photo = opts.photos[i];
    try {
      const formData = new FormData();
      formData.append('sample_id', opts.sampleId);
      // React Native FormData file append
      formData.append('image', {
        uri: photo.uri,
        type: photo.mimeType ?? 'image/jpeg',
        name: photo.fileName ?? `sample_photo_${i + 1}.jpg`,
      } as any);
      await uploadSampleImage(formData);
      successCount++;
      opts.onPhotoSuccess?.(i);
      opts.onProgress?.(successCount, opts.photos.length);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Upload gagal';
      opts.onPhotoError?.(i, msg);
    }
  }
  return successCount;
}

/**
 * Upload a sample image (single).
 */
export function useUploadImage() {
  return useMutation({
    mutationFn: (formData: FormData) => uploadSampleImage(formData),
  });
}
