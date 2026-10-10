# Supabase setup

1. Create a Supabase project and enable Email provider under Authentication.
2. Run the SQL migration in `supabase/migrations/202610090001_fittrack.sql` using the Supabase SQL editor or `supabase db push`.
3. Put the project URL and anon key in `.env.local` using `.env.example` as the template.
4. Add the GitHub Pages URL to Authentication → URL Configuration → Site URL and Redirect URLs.

Generate production database types with the Supabase CLI:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```
