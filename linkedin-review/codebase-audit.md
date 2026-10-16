# LinkedIn Community Management API: what the code actually does

Case CAS-11511451-M2N9Y5 · Archetype Original, LLC · audited 2026-10-16

Everything here was read out of the repository, not recalled or assumed. Every
later document in this folder must match it. Where this contradicts an
expectation, the code wins.

---

## The shape of the application

**One member. Permanently.**

This is not a product with customers. It is a publishing tool Bart Paden built
for himself, to post writing he produces in his own editor to his own channels.
There is one account, one LinkedIn member, one company page. There is no sign-up,
no tenancy, no second user, and none is planned.

That single fact answers several of LinkedIn's questions before they are asked.
There is no other customer to share data with, because there is no other
customer. There is no advertising or sales use of member data, because the only
member is the operator.

Authentication is a magic link to one address, `AO_OWNER_EMAIL`, enforced by
`requireAoSession`. A second, deliberately narrowed login (`role: 'reviewer'`)
exists solely so a LinkedIn reviewer can see the product working without being
handed the owner's credentials. It exposes four things: upload content, schedule
it, publish it, view post performance.

---

## OAuth scopes requested

Declared in `api/auth/linkedin/start.js`:

```
openid  profile  email  w_member_social
```

Overridable by `LINKEDIN_SCOPE`, unset in production, so the above is what
appears on the consent screen.

`w_member_social` is the only write scope and the only one the application
depends on. `openid`, `profile` and `email` identify the one member signing in,
which is Bart himself.

Organization publishing scopes are **not** currently granted. That is what this
review is for.

---

## Endpoints called

| Endpoint | Purpose | Where |
|---|---|---|
| `POST https://api.linkedin.com/rest/posts` | Publish a post | `lib/social/linkedin.js` |
| `GET https://api.linkedin.com/rest/socialActions/{urn}` | Read reaction and comment totals for a post | `api/cron/ao/sync-post-metrics.js` |
| `GET https://api.linkedin.com/v2/userinfo` | Identify the member at sign-in | `api/auth/linkedin/callback.js` |
| `POST https://api.linkedin.com/v2/introspectToken` | Check whether the stored token is still valid | `api/ao/linkedin-check.js` |

All calls send a `Linkedin-Version` header (`lib/social/linkedinVersion.js`).

Posts are authored as either the person URN or the page URN depending on which
account the publish targets (`lib/social/linkedin.js`), with
`visibility: 'PUBLIC'`.

---

## Member information shown to a Page admin

**None. The application never requests it.**

This is the most important finding in this audit and it directly answers
LinkedIn's fourth item.

When a post is published, a scheduled job reads `socialActions/{urn}` and keeps
exactly two numbers from the response:

```js
reactions: json.likesSummary?.totalLikes || 0,
comments:  json.commentsSummary?.totalFirstLevelComments || 0,
```

`api/cron/ao/sync-post-metrics.js`

Those are totals. The application does not call the `comments` or `likes`
sub-resources, does not request actor projections, and therefore never receives,
stores or displays the name, headline, profile URL, photo, or any other
attribute of a member who reacted or commented.

A Page admin using this application sees **how many** people engaged. Never
**who**.

This is a deliberate position and worth stating plainly in the review: the
application asks for the minimum it needs to tell Bart whether a post landed,
and member identities are not needed for that.

---

## Personal data stored, and where

| Store | What it holds | Source |
|---|---|---|
| `ao_linkedin_tokens` | `access_token`, `refresh_token`, `expires_at`, `person_urn`, `page_urn` | OAuth sign-in |
| `ao_scheduled_post_metrics` | `reactions`, `comments`, `shares`, `impressions`, `clicks`, `engagement_score`, and the raw API response in `raw` | `socialActions` |
| `ao_scheduled_posts` | `external_id`, the LinkedIn post URN | Publish response |

All three live in a single Supabase Postgres instance, reached only by the
service role from server-side code. No LinkedIn data reaches the browser except
the counts shown on Bart's own dashboard.

**The only personal data held is Bart's own**: his tokens and the two URNs
identifying his account and his page. No third party's personal data is obtained
at any point, because the only member-identifying call is `userinfo`, which
returns the signed-in member, who is Bart.

Retention is indefinite today, bounded by the deletion capability below. Tokens
are replaced on each reconnect.

---

## Deleting everything obtained via the API

**Exists as of 2026-10-16.** It did not before, which is why this audit was
commissioned.

`lib/social/linkedinDataDeletion.js`, reachable at `/api/ao/linkedin-data`:

- `GET` reports what is held right now and changes nothing.
- `POST` with `confirm: "DELETE"` erases all of it.

It covers all three stores. Tokens go first, so an interrupted run cannot leave
a live connection beside half-deleted data. LinkedIn metrics are removed by
`platform = 'linkedin'`, leaving other channels' numbers untouched. Published
rows are stripped of `external_id` rather than deleted, because the captions and
images in those rows are Bart's own writing and are not LinkedIn's data to
reclaim.

Verified against the live database on 2026-10-16:

```
ao_linkedin_tokens          1 row
ao_scheduled_post_metrics 106 rows
ao_scheduled_posts        106 rows (external_id only)
member identities held      0
```

Nine tests cover it, including one that fails if any LinkedIn code starts
requesting member identities, so the "none" above cannot quietly stop being true.

---

## Post performance metrics

Collected by `api/cron/ao/sync-post-metrics.js` on a schedule.

| Metric | Source | Note |
|---|---|---|
| Reactions | `socialActions.likesSummary.totalLikes` | total only |
| Comments | `socialActions.commentsSummary.totalFirstLevelComments` | total only |
| Shares | `socialActions` | total only |
| Impressions | not available | stored as `0`; needs organization analytics access, which this review would grant |
| Clicks | not available | as above |
| Engagement score | computed locally from the above | not from LinkedIn |

Impressions and clicks read zero today because the application does not have
organization analytics access. That is part of what is being applied for.

---

## Answers this audit supports

| LinkedIn's question | Answer | Basis |
|---|---|---|
| Person or team responsible for privacy compliance | **Yes** | Bart Paden, sole operator |
| Can securely delete all data obtained via the APIs | **Yes** | `lib/social/linkedinDataDeletion.js`, built 2026-10-16, demonstrable at `/api/ao/linkedin-data` |
| Personal data used for advertising or sales | **No** | No member data is obtained beyond the operator's own; nothing is sold, exported or used for targeting |
| Personal data shared with other customers | **No** | There are no other customers. One member, one page, one account |

---

## Open item

The walkthrough video must show the application as audited. Specifically, item 4
of LinkedIn's request asks what member details appear to a Page admin. The
accurate demonstration is to show the engagement totals and state that member
identities are never requested or displayed.
