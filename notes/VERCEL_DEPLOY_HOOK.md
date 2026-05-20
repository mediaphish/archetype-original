# Keeping the live site “caught up” (Deploy Hook)

Sometimes the live site can get “stuck” showing an older snapshot even though new updates are saved in the repo. When that happens, devotionals and journal changes don’t appear on the live domain.

To prevent that, we support a **Deploy Hook**:

- After the scheduled content refresh runs, GitHub will “poke” the hosting service to refresh the live site.

## What you need to provide (one-time)

You’ll create a Deploy Hook in Vercel and paste its URL into GitHub as a secret named:

- `VERCEL_DEPLOY_HOOK_URL`

Once that’s set, the content refresh workflow will automatically call it whenever there were new content changes.

## How you’ll know it’s working

When new devotionals are published, the live site will stop “lagging behind” and `/faith` will show the correct devotional for the day.

