# Reply to Rishi

Send as a reply **inside the original thread**. Not a new email. LinkedIn does
not monitor mail sent outside it.

This text is already saved as a Gmail draft in that thread (2026-10-19), with the
Drive link filled in. The link was checked signed out and downloads the real
screen recording.

---

Hi Rishi,

Thank you for reviewing our Community Management request and for setting out
exactly what you needed. I first submitted a walkthrough for this application in
July and understand it did not reach your system, so this reply is complete on
its own: the video, each of your six items, and your four mandatory questions.

The walkthrough video is here: https://drive.google.com/file/d/1MZ6fEP-ab2ZbyicOP240g0ml2fWC-96T/view?usp=sharing

The link is set so the file can be downloaded and saved on your side. It covers
your six items in order:

1. Downloadable video, shared from Google Drive.

2. Audio commentary throughout, in US English.

3. The OAuth consent screen. The video shows the consent screen with the scopes
   the application holds today: openid, profile, email, and w_member_social. The
   scopes in this request, w_organization_social to publish as the company page,
   r_organization_social to read engagement totals on the page's posts, and
   rw_organization_admin for page analytics, are added to that same consent
   screen once they are granted. The application cannot request them before
   then.

4. Page Management. The video shows exactly what member information is displayed
   to the Page admin when someone reacts or comments, which is at most the
   reaction count and the comment count. The application is built to read only
   those totals from the socialActions endpoint and never requests the
   identities behind them, so no member name, headline, profile link or photo is
   requested, stored or shown anywhere in the application.

5. Publishing from the application, and the published post shown on LinkedIn.
   Publishing as the organization is the access this application is requesting,
   and every attempt today returns "Organization Or Events permissions must be
   used when using organization as author." The video therefore shows the full
   publishing pipeline working to my personal profile, which is what
   w_member_social permits today, and explains the error every organization
   attempt returns. The application is built and waiting on this approval. If it
   would help your review, I will record a short follow-up showing a post
   published to the company page, with its reactions and comments, as soon as
   access is granted.

6. Page Analytics. The video shows how post performance is tracked. The totals
   feed the application's writing assistant, so it learns which topics, formats
   and posting times perform best. Once approved, the application will track,
   per company page post: reactions, comments and shares from socialActions,
   plus impressions and clicks from page analytics. Only totals are stored,
   never the identities behind them. Today those counts read "not available":
   LinkedIn refuses the socialActions read until Community Management access is
   granted, and the application shows that refusal rather than a made-up zero.

On your four mandatory questions:

**Does your organization have a person or team responsible for compliance
privacy regulations and industry-standard privacy practices?**

Yes. I am personally responsible. Archetype Original, LLC is a single-operator
company and I am accountable for every decision about what data the application
requests, stores and deletes.

**Does your organization have the capability to securely delete all data
obtained via your community management APIs if required by LinkedIn?**

Yes. The application has a built-in capability that erases everything obtained
through your APIs: the OAuth tokens and URNs, the record of every attempt to
read reaction, comment and share totals from socialActions (which today holds
only the refusals, since that access has not been granted), and the post
identifiers stored against published posts. It is shown in the video.

**Is personal data obtained via your community management APIs used for the
advertising or sales use case?**

No. The application obtains no third-party personal data at all, and nothing
obtained from LinkedIn is sold, exported, or used for advertising or targeting.

**Is personal data obtained via your community management APIs for the purpose
of managing a specific customer page shared with other customers?**

No. There are no other customers. Archetype Original's application has exactly
one member, me, publishing to one company page, mine. There is no sign-up, no
second account, and no multi-tenant architecture.

Please let me know if you need anything further. I will respond the same day.

Regards,

Bart Paden
Archetype Original, LLC
