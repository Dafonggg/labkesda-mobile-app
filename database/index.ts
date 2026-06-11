import * as SQLite from 'expo-sqlite';

/**
 * Open the Labkesda SQLite database (synchronous, singleton).
 * The database file is stored at the app's document directory.
 */
export const db = SQLite.openDatabaseSync('labkesda.db');

/**
 * Initialize all SQLite tables.
 * Called once during app startup.
 */
export async function initializeDatabase(): Promise<void> {
  await db.execAsync(`
    -- User session cache (backup for Secure Store)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT,
      token TEXT,
      created_at TEXT
    );

    -- Jadwal sampling (offline cache for pull sync)
    CREATE TABLE IF NOT EXISTS jadwal_sampling (
      id TEXT PRIMARY KEY,
      permohonan_id TEXT,
      lokasi TEXT,
      latitude REAL,
      longitude REAL,
      tanggal_sampling TEXT,
      status TEXT,
      jenis_sampel TEXT,
      nama_pemohon TEXT,
      instansi TEXT,
      synced INTEGER DEFAULT 1,
      created_at TEXT
    );

    -- Draft sampling (offline form data — source of truth when offline)
    -- sync_status values: draft, pending_sync, synced, failed (matches SamplingStatus enum)
    CREATE TABLE IF NOT EXISTS draft_sampling (
      id TEXT PRIMARY KEY,
      sync_id TEXT UNIQUE,
      jadwal_sampling_id TEXT,
      jenis_sample TEXT,
      kondisi_sample TEXT DEFAULT 'baik',
      metode_pengambilan TEXT,
      suhu TEXT,
      cuaca TEXT,
      latitude REAL,
      longitude REAL,
      lokasi_pengambilan TEXT,
      waktu_pengambilan TEXT,
      catatan TEXT,
      foto_count INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'draft',
      retry_count INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    -- Sampling sync queue (manages upload queue)
    -- status values: pending_sync, synced, failed (matches SamplingStatus enum)
    CREATE TABLE IF NOT EXISTS sampling_queue (
      id TEXT PRIMARY KEY,
      reference_id TEXT,
      queue_type TEXT,
      payload TEXT,
      status TEXT DEFAULT 'pending_sync',
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    -- Offline file storage references
    CREATE TABLE IF NOT EXISTS offline_files (
      id TEXT PRIMARY KEY,
      draft_sampling_id TEXT,
      sample_id TEXT,
      local_uri TEXT,
      file_type TEXT,
      uploaded INTEGER DEFAULT 0,
      created_at TEXT
    );

    -- Sync log history
    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      sync_type TEXT,
      total_data INTEGER,
      success_data INTEGER,
      failed_data INTEGER,
      status TEXT,
      message TEXT,
      synced_at TEXT
    );

    -- App settings (key-value store)
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Progressive SQLite schema updates for team scheduling columns
  try {
    await db.execAsync('ALTER TABLE jadwal_sampling ADD COLUMN anggota_1_id TEXT;');
  } catch {}
  try {
    await db.execAsync('ALTER TABLE jadwal_sampling ADD COLUMN anggota_1_name TEXT;');
  } catch {}
  try {
    await db.execAsync('ALTER TABLE jadwal_sampling ADD COLUMN anggota_2_id TEXT;');
  } catch {}
  try {
    await db.execAsync('ALTER TABLE jadwal_sampling ADD COLUMN anggota_2_name TEXT;');
  } catch {}
  try {
    await db.execAsync('ALTER TABLE jadwal_sampling ADD COLUMN ketua_id TEXT;');
  } catch {}
  try {
    await db.execAsync('ALTER TABLE jadwal_sampling ADD COLUMN ketua_name TEXT;');
  } catch {}
}
