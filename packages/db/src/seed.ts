/* Deterministic, idempotent seed: fixed UUIDs everywhere so re-running changes
   nothing and e2e tests can rely on the data. Dev user ids match the Keycloak
   realm import (infra/keycloak/realm-feedbackhub.json). */
import { createDb } from './client.js';
import {
  appSettings,
  categories,
  comments,
  feedbackRequests,
  statuses,
  users,
  userPreferences,
  votes,
} from './schema.js';

export const SEED = {
  users: {
    alice: '11111111-1111-4111-8111-111111111111',
    admin: '22222222-2222-4222-8222-222222222222',
  },
  categories: {
    bug: 'a1000000-0000-4000-8000-000000000001',
    feature: 'a1000000-0000-4000-8000-000000000002',
    improvement: 'a1000000-0000-4000-8000-000000000003',
    question: 'a1000000-0000-4000-8000-000000000004',
  },
  statuses: {
    new: 'b1000000-0000-4000-8000-000000000001',
    underReview: 'b1000000-0000-4000-8000-000000000002',
    planned: 'b1000000-0000-4000-8000-000000000003',
    inProgress: 'b1000000-0000-4000-8000-000000000004',
    done: 'b1000000-0000-4000-8000-000000000005',
    declined: 'b1000000-0000-4000-8000-000000000006',
  },
} as const;

