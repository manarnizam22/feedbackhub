import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema.js';

export const DEV_DATABASE_URL = 'postgres://feedbackhub:feedbackhub-dev@localhost:5432/feedbackhub';

export type Db = ReturnType<typeof createDb>['db'];

export function createDb(connectionString = process.env.DATABASE_URL ?? DEV_DATABASE_URL) {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
