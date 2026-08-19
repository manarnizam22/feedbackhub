import {
  AbilityBuilder,
  createMongoAbility,
  type ForcedSubject,
  type MongoAbility,
  type MongoQuery,
} from '@casl/ability';

export const subjects = [
  'Request',
  'Vote',
  'Comment',
  'Category',
  'Status',
  'AppSettings',
  'User',
  'AuditLog',
] as const;

export type SubjectName = (typeof subjects)[number];

export type Action =
  'read' | 'create' | 'update' | 'delete' | 'setStatus' | 'pin' | 'approve' | 'manage';

type OwnershipFields = Partial<{ authorId: string; userId: string; id: string }>;
type TaggedRecord = { [K in SubjectName]: OwnershipFields & ForcedSubject<K> }[SubjectName];
type Subjects = SubjectName | TaggedRecord;

export type AppAbility = MongoAbility<[Action, Subjects], MongoQuery<OwnershipFields>>;

export interface Actor {
  id: string;
  isAdmin: boolean;
}

/* Deliberate absences, per ADR-0007: admins can NOT delete requests (they
   decline via status), can NOT delete or update foreign accounts, and nobody —
   not even admins — reads the AuditLog (write-only in v1). The submission rate
   limit is a service-level rule, intentionally outside this policy. */
export function defineAbilityFor(actor: Actor): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  can('read', 'Request');
  can('create', 'Request');
  can('update', 'Request', { authorId: actor.id });
  can('delete', 'Request', { authorId: actor.id });

  can('create', 'Vote', { userId: actor.id });
  can('delete', 'Vote', { userId: actor.id });

  can('read', 'Comment');
  can('create', 'Comment');
  can('update', 'Comment', { authorId: actor.id });
  can('delete', 'Comment', { authorId: actor.id });

  can('read', 'Category');
  can('read', 'Status');

  can('read', 'User', { id: actor.id });
  can('update', 'User', { id: actor.id });
  can('delete', 'User', { id: actor.id });

  if (actor.isAdmin) {
    can('setStatus', 'Request');
    can('pin', 'Request');
    can('delete', 'Comment');
    can('approve', 'Comment');
    can('manage', 'Category');
    can('manage', 'Status');
    can('manage', 'AppSettings');
  }

  return build();
}
