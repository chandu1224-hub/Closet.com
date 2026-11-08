# Closet.com

Your Wardrobe. Your Style. Decided.

A mobile-first digital wardrobe and outfit planner built with React, Vite, TypeScript, Tailwind CSS and Supabase.

## Local development

1. Install Node.js 20.19+ or 22.12+.
2. Clone this repository and run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set the Supabase project URL and **publishable** key in `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

5. Run `npm run dev` and open the local URL printed by Vite.

Never put a Supabase secret/service-role key in a `VITE_*` variable or commit `.env.local`.

## Current implementation

- Supabase email/password sign-up and sign-in.
- Persistent browser auth session and sign-out.
- My Closet bulk image upload for JPG, PNG and WebP (10 MB maximum per image).
- Private per-user image storage and signed image previews.
- Wardrobe item records with category, original image path and processing status.
- Row Level Security for profiles, wardrobe items and private Storage objects.

## Supabase project

Configure the app with the Closet.com Supabase project. The database migration history includes:

- `closet_wardrobe_foundation`
- `restrict_rls_auto_enable_function`
- `limit_wardrobe_table_grants`

The `wardrobe-images` Storage bucket is private. Authenticated users can access only objects stored under their own user ID folder.

## Scripts

- `npm run dev` — local development server
- `npm run build` — TypeScript checks and production build
- `npm run preview` — preview the production build
