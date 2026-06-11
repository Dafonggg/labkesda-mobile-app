import { db } from '../index';
import type { JadwalSamplingData } from '@/services/jadwal.service';

export interface JadwalRecord {
  id: string;
  permohonan_id: string;
  lokasi: string;
  latitude: number | null;
  longitude: number | null;
  tanggal_sampling: string;
  status: string;
  jenis_sampel: string | null;
  nama_pemohon: string | null;
  instansi: string | null;
  synced: number;
  created_at: string;
  anggota_1_id?: string | null;
  anggota_1_name?: string | null;
  anggota_2_id?: string | null;
  anggota_2_name?: string | null;
  ketua_id?: string | null;
  ketua_name?: string | null;
}

/**
 * Upsert jadwal sampling records from API (pull sync).
 */
export async function upsertJadwalFromApi(items: JadwalSamplingData[]): Promise<void> {
  for (const item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO jadwal_sampling (
        id, permohonan_id, lokasi, latitude, longitude, tanggal_sampling,
        status, jenis_sampel, nama_pemohon, instansi, synced, created_at,
        anggota_1_id, anggota_1_name, anggota_2_id, anggota_2_name, ketua_id, ketua_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.permohonan_id,
        item.lokasi,
        (item.latitude ?? null) as number | null,
        (item.longitude ?? null) as number | null,
        item.tanggal_sampling,
        item.status,
        ((item.permohonan?.jenis_sampel ?? item.permohonan?.jenis_sample ?? null) as string | null),
        ((item.permohonan?.nama_pemohon ?? null) as string | null),
        ((item.permohonan?.instansi ?? null) as string | null),
        item.created_at,
        (item.anggota_1_id ?? null) as string | null,
        ((item.anggota_1?.name ?? null) as string | null),
        (item.anggota_2_id ?? null) as string | null,
        ((item.anggota_2?.name ?? null) as string | null),
        (item.petugas_lapangan_id ?? null) as string | null,
        ((item.petugas_lapangan?.name ?? item.petugas?.name ?? null) as string | null),
      ],
    );
  }
}

/**
 * Get all jadwal from local SQLite.
 */
export async function getAllJadwalLocal(): Promise<JadwalRecord[]> {
  return db.getAllAsync<JadwalRecord>(
    'SELECT * FROM jadwal_sampling ORDER BY tanggal_sampling DESC',
  );
}

/**
 * Get jadwal for today.
 */
export async function getTodayJadwalLocal(): Promise<JadwalRecord[]> {
  const localToday = new Date();
  const tYear = localToday.getFullYear();
  const tMonth = String(localToday.getMonth() + 1).padStart(2, '0');
  const tDay = String(localToday.getDate()).padStart(2, '0');
  const today = `${tYear}-${tMonth}-${tDay}`;
  return db.getAllAsync<JadwalRecord>(
    "SELECT * FROM jadwal_sampling WHERE date(tanggal_sampling) = ? OR status IN ('berlangsung', 'in_progress') ORDER BY tanggal_sampling ASC",
    [today],
  );
}

/**
 * Get count of today's jadwal.
 */
export async function getTodayJadwalCount(): Promise<number> {
  const localToday = new Date();
  const tYear = localToday.getFullYear();
  const tMonth = String(localToday.getMonth() + 1).padStart(2, '0');
  const tDay = String(localToday.getDate()).padStart(2, '0');
  const today = `${tYear}-${tMonth}-${tDay}`;
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM jadwal_sampling WHERE date(tanggal_sampling) = ? OR status IN ('berlangsung', 'in_progress')",
    [today],
  );
  return result?.count ?? 0;
}