const req = (n: number) => `c1000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const com = (n: number) => `d1000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function main() {
  const { db, pool } = createDb();

  await db
    .insert(users)
    .values([
      { id: SEED.users.alice, email: 'alice@dev.local', displayName: 'Alice Dev' },
      { id: SEED.users.admin, email: 'admin@dev.local', displayName: 'Ada Admin', isAdmin: true },
    ])
    .onConflictDoNothing();

  await db
    .insert(userPreferences)
    .values([{ userId: SEED.users.alice }, { userId: SEED.users.admin }])
    .onConflictDoNothing();

  await db
    .insert(categories)
    .values([
      { id: SEED.categories.bug, name: 'Bug', position: 1 },
      { id: SEED.categories.feature, name: 'Feature', position: 2 },
      { id: SEED.categories.improvement, name: 'Improvement', position: 3 },
      { id: SEED.categories.question, name: 'Question', position: 4 },
    ])
    .onConflictDoNothing();

  await db
    .insert(statuses)
    .values([
      { id: SEED.statuses.new, name: 'New', position: 1, isDefault: true },
      { id: SEED.statuses.underReview, name: 'Under Review', position: 2 },
      { id: SEED.statuses.planned, name: 'Planned', position: 3 },
      { id: SEED.statuses.inProgress, name: 'In Progress', position: 4 },
      { id: SEED.statuses.done, name: 'Done', position: 5 },
      { id: SEED.statuses.declined, name: 'Declined', position: 6 },
    ])
    .onConflictDoNothing();

  await db
    .insert(appSettings)
    .values([
      { key: 'registration_policy', value: { mode: 'open', allowedDomains: [] } },
      { key: 'comments_require_approval', value: false },
      { key: 'submissions_per_user_per_day', value: 10 },
      { key: 'feature_flags', value: { compactList: false } },
    ])
    .onConflictDoNothing();

  const c = SEED.categories;
  const s = SEED.statuses;
  const u = SEED.users;
  await db
    .insert(feedbackRequests)
    .values([
      {
        id: req(1),
        title: 'Dark mode for the dashboard',
        description: 'The dashboard is blinding during late shifts. A dark theme would help a lot.',
        categoryId: c.feature,
        statusId: s.inProgress,
        authorId: u.alice,
        pinned: true,
      },
      {
        id: req(2),
        title: 'Export requests as CSV',
        description:
          'Product reviews happen in spreadsheets; an export button would save copy-pasting.',
        categoryId: c.feature,
        statusId: s.planned,
        authorId: u.alice,
      },
      {
        id: req(3),
        title: 'Search ignores accented characters',
        description: 'Searching for "café" does not match "cafe". Diacritics should be folded.',
        categoryId: c.bug,
        statusId: s.underReview,
        authorId: u.admin,
      },
      {
        id: req(4),
        title: 'Slow list loading on mobile',
        description: 'The request list takes >3s on 4G. Probably needs pagination tuning.',
        categoryId: c.bug,
        statusId: s.new,
        authorId: u.alice,
      },
      {
        id: req(5),
        title: 'Keyboard shortcut for new request',
        description: 'Power users file many requests; "n" as a shortcut would be neat.',
        categoryId: c.improvement,
        statusId: s.new,
        authorId: u.admin,
      },
      {
        id: req(6),
        title: 'Weekly digest email',
        description:
          'A summary of top-voted requests every Monday would keep everyone in the loop.',
        categoryId: c.feature,
        statusId: s.declined,
        authorId: u.alice,
      },
      {
        id: req(7),
        title: 'Show vote trends over time',
        description: 'It would help triage to see whether interest in a request is growing.',
        categoryId: c.feature,
        statusId: s.new,
        authorId: u.admin,
      },
      {
        id: req(8),
        title: 'Clarify status meanings',
        description:
          'What is the difference between Planned and Under Review? A legend would help.',
        categoryId: c.question,
        statusId: s.done,
        authorId: u.alice,
      },
      {
        id: req(9),
        title: 'Duplicate detection on submit',
        description: 'Suggest similar existing requests while typing a title to reduce duplicates.',
        categoryId: c.improvement,
        statusId: s.planned,
        authorId: u.admin,
      },
      {
        id: req(10),
        title: 'Attachment support for bug reports',
        description: 'Screenshots say more than a thousand words; allow small image uploads.',
        categoryId: c.feature,
        statusId: s.underReview,
        authorId: u.alice,
      },
      {
        id: req(11),
        title: 'Typo on the settings page',
        description: '"Prefrences" should be "Preferences" in the sidebar.',
        categoryId: c.bug,
        statusId: s.done,
        authorId: u.admin,
      },
      {
        id: req(12),
        title: 'Group requests by category in list',
        description: 'An optional grouped view would make browsing large lists easier.',
        categoryId: c.improvement,
        statusId: s.new,
        authorId: u.alice,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(votes)
    .values([
      { requestId: req(1), userId: u.alice },
      { requestId: req(1), userId: u.admin },
      { requestId: req(2), userId: u.admin },
      { requestId: req(3), userId: u.alice },
      { requestId: req(4), userId: u.admin },
      { requestId: req(7), userId: u.alice },
      { requestId: req(9), userId: u.alice },
      { requestId: req(9), userId: u.admin },
      { requestId: req(10), userId: u.admin },
    ])
    .onConflictDoNothing();

  await db
    .insert(comments)
    .values([
      {
        id: com(1),
        requestId: req(1),
        authorId: u.admin,
        body: 'Design is reviewing palette options this week.',
      },
      {
        id: com(2),
        requestId: req(1),
        authorId: u.alice,
        body: 'Happy to beta test — my eyes thank you in advance.',
      },
      {
        id: com(3),
        requestId: req(2),
        authorId: u.admin,
        body: 'Would Excel-compatible CSV (semicolons) matter for you?',
      },
      {
        id: com(4),
        requestId: req(3),
        authorId: u.alice,
        body: 'Also affects "ü" — searching "uber" misses "über".',
      },
      {
        id: com(5),
        requestId: req(6),
        authorId: u.admin,
        body: 'Declining for now: notification preferences land first; a digest builds on them.',
      },
      {
        id: com(6),
        requestId: req(8),
        authorId: u.admin,
        body: 'Added a legend to the status dropdown — marking as done.',
      },
      {
        id: com(7),
        requestId: req(9),
        authorId: u.alice,
        body: 'This would have saved me from filing #11 twice, sorry about that.',
      },
    ])
    .onConflictDoNothing();

  const counts = await Promise.all([
    pool.query('SELECT count(*) FROM users'),
    pool.query('SELECT count(*) FROM categories'),
    pool.query('SELECT count(*) FROM statuses'),
    pool.query('SELECT count(*) FROM feedback_requests'),
    pool.query('SELECT count(*) FROM votes'),
    pool.query('SELECT count(*) FROM comments'),
    pool.query('SELECT count(*) FROM app_settings'),
  ]);
  const [numUsers, cats, stats, reqs, vts, cmts, settings] = counts.map((r) => r.rows[0].count);
  console.log(
    `seeded: ${numUsers} users, ${cats} categories, ${stats} statuses, ${reqs} requests, ${vts} votes, ${cmts} comments, ${settings} settings`,
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
