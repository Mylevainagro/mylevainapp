/**
 * Unit tests for src/lib/offline.ts
 * Uses fake-indexeddb to simulate IndexedDB in Node.
 */

import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { openDB, type IDBPDatabase } from "idb";
import type { PendingSync } from "@/lib/types";
import {
  savePendingSync,
  getPendingEntries,
  removePendingEntry,
  syncPendingEntries,
  type SyncInsertFn,
} from "@/lib/offline";

const DB_NAME = "mylevain-offline-test";
const STORE_NAME = "pending-sync";

async function createTestDB(): Promise<IDBPDatabase> {
  // Use a unique name per test to avoid cross-contamination
  const name = `${DB_NAME}-${Date.now()}-${Math.random()}`;
  return openDB(name, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
}

function makeEntry(overrides: Partial<PendingSync> = {}): PendingSync {
  return {
    id: overrides.id ?? "entry-1",
    type: "observation",
    data: { parcelle_id: "p1", rang: 1, date: "2025-06-01" },
    created_at: "2025-06-01T10:00:00Z",
    status: "pending",
    ...overrides,
  };
}

describe("offline — savePendingSync & getPendingEntries", () => {
  let db: IDBPDatabase;

  beforeEach(async () => {
    db = await createTestDB();
  });

  it("stores and retrieves a pending entry", async () => {
    const entry = makeEntry();
    await savePendingSync(entry, db);

    const entries = await getPendingEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(entry);
  });

  it("returns empty array when no entries", async () => {
    const entries = await getPendingEntries(db);
    expect(entries).toEqual([]);
  });

  it("overwrites entry with same id (upsert)", async () => {
    const entry = makeEntry();
    await savePendingSync(entry, db);
    const updated = { ...entry, status: "syncing" as const };
    await savePendingSync(updated, db);

    const entries = await getPendingEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("syncing");
  });

  it("stores multiple entries", async () => {
    await savePendingSync(makeEntry({ id: "a" }), db);
    await savePendingSync(makeEntry({ id: "b" }), db);
    await savePendingSync(makeEntry({ id: "c" }), db);

    const entries = await getPendingEntries(db);
    expect(entries).toHaveLength(3);
  });
});

describe("offline — removePendingEntry", () => {
  let db: IDBPDatabase;

  beforeEach(async () => {
    db = await createTestDB();
  });

  it("removes an entry by id", async () => {
    await savePendingSync(makeEntry({ id: "x" }), db);
    await savePendingSync(makeEntry({ id: "y" }), db);

    await removePendingEntry("x", db);

    const entries = await getPendingEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("y");
  });

  it("does nothing when id does not exist", async () => {
    await savePendingSync(makeEntry({ id: "x" }), db);
    await removePendingEntry("nonexistent", db);

    const entries = await getPendingEntries(db);
    expect(entries).toHaveLength(1);
  });
});

describe("offline — syncPendingEntries", () => {
  let db: IDBPDatabase;

  beforeEach(async () => {
    db = await createTestDB();
  });

  it("syncs all entries successfully", async () => {
    await savePendingSync(makeEntry({ id: "a" }), db);
    await savePendingSync(makeEntry({ id: "b" }), db);

    const insertFn: SyncInsertFn = async () => ({
      error: null,
      conflict: false,
    });

    const result = await syncPendingEntries(insertFn, db);
    expect(result).toEqual({ success: 2, errors: 0 });

    // Entries should be removed after sync
    const remaining = await getPendingEntries(db);
    expect(remaining).toHaveLength(0);
  });

  it("marks failed entries as error and keeps them", async () => {
    await savePendingSync(makeEntry({ id: "a" }), db);
    await savePendingSync(makeEntry({ id: "b" }), db);

    const insertFn: SyncInsertFn = async (entry) => {
      if (entry.id === "a") return { error: "Network error", conflict: false };
      return { error: null, conflict: false };
    };

    const result = await syncPendingEntries(insertFn, db);
    expect(result).toEqual({ success: 1, errors: 1 });

    const remaining = await getPendingEntries(db);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("a");
    expect(remaining[0].status).toBe("error");
  });

  it("handles conflicts by counting as success", async () => {
    await savePendingSync(makeEntry({ id: "c" }), db);

    const insertFn: SyncInsertFn = async () => ({
      error: null,
      conflict: true,
    });

    const result = await syncPendingEntries(insertFn, db);
    expect(result).toEqual({ success: 1, errors: 0 });

    // Entry removed after conflict resolution
    const remaining = await getPendingEntries(db);
    expect(remaining).toHaveLength(0);
  });

  it("returns zeros when no entries to sync", async () => {
    const insertFn: SyncInsertFn = async () => ({
      error: null,
      conflict: false,
    });

    const result = await syncPendingEntries(insertFn, db);
    expect(result).toEqual({ success: 0, errors: 0 });
  });

  it("all entries fail — all marked as error", async () => {
    await savePendingSync(makeEntry({ id: "x" }), db);
    await savePendingSync(makeEntry({ id: "y" }), db);

    const insertFn: SyncInsertFn = async () => ({
      error: "Server down",
      conflict: false,
    });

    const result = await syncPendingEntries(insertFn, db);
    expect(result).toEqual({ success: 0, errors: 2 });

    const remaining = await getPendingEntries(db);
    expect(remaining).toHaveLength(2);
    expect(remaining.every((e) => e.status === "error")).toBe(true);
  });
});
