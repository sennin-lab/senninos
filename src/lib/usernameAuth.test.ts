import { describe, expect, it } from 'vitest';
import { credentialsSchema, usernameToEmail } from './usernameAuth';

describe('username-only accounts', () => {
  it('uses a deterministic address without collecting email', () => {
    expect(usernameToEmail('  Sennin_01  ')).toBe('sennin_01@accounts.senninos.local');
  });
  it('rejects email addresses as usernames', () => {
    expect(credentialsSchema.safeParse({ username: 'name@example.com', password: 'strong-password' }).success).toBe(false);
  });
  it('normalizes usernames consistently for registration and login', () => {
    expect(usernameToEmail('SENNIN')).toBe(usernameToEmail('sennin'));
  });
});