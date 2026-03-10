# AO Social — Vercel environment variables

Add these in your Vercel project (archetype-original) for the internal social scheduler and publisher. Only add variables for the platforms and accounts you use.

---

## AO Automation Dashboard (auth)

| Variable | Required | Description |
|----------|----------|-------------|
| `AO_OWNER_EMAIL` | Yes (for dashboard) | The single allowed email for magic-link sign-in to the AO Automation Dashboard at `/ao/login`. Only this email can request or use a magic link. |

Run the migration `database/ao_magic_link_tokens.sql` in Supabase to create the tokens table.

---

## Meta (single app) — Instagram + Facebook

When using one Meta app for both Instagram Business and a Facebook Page, set these and use `account_id` = `meta` (or `default`) when scheduling:

| Variable | Required | Description |
|---------|----------|-------------|
| `META_ACCESS_TOKEN` | Yes | Meta Graph API access token (Page token with Instagram publish permission). |
| `INSTAGRAM_BUSINESS_ID` | Yes | Instagram Business account ID (e.g. `17841479576915269`). |
| `FACEBOOK_PAGE_ID` | Yes | Facebook Page ID (e.g. `904376692760504`). |
| `META_APP_ID` | No* | App ID (for reference; not used by publisher). |
| `META_APP_SECRET` | No* | App secret (for token exchange; not used by publisher). |

Publishing uses **Graph API v25.0**: Instagram = create container → 5s delay → publish (retry up to 3×); Facebook = `POST /{page-id}/photos` with `url` and `caption`. Image validation (reachable, aspect ratio, &lt; 8MB) runs before publish.

---

## Security (optional)

| Variable | Required | Description |
|---------|----------|-------------|
| `SOCIAL_POST_SECRET` | No | If set, `POST /api/social/schedule`, `POST /api/social/publish-now`, and `POST /api/social/post-now` require header `x-ao-secret` (or body `secret`) to match this value. |
| `CRON_SECRET` | No | If set, the cron job `/api/cron/publish-scheduled-posts` requires `Authorization: Bearer <CRON_SECRET>` or query `?secret=<CRON_SECRET>`. |

---

## LinkedIn

**Personal profile**

| Variable | Required | Description |
|---------|----------|-------------|
| `LINKEDIN_ACCESS_TOKEN` | Yes | Long-lived access token with permission to create posts. |
| `LINKEDIN_PERSON_URN` | Yes* | Your person URN, e.g. `urn:li:person:xxxxxxxx`. Required for the Posts API author field. |

