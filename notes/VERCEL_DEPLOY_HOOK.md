# Keeping the live site "caught up" (Deploy Hook)

> **Retired 2026-10-19.** The hook the workflows called had been deleted from
> `archetype-original-v0` and answered `not_found` on every run, while the step
> printed "triggered". Every scheduled routine pushes to `main`, and every push
> already builds production, so the step was removed from `prerender.yml` and
> `update-journal.yml`. The same day, the leftover `archetype-original` Vercel
> project (no domain, no settings, a broken public copy that built on every
> push) was deleted. `archetype-original-v0` is now the only project. The text
> below is kept for history.


Sometimes the live site can get “stuck” showing an older snapshot even though new updates are saved in the repo. When that happens, devotionals and journal changes don’t appear on the live domain.

To prevent that, we support a **Deploy Hook**:

- After the scheduled content refresh runs, GitHub will “poke” the hosting service to refresh the live site.

## What you need to provide (one-time)

You’ll create a Deploy Hook in Vercel and paste its URL into GitHub as a secret named:

- `VERCEL_DEPLOY_HOOK_URL`

Once that’s set, the content refresh workflow will automatically call it whenever there were new content changes.

## How you’ll know it’s working

When new devotionals are published, the live site will stop “lagging behind” and `/faith` will show the correct devotional for the day.

