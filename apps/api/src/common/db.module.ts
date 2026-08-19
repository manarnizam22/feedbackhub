import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createDb, type Db } from '@feedbackhub/db';
import type pg from 'pg';

export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');

const connection = createDb();

/* One pool for the whole app, closed on shutdown. Inject the Drizzle instance
   with @Inject(DB). */
@Global()
@Module({
  providers: [
    { provide: DB, useValue: connection.db },
    { provide: PG_POOL, useValue: connection.pool },
  ],
  exports: [DB, PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await (connection.pool as pg.Pool).end();
  }
}

export type { Db };
