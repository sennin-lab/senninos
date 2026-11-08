# SenniNOS updates
- [x] Username-only registration and sign-in with profiles (profiles table + trigger) and verified sessions (getUser on every session).
- [x] Original SenniNOS logo on lock screen, sign-in, and start menu.
- [x] Functional appearance settings (wallpaper synced to Supabase) and file import/export (Explorer upload/download).
- [x] Tests and desktop/mobile flow verification (unit tests for file system and formula engine; end-to-end browser checks for login, apps, store, minimize, and mobile layout).
- [ ] Verify sign-up on the production Supabase project with email confirmation disabled.
- [ ] Browser app: most external sites block iframe embedding; consider a server-side proxy if needed.
