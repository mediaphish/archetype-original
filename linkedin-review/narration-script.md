# Walkthrough video: narration script

Case CAS-11511451-M2N9Y5 · Archetype Original, LLC
Target length 6 to 8 minutes · read in US English

Narration is what you say. `[ON SCREEN]` is what to have visible while you say
it. Everything here matches `codebase-audit.md`. If a screen looks different
when you record, stop and tell me rather than improvising, because every claim
in here is one LinkedIn can check against the code.

---

## 1. Who and what (about 30 seconds)

`[ON SCREEN: archetypeoriginal.com home page]`

> Hello. My name is Bart Paden and I am the owner of Archetype Original, LLC.
>
> I write about leadership, and I built this application for one reason: to
> publish my own writing to my own channels, including my LinkedIn company page.
>
> I want to be clear about the shape of this application at the start, because
> it affects everything else you are about to see. Archetype Original has exactly
> one member. Me. There is no sign up, there are no customers, and there is no
> second account. I built this tool for myself and that is the only way it is
> used.

---

## 2. Signing in and the consent screen (about 60 seconds)

`[ON SCREEN: the application's Settings page, LinkedIn card, showing Connect LinkedIn]`

> This is where LinkedIn connects to the application. I will reconnect now so
> you can see the consent screen exactly as it appears.

`[ON SCREEN: click Reconnect. LinkedIn's own authorization page loads. Pause here so the permission list is readable.]`

> This is LinkedIn's consent screen, asking my permission on my own behalf.
>
> The application requests four scopes and no others. OpenID, profile and email,
> which identify me as the member signing in. And w underscore member underscore
> social, which is the only write permission, and the one that lets the
> application publish a post.
>
> That is the whole list. The application does not request permission to read
> member profiles, connections, or any data belonging to anyone other than me.

`[ON SCREEN: approve, land back in the application showing Connected]`

> And now it is connected.

---

## 3. Writing and publishing a post (about 90 seconds)

`[ON SCREEN: the application's compose or queue screen with the prepared post]`

> Here is the application itself. This is a post I wrote, scheduled to publish
> to LinkedIn.

`[ON SCREEN: click publish]`

> I will publish it now from inside the application.

`[ON SCREEN: switch to LinkedIn in a browser, show the post live]`

> And there it is on LinkedIn, published by the application through the API.

**Read this next part only if you are demonstrating with your personal profile.
See `open-items.md`, item 1.**

> I want to be straightforward about one thing here. This post published to my
> personal profile, because that is what the w underscore member underscore
> social scope allows today.
>
> Publishing to my company page is exactly what this application is for, and it
> is what I am applying for. The application is already built for it. Every
> attempt so far returns the same response from LinkedIn: organization or events
> permissions must be used when using organization as author. Those are the
> permissions under review.
>
> So what you are seeing is the complete pipeline, working, waiting on the
> approval this application is about.

---

## 4. What a Page admin sees when someone engages (about 90 seconds)

`[ON SCREEN: Settings, LinkedIn card, scroll to "LinkedIn post performance". Hover the line that says no member names are requested.]`

> This is the Page Management part of your question, and my answer is short.
>
> When somebody reacts to or comments on a post, the most this application will
> ever show me as the Page admin is two numbers. The number of reactions and the
> number of comments. That is all of it.
>
> The application is built to call the socialActions endpoint and keep exactly
> two values from the response: total likes and total first level comments. It
> does not call the comments or the likes sub resources. It never asks for who
> reacted or who commented.
>
> So no member name, no headline, no profile link, no photograph, nothing
> identifying any member, is ever requested, stored or displayed anywhere in
> this application.
>
> That is deliberate. I need to know whether a post landed. I do not need to
> know who is behind the number, so I do not ask for it.

`[ON SCREEN: open the LinkedIn post itself, showing the reactions list on LinkedIn]`

> On LinkedIn I can see who engaged, the same as any member can. In my
> application, I cannot, because the application never requests it.

---

## 5. Tracking post performance (about 60 seconds)

`[ON SCREEN: back to Settings, the "LinkedIn post performance" table. Point at the yellow note with LinkedIn's refusal, then at a "not available" cell.]`

> This is how I track performance, and I want to be straightforward about what
> it shows today. Every count on this list reads not available.
>
> The application asks LinkedIn for the reaction, comment and share totals on a
> schedule, and LinkedIn refuses, because reading socialActions requires the
> Community Management access I am applying for. This is LinkedIn's own
> response, shown on screen rather than hidden.
>
> The application records the refusal and shows nothing, rather than inventing
> a zero. Once access is granted, these columns fill with those three totals per
> post, and nothing else.

---

## 6. Deleting everything (about 75 seconds)

`[ON SCREEN: Settings, LinkedIn card, scroll to "LinkedIn data this app holds"]`

> You asked whether I can securely delete all data obtained through your APIs if
> you require it. Rather than tell you yes, I will show you.
>
> This screen lists everything the application currently holds that came from
> LinkedIn. The access and refresh tokens and the two URNs identifying my member
> account and my page. The record of each attempt to read reaction, comment and
> share totals, which today holds only LinkedIn's refusals. And the LinkedIn post
> identifier stored against each published post.
>
> Member identities held: zero. There is nothing to delete there, because the
> application never obtained any.

`[ON SCREEN: the red "Erase all LinkedIn data" box with the DELETE field. Do not press it.]`

> This control erases all of it. It takes a typed confirmation because it
> disconnects LinkedIn entirely until I reconnect.
>
> If LinkedIn ever requires it, that is the whole process, and it takes one
> action.

---

## 7. Compliance, in my own words (about 45 seconds)

`[ON SCREEN: stay on the data screen, or your face if you prefer]`

> Finally, your four questions.
>
> One. There is a person responsible for privacy compliance at Archetype
> Original. It is me. I am the owner, the only operator, and the person
> accountable for every decision about what this application requests, keeps and
> deletes.
>
> Two. Yes, I can securely delete all data obtained through your APIs, and I
> just showed you how.
>
> Three. No. None of this data is used for advertising or sales. There is no
> third party member data in the system to use.
>
> Four. No. It is not shared with other customers, because there are no other
> customers. One member, one page, one account. Mine.

---

## 8. Close (about 15 seconds)

> That is the application. Thank you for the review, and please let me know if
> you need anything further.
>
> Bart Paden, Archetype Original, LLC.
