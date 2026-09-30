# Backups

The free Supabase plan has no backups you can restore on demand, so a GitHub Actions job
(`.github/workflows/backup.yml`) takes one every Sunday night and keeps it for 30 days.

- **What's in it:** the `public` schema (everything BondhuKoi stores) and `auth` (accounts).
  Storage files (avatars, zone pictures) are not included; they can be re-uploaded.
- **How it's protected:** the dump is encrypted with AES-256 using `BACKUP_PASSPHRASE`
  before upload. The repository is public, so never upload an unencrypted dump anywhere.
- **Turn it on:** repository variable `BACKUPS_ENABLED=true`, and in the `production`
  environment the secrets `SUPABASE_DB_URL` (session pooler) and `BACKUP_PASSPHRASE`.
- **Take one now:** Actions → Database backup → Run workflow.

## Restore

1. Actions → the backup run → download the artifact and unzip it.
2. Decrypt:
   ```bash
   gpg --decrypt bondhukoi-YYYYMMDD.dump.gpg > bondhukoi.dump
   ```
3. Restore into a **new** Supabase project (never over a live one first):
   ```bash
   npx supabase link --project-ref <new-project-ref>
   npx supabase db push                     # creates the schema
   pg_restore --data-only --no-owner --disable-triggers \
     -d "<session pooler connection string>" bondhukoi.dump
   ```
4. Point a staging API at it, check a few accounts, then switch production over if needed.
5. Delete the decrypted file when you're done.

Test a restore once before launch, and again every few months.
