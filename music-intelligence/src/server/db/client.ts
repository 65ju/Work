import "server-only";
import { neon } from "@neondatabase/serverless";
import { ensureSchema } from "./schema";

/** Minimal query interface so the history layer is testable against an in-process Postgres. */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

const globalDb = globalThis as unknown as { __smiDb?: { db: Db; ready: Promise<void> } | null };

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** Returns null when no database is configured — the app then runs without history. */
export async function getDb(): Promise<Db | null> {
  if (globalDb.__smiDb === undefined) {
    const url = databaseUrl();
    if (!url) {
      globalDb.__smiDb = null;
    } else {
      const sql = neon(url);
      const db: Db = {
        async query<T>(text: string, params: unknown[] = []) {
          return (await sql.query(text, params)) as T[];
        },
      };
      globalDb.__smiDb = { db, ready: ensureSchema(db) };
    }
  }
  const entry = globalDb.__smiDb;
  if (!entry) return null;
  try {
    await entry.ready;
  } catch (err) {
    // Retry schema creation on the next call instead of caching a failure forever.
    globalDb.__smiDb = undefined;
    throw err;
  }
  return entry.db;
}

export const historyEnabled = () => Boolean(databaseUrl());