*Get token and URN: [LinkedIn Developers](https://www.linkedin.com/developers/) → create app → Products (e.g. Share on LinkedIn, Sign In with LinkedIn) → OAuth 2.0 scopes (e.g. `w_member_social`) → use OAuth 2.0 flow or developer tools to obtain access token. Person URN is in the token response or profile API.

**Organization / Company pages**

For each page use an id (e.g. `1`, `2`). `account_id` in the schedule API is `page_1`, `page_2`, etc.

| Variable | Required | Description |
|---------|----------|-------------|
| `LINKEDIN_PAGE_<id>_ACCESS_TOKEN` | Yes | Page (organization) access token for that page. |
| `LINKEDIN_PAGE_<id>_URN` | Yes | Page URN, e.g. `urn:li:organization:12345678`. |

Example: `LINKEDIN_PAGE_1_ACCESS_TOKEN`, `LINKEDIN_PAGE_1_URN`.

---

## Facebook

**Pages**

For each page use an id (e.g. `1`). `account_id` = `page_1`, `page_2`, etc.

| Variable | Required | Description |
|---------|----------|-------------|
| `FACEBOOK_PAGE_<id>_ACCESS_TOKEN` | Yes | Page access token (long-lived) with `pages_manage_posts` (and `pages_read_engagement` if needed). |
| `FACEBOOK_PAGE_<id>_PAGE_ID` | Yes | The Facebook Page ID (numeric). |

Get tokens: [Meta for Developers](https://developers.facebook.com/) → create app → Facebook Login → add Page permissions → exchange user token for page token via `GET /me/accounts`.

**Groups**

Posting to a group uses a **user** access token with `publish_to_groups`. `account_id` = `group_1`, `group_2`, etc.

| Variable | Required | Description |
|---------|----------|-------------|
| `FACEBOOK_GROUP_<id>_ACCESS_TOKEN` | Yes | User access token with `publish_to_groups` permission. |
| `FACEBOOK_GROUP_<id>_GROUP_ID` | Yes | The Facebook Group ID (numeric). |

Note: Posting as a **Page** to a group has limitations in the Graph API; this setup posts as the user.

**Personal feed:** Not supported (Facebook has deprecated posting to a user’s personal feed via API).

---

## Instagram

Only **Business** or **Creator** accounts linked to a Facebook Page are supported. For each Instagram account use a numeric index (e.g. `1`, `2`). `account_id` = `ig_1`, `ig_2`, or the numeric id.

| Variable | Required | Description |
|---------|----------|-------------|
| `INSTAGRAM_ACCOUNT_<n>_ACCESS_TOKEN` | Yes | Page access token that has the `instagram_business_content_publish` permission (same token used for the linked Facebook Page). |
| `INSTAGRAM_ACCOUNT_<n>_IG_USER_ID` | Yes | The Instagram Business account’s numeric user ID (from Graph API `/{page-id}?fields=instagram_business_account`). |

Example: `INSTAGRAM_ACCOUNT_1_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_1_IG_USER_ID`.

Feed posts require an image (`image_url` in the schedule). Get tokens and IDs: [Meta for Developers](https://developers.facebook.com/) → add Instagram Graph API product → connect Instagram account to Page → use Page token with Instagram publish permission.

---

## Twitter / X

One account (or use the same credentials for “personal”). Posting uses **OAuth 1.0a** with the Twitter API v2 `POST /2/tweets` endpoint.

| Variable | Required | Description |
|---------|----------|-------------|
| `TWITTER_API_KEY` | Yes | API Key (consumer key) from your X Developer project/app. |
| `TWITTER_API_SECRET` | Yes | API Key Secret (consumer secret). |
| `TWITTER_ACCESS_TOKEN` | Yes | User access token (from OAuth 1.0a flow). |
| `TWITTER_ACCESS_TOKEN_SECRET` | Yes | User access token secret. |

Get credentials: [X Developer Portal](https://developer.x.com/) → Project and App → Keys and tokens. Generate Access Token and Secret with Read and Write (or Read and Write and Direct Messages) permissions. Note: X API may require a paid tier for posting; the app will return API errors if the request is denied.

---

## Summary table

| Platform | account_id | Required env vars |
|----------|------------|-------------------|
| LinkedIn personal | `personal` | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN` |
| LinkedIn page | `page_<id>` | `LINKEDIN_PAGE_<id>_ACCESS_TOKEN`, `LINKEDIN_PAGE_<id>_URN` |
| Facebook page | `page_<id>` | `FACEBOOK_PAGE_<id>_ACCESS_TOKEN`, `FACEBOOK_PAGE_<id>_PAGE_ID` |
| Facebook group | `group_<id>` | `FACEBOOK_GROUP_<id>_ACCESS_TOKEN`, `FACEBOOK_GROUP_<id>_GROUP_ID` |
| Instagram | `ig_<n>` or numeric | `INSTAGRAM_ACCOUNT_<n>_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_<n>_IG_USER_ID` |
| Twitter | `personal` | `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET` |

---

## API endpoints

- **POST /api/social/schedule** — Schedule a post. Body: `{ platform, account_id, scheduled_at, text, image_url? }`. Optional header: `x-ao-secret`.
- **POST /api/social/publish-now** — Run the publisher (process all due posts). Optional header: `x-ao-secret`.
- **POST /api/social/post-now** — Create a post with `scheduled_at` = now and publish it immediately. Body: `{ platform, account_id, text, image_url? }`. Optional header: `x-ao-secret`.

The cron job **/api/cron/publish-scheduled-posts** runs every 15 minutes (Vercel cron). Secure it with `CRON_SECRET` if desired.
