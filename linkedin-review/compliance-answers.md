# The four mandatory questions

Case CAS-11511451-M2N9Y5 · Archetype Original, LLC

Every answer traces to `codebase-audit.md`. Nothing here is drafted around a
gap.

---

## First, the fact that frames all four

**Archetype Original's application has exactly one member: Bart Paden, who
built it and is its only user.**

It is not a product sold to customers. It is a publishing tool he wrote for
himself, to post writing he produces to his own LinkedIn page. There is no
sign-up, no second account, no tenancy, and none is planned. Authentication is a
magic link to a single address.

The only LinkedIn member whose data the application ever touches is the operator
himself. There is no third-party member data in the system, because no third
party ever signs in.

---

## 1. "Does your organization have a person/team responsible for compliance privacy regulations and industry-standard privacy practices?"

**Yes.**

Bart Paden, owner and sole operator of Archetype Original, LLC, is personally
responsible for privacy compliance and data handling. As a single-operator
company he is the accountable party for every decision about what data is
requested, stored, retained and deleted, and he is reachable directly at the
address on this application.

That responsibility is reflected in how the integration is built rather than
only stated: the application requests the minimum scopes it needs, never
requests member identities, and now carries a demonstrable deletion capability.

---

## 2. "Does your organization have the capability to securely delete all data obtained via our community management APIs if required by LinkedIn?"

**Yes.**

A deletion capability covering every store that holds LinkedIn-derived data is
built into the application and can be demonstrated on request.

It removes:

- the OAuth access and refresh tokens, their expiry, and the member and page
  URNs, from `ao_linkedin_tokens`
- every reaction, comment and share count read from `socialActions`, and the raw
  API responses they came from, from `ao_scheduled_post_metrics` (as of
  2026-10-19 these rows hold only LinkedIn's refusals: the read requires the
  Community Management access under review, so no counts have ever been
  obtained)
- the LinkedIn post identifier stored against each published post

There is no fourth store, because the application obtains nothing else from the
API.

Two details worth stating. Tokens are deleted first, so an interrupted run
cannot leave a working connection sitting beside partially deleted data. And the
published posts themselves are stripped of their LinkedIn identifier rather than
destroyed, because the text and images in them are Bart's own writing and are
not data obtained from LinkedIn.

The capability includes a reporting mode that lists exactly what is currently
held without deleting anything, so the position can be inspected at any time.

---

## 3. "Is personal data obtained via our community management APIs used for the advertising or sales use case?"

**No.**

No advertising or sales use of any kind.

The application obtains no third-party personal data at all. The only
member-identifying call it makes is `userinfo`, which returns the signed-in
member, who is Bart himself. Engagement data is requested as totals only: how many
reactions, how many comments. The application never requests the identities
behind those numbers, so there is no member data available to advertise or sell
to, even in principle.

Nothing obtained from LinkedIn is exported, sold, licensed, used for targeting,
or combined with any other dataset.

---

## 4. "Is personal data obtained via our community management APIs for the purpose of managing a specific customer page shared with other customers?"

**No.**

There are no other customers.

Archetype Original's application serves one member and one company page, both
belonging to Bart Paden. There is no second account to share anything with, no
agency model, no client roster, and no multi-tenant architecture. The
application was built for a single operator publishing his own writing, and that
is the only way it is used or intended to be used.

---

## What a reviewer can verify

| Claim | How to check it |
|---|---|
| Member identities are never obtained | The application calls `socialActions/{urn}` and keeps only the totals from the response. It never calls the comments or likes sub-resources. Today that call is refused pending this review, and the refusal is shown in the application. |
| Deletion works | A screen in the application lists everything held and erases it on confirmation. Shown in the walkthrough video. |
| One member only | A single magic-link address. No sign-up exists anywhere in the product. |
| Minimum scopes | `openid`, `profile`, `email`, `w_member_social`. One write scope. |
