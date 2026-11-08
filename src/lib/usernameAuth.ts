import { z } from 'zod';

export const usernameSchema = z.string().trim().transform(value => value.toLowerCase())
  .pipe(z.string().min(3, 'ユーザー名は3文字以上にしてください').max(24, 'ユーザー名は24文字以内にしてください')
    .regex(/^[a-z0-9_]+$/, 'ユーザー名には半角英数字と _ が使えます'));

export function usernameToEmail(username: string): string {
  return `${usernameSchema.parse(username)}@accounts.senninos.local`;
}

export const credentialsSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, 'パスワードは8文字以上にしてください').max(128, 'パスワードは128文字以内にしてください'),
});