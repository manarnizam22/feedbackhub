import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();
// soft delete everywhere (ADR-0007): who deleted it and when; NULL deleted_at = live row
const deletedAt = timestamp('deleted_at', { withTimezone: true });
const deletedBy = uuid('deleted_by');

export const users = pgTable('users', {
  // Keycloak subject id — identity lives in the IdP, this row is the app-side shadow
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt,
  updatedAt,
  deletedAt,
  deletedBy,
});

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  theme: text('theme').notNull().default('system'),
  language: text('language').notNull().default('en'),
  defaultSort: text('default_sort').notNull().default('newest'),
  defaultFilters: jsonb('default_filters').notNull().default({}),
  notifyOnComment: boolean('notify_on_comment').notNull().default(true),
  updatedAt,
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  // retiring a category = active:false — existing requests keep it, new submissions can't pick it
  active: boolean('active').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt,
  updatedAt,
});

export const statuses = pgTable(
  'statuses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    position: integer('position').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => [
    // at most one default status, enforced by the database
    uniqueIndex('statuses_single_default')
      .on(t.isDefault)
      .where(sql`${t.isDefault} = true`),
  ],
);

export const feedbackRequests = pgTable(
  'feedback_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    statusId: uuid('status_id')
      .notNull()
      .references(() => statuses.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    pinned: boolean('pinned').notNull().default(false),
    createdAt,
    updatedAt,
    deletedAt,
    deletedBy,
  },
  (t) => [
    index('requests_status_idx').on(t.statusId),
    index('requests_category_idx').on(t.categoryId),
    index('requests_author_idx').on(t.authorId),
    index('requests_created_idx').on(t.createdAt),
  ],
);

export const votes = pgTable(
  'votes',
  {
    requestId: uuid('request_id')
      .notNull()
      .references(() => feedbackRequests.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    createdAt,
    // withdraw = tombstone; re-vote = clear it — the PK keeps one row per (request, user) forever
    deletedAt,
    deletedBy,
  },
  (t) => [primaryKey({ columns: [t.requestId, t.userId] })],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => feedbackRequests.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    // serves the admin setting "comments require approval"; true when approval is off
    approved: boolean('approved').notNull().default(true),
    createdAt,
    updatedAt,
    deletedAt,
    deletedBy,
  },
  (t) => [index('comments_request_idx').on(t.requestId)],
);

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt,
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    data: jsonb('data'),
    createdAt,
  },
  (t) => [
    index('audit_entity_idx').on(t.entityType, t.entityId),
    index('audit_created_idx').on(t.createdAt),
  ],
);
