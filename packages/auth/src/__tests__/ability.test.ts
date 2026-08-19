/* The matrix from docs/rules/security.md, row by row. If policy changes, a row
   here must fail — that is the point of these tests. */
import { subject } from '@casl/ability';
import { describe, expect, it } from 'vitest';

import { defineAbilityFor } from '../ability.js';

const ALICE = '11111111-1111-4111-8111-111111111111';
const OTHER = '99999999-9999-4999-8999-999999999999';

const user = defineAbilityFor({ id: ALICE, isAdmin: false });
const admin = defineAbilityFor({ id: ALICE, isAdmin: true });

const own = { authorId: ALICE };
const foreign = { authorId: OTHER };

describe('requests', () => {
  it('anyone reads, anyone creates', () => {
    expect(user.can('read', 'Request')).toBe(true);
    expect(user.can('create', 'Request')).toBe(true);
  });

  it('update/delete own only', () => {
    expect(user.can('update', subject('Request', { ...own }))).toBe(true);
    expect(user.can('update', subject('Request', { ...foreign }))).toBe(false);
    expect(user.can('delete', subject('Request', { ...own }))).toBe(true);
    expect(user.can('delete', subject('Request', { ...foreign }))).toBe(false);
  });

  it('admins triage but do NOT delete foreign requests', () => {
    expect(admin.can('setStatus', 'Request')).toBe(true);
    expect(admin.can('pin', 'Request')).toBe(true);
    expect(admin.can('delete', subject('Request', { ...foreign }))).toBe(false);
  });

  it('users cannot triage', () => {
    expect(user.can('setStatus', 'Request')).toBe(false);
    expect(user.can('pin', 'Request')).toBe(false);
  });
});

describe('votes', () => {
  it('own votes only, both directions', () => {
    expect(user.can('create', subject('Vote', { userId: ALICE }))).toBe(true);
    expect(user.can('create', subject('Vote', { userId: OTHER }))).toBe(false);
    expect(user.can('delete', subject('Vote', { userId: ALICE }))).toBe(true);
    expect(user.can('delete', subject('Vote', { userId: OTHER }))).toBe(false);
  });
});

describe('comments', () => {
  it('update own only — even admins do not edit others words', () => {
    expect(user.can('update', subject('Comment', { ...own }))).toBe(true);
    expect(user.can('update', subject('Comment', { ...foreign }))).toBe(false);
    expect(admin.can('update', subject('Comment', { ...foreign }))).toBe(false);
  });

  it('delete: own for users, any for admins (moderation)', () => {
    expect(user.can('delete', subject('Comment', { ...own }))).toBe(true);
    expect(user.can('delete', subject('Comment', { ...foreign }))).toBe(false);
    expect(admin.can('delete', subject('Comment', { ...foreign }))).toBe(true);
  });

  it('approval is admin-only', () => {
    expect(user.can('approve', 'Comment')).toBe(false);
    expect(admin.can('approve', 'Comment')).toBe(true);
  });
});

describe('taxonomy and settings', () => {
  it('everyone reads taxonomy, only admins manage it', () => {
    expect(user.can('read', 'Category')).toBe(true);
    expect(user.can('manage', 'Category')).toBe(false);
    expect(admin.can('manage', 'Category')).toBe(true);
    expect(admin.can('manage', 'Status')).toBe(true);
  });

  it('app settings are admin-only', () => {
    expect(user.can('manage', 'AppSettings')).toBe(false);
    expect(admin.can('manage', 'AppSettings')).toBe(true);
  });
});

describe('accounts', () => {
  it('own account only — deletion is personal even for admins', () => {
    expect(user.can('update', subject('User', { id: ALICE }))).toBe(true);
    expect(user.can('update', subject('User', { id: OTHER }))).toBe(false);
    expect(user.can('delete', subject('User', { id: ALICE }))).toBe(true);
    expect(admin.can('delete', subject('User', { id: OTHER }))).toBe(false);
  });
});

describe('audit log', () => {
  it('write-only in v1: nobody reads it, not even admins', () => {
    expect(user.can('read', 'AuditLog')).toBe(false);
    expect(admin.can('read', 'AuditLog')).toBe(false);
  });
});
