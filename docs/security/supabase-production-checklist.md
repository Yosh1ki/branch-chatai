# Supabase Production Security Checklist

This checklist assumes this project architecture:
- App auth: NextAuth (not Supabase Auth)
- DB access: Prisma direct connection from backend
- Supabase role for runtime: `app_prisma`
- Supabase role for migrations: `postgres`

## 1. Secret Rotation

Rotate in Supabase Dashboard:
- Database password
- `service_role` key
- `anon` key

Then immediately update hosting environment variables and redeploy.

## 2. Least-Privilege Runtime Role

Run [`scripts/sql/supabase-hardening.sql`](/Users/yosh_red/dev/private/branch-chatai/scripts/sql/supabase-hardening.sql) after migrations.

Set environment variables:
- `DATABASE_URL_RUNTIME`: `app_prisma` connection string
- `MIGRATE_DATABASE_URL`: `postgres` connection string

## 3. Data API

If you do not call Supabase Data API directly from your app, disable it in:
- Supabase Dashboard -> Project Settings -> Data API

## 4. SSL Enforcement

Ensure every Postgres URL includes:
- `?sslmode=require`

## 5. Backup / PITR / Audit

Confirm in Supabase Dashboard:
- Backups are enabled
- PITR (Point In Time Recovery) is enabled for your plan
- Logs are retained and searchable

Document an incident flow:
- Who gets paged
- Where logs are checked
- How DB restore is executed
