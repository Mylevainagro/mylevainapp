/**
 * Mode offline — IndexedDB storage & sync
 * Uses `idb` library for IndexedDB wrapper.
 * Dependency-injectable for testability: pure logic functions accept a db handle.
 *
 * Database: mylevain-offline, Store: pending-sync
 */

import { openDB, type IDBPDatabase } from "idb";
import type { PendingSync } from "@/lib/types";

// ---- DB schema ----

const DB_NAME = "mylevain-offline";
const STORE_NAME = "pending-sync";
const DB_VERSION = 1;

export interface OfflineDB {
  "pending-sync": {
    key: string;
    value: PendingSync;
  };
}

// ---- DB access (lazy singleton) ----

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/** Reset the cached DB promise (useful for tests). */
export function resetDB(): void {
  dbPromise = null;
}

// ---- Core CRUD (dependency-injectable) ----

/**
 * Store a pending sync entry in IndexedDB.
 * Accepts an optional db handle for testing.
 */
export async function savePendingSync(
  entry: PendingSync,
  db?: IDBPDatabase,
): Promise<void> {
  const store = db ?? (await getDB());
  await store.put(STORE_NAME, entry);
}

/**
 * Retrieve all pending entries from IndexedDB.
 */
export async function getPendingEntries(
  db?: IDBPDatabase,
): Promise<PendingSync[]> {
  const store = db ?? (await getDB());
  return (await store.getAll(STORE_NAME)) as PendingSync[];
}

/**
 * Remove a synced entry by id.
 */
export async function removePendingEntry(
  id: string,
  db?: IDBPDatabase,
): Promise<void> {
  const store = db ?? (await getDB());
  await store.delete(STORE_NAME, id);
}

// ---- Sync logic ----

/**
 * Default Supabase inserter — used in production.
 * Dynamically imports the Supabase client to avoid bundling issues in tests.
 */
async function defaultInsert(
  entry: PendingSync,
): Promise<{ error: string | null; conflict: boolean }> {
  const { supabase } = await import("@/lib/supabase/client");

  const table = entry.type === "observation" ? "observations" : "traitements";

  // Try insert
  const { error } = await supabase.from(table).insert(entry.data);

  if (error) {
    // Conflict detection: unique violation or row already exists
    const isConflict =
      error.code === "23505" || error.message?.includes("duplicate");

    if (isConflict) {
      // Keep both versions: insert with a new id suffix to preserve local version
      const conflictData = {
        ...entry.data,
        id: `${entry.data.id ?? entry.id}_offline`,
        commentaires: `[CONFLIT SYNC] ${(entry.data.commentaires as string) ?? ""}`.trim(),
      };
      const { error: conflictError } = await supabase
        .from(table)
        .insert(conflictData);

      return {
        error: conflictError ? conflictError.message : null,
        conflict: true,
      };
    }

    return { error: error.message, conflict: false };
  }

  return { error: null, conflict: false };
}

export type SyncInsertFn = (
  entry: PendingSync,
) => Promise<{ error: string | null; conflict: boolean }>;

/**
 * Sync all pending entries to Supabase.
 * Handles conflicts by keeping both versions (Exigence 10.5).
 *
 * @param insertFn — injectable inserter for testing
 * @param db — injectable db handle for testing
 */
export async function syncPendingEntries(
  insertFn: SyncInsertFn = defaultInsert,
  db?: IDBPDatabase,
): Promise<{ success: number; errors: number }> {
  const entries = await getPendingEntries(db);
  let success = 0;
  let errors = 0;

  for (const entry of entries) {
    // Mark as syncing
    const syncing: PendingSync = { ...entry, status: "syncing" };
    await savePendingSync(syncing, db);

    const result = await insertFn(entry);

    if (result.error) {
      // Mark as error, keep in queue
      const errored: PendingSync = { ...entry, status: "error" };
      await savePendingSync(errored, db);
      errors++;
    } else {
      // Success (or conflict resolved) — remove from queue
      await removePendingEntry(entry.id, db);
      success++;
    }
  }

  return { success, errors };
}
