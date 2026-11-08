import { describe, expect, it } from 'vitest';
import { credentialsSchema } from './usernameAuth';

describe('username-only accounts', () => {
  it('normalizes usernames to lowercase and trims whitespace', () => {
    const parsed = credentialsSchema.parse({ username: '  Sennin_01  ', password: 'strong-password' });
    expect(parsed.username).toBe('sennin_01');
  });
  it('rejects email addresses as usernames', () => {
    expect(credentialsSchema.safeParse({ username: 'name@example.com', password: 'strong-password' }).success).toBe(false);
  });
  it('treats differently cased usernames as the same account', () => {
    const a = credentialsSchema.parse({ username: 'SENNIN', password: 'strong-password' }).username;
    const b = credentialsSchema.parse({ username: 'sennin', password: 'strong-password' }).username;
    expect(a).toBe(b);
  });
});
