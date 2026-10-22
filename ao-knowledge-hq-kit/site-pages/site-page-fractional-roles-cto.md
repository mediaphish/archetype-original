---
title: Fractional Chief Technology Officer
slug: site-page-fractional-roles-cto
type: site-page
status: published
url: 'https://www.archetypeoriginal.com/fractional-roles/cto'
summary: >-
  For organizations building and running software for their own use, not
  software companies building a product to sell. The decisions that get made
  before anyone writes code, and which of them cannot be undone later.
tags:
  - site-page
created_at: '2026-10-22'
updated_at: '2026-10-22'
source:
  kind: site
  note: >-
    Generated from the live page by scripts/extract-site-pages.mjs. Edit the
    page, not this file.
---
Part of Work with Bart

See all the ways to work together →

# Fractional Chief Technology Officer

Most companies that need a CTO do not need someone to write the code. They need someone to make the decisions that get made before anyone writes code, and to know which of those decisions cannot be undone later.

For organizations building and running software for their own use. Not for software companies building a product to sell.

I have spent thirty-four years in and around software. For the last four of those I have been learning something specific and fairly new: how to lead the building of real applications with AI doing most of the typing. I learned it the only way I would trust anyone else to have learned it, which is by building for myself and living with the results.

Everything this company runs on, I built. This site and every system behind it. Operators, the platform my leadership work runs through. Archy, which answers questions against my written corpus. Auto, which does my publishing and content operations. None of it is for sale. All of it is load bearing, in the sense that when it breaks my business stops working properly and I am the one who finds out. That is a narrow kind of experience and it is exactly the kind that transfers to an organization building systems for itself.

Let me be direct about something most people in this seat will not say plainly. I am not an engineer. I have never claimed to be one. What I have done for three decades is lead the people who are, decide what gets built and in what order, and carry responsibility for whether the thing works when the people who depend on it start using it. That is the job. Writing the code was never the job. What changed in the last four years is that I can now do the building as well, which taught me a great deal about where the leadership decisions actually sit.

I should also be direct about who this is for, because it will save us both a conversation. I work with organizations that build and run software for themselves. The internal application nobody outside the company will ever see, the systems the business actually operates on, the tooling that decides whether a team is fast or slow. I do not take engagements building software as a product to sell to third parties. That is a different job with different pressures, and it is not the one I am offering.

What has changed is how much of the building a small number of people can now do, and where the real risk sits once that is true. Both of those are leadership questions, not engineering questions, and answering them badly is expensive in ways that do not show up for months.

What this looks like in practice

## The decisions that are cheap now and expensive later.

The clearest way to show what this seat does is to describe the decisions themselves. These are four I have made, stated as the kinds of decision they are rather than as a case study, because the clients I work with are entitled to their privacy. The shape is what transfers anyway. Every one of them was cheap on the day it was made and expensive on any later day.

The vendor decision. The obvious hosted vendor is free at small scale for the ordinary case, and bills separately for the case you actually need. Once real usage arrives it runs four figures a month. Self hosting the same capability on open tooling costs a few dollars a month plus about two weeks of pipeline work. The difference is tens of thousands of dollars a year, and it only costs two weeks if the decision is made before anyone writes against that vendor. Six months in, it is a rewrite.

The identity decision. An internal tool gets built with its own logins, because that is the fastest path on the day it is built and standing up single sign on feels like ceremony for a tool six people use. Then it is forty people, it holds real data, and every departure leaves an account nobody closes. Wiring it to the company identity provider at the start is an afternoon. Retrofitting it later means touching every permission in the system while people are depending on it, and until you do, offboarding is a manual list somebody has to remember.

The audit gate. The controls an insurer or an auditor will ask about are not features you can add at the end. Access logs only tell you what happened if they were being written before the thing you are asking about happened. Designed in, that is a schema decision that costs nothing. Discovered during a renewal or an audit, it is a rebuild with a date attached to it that somebody else set, which is the worst kind of date to have.

The licensing trap. Seeding a database from an open dataset with a share alike license, then writing your own proprietary fields onto those same records, can make the whole thing a derivative database subject to that license. Caught at the schema level it costs nothing. Caught later it means unwinding the data model of a system the business is already running on.

None of those four are coding problems. All four are decided before the first line of code, and three of them would never surface in a technical interview.

Building with AI

## Code generation stopped being the bottleneck. Verification became it.

A working prototype now takes hours, not a quarter. That is genuinely new, and it changes what a small team can attempt. It also moves the constraint somewhere most people are not looking. When producing code is fast, the limiting factor becomes proving the code is right, and proof comes in two forms that are priced very differently.

Automated testing is now cheap, because the same tools that write the code will write the tests. Knowing whether the thing is actually working is not cheap, and that is a different question. A team can build and verify in parallel. One person cannot. Knowing which of your constraints is actually binding, and it is rarely the one everybody is discussing, is most of what this job is.

I will also tell you where AI is weakest, because you should hear it from the person you are hiring rather than discover it later. Its failures do not look like failures. On my own systems, the ones that cost me the most were all cases where something reported success and had done nothing at all.

Three endpoints on this site shipped without being wired into the routing table. A request to a missing endpoint does not fail. It quietly returns the home page with a success code, so the calling screen sees a valid response containing nothing it expected. One of them had disabled a feature I used daily, and I had spent weeks assuming the feature simply did not work well. The site's own feed was doing the same thing to every reader who tried to subscribe. All of it built with AI. None of it caught by AI, because every individual piece was written correctly and the fault lived in the space between two files that were supposed to agree.

What fixed it was not better prompting. It was deciding that certain classes of mistake get a mechanical check that runs every time, so that agreement between two files is asserted rather than assumed. That is a leadership decision about where to spend verification, not an engineering one, and it is the decision most teams building this way have not made yet. It is also the reason I would rather show you my own systems than a slide about velocity.

Dates and scope

## A date is only defensible if every unknown has a fallback.

Software dates slip because teams protect scope and negotiate the calendar. I do the opposite. Scope is the lever, the date is the commitment, and every remaining unknown gets a fallback in advance that costs scope or convenience rather than costing the date. When your board, your operating partner, or the department waiting on this asks whether the date is real, that structure is the answer. Not confidence. Structure.

The same discipline applies to what happens when you are gone. A small AI assisted team concentrates enormous knowledge in very few heads, and that is a real risk, not a talking point. It matters more for internal systems than most people expect, because the business runs on them every day and there is no vendor to call. It gets managed the same way anything else does: architecture written down, a data pipeline anyone can reproduce from raw source, and a second person with their hands on the code before you need them rather than during the emergency.

I am also comfortable telling you when the answer is to hire someone rather than to keep me. A fractional CTO who cannot say that is selling a retainer, not judgment.

Where it fits

## This role earns its place in a specific set of situations.

- · You are about to start building something for your own operation and the early decisions have not been made by anyone qualified to make them.

- · You have developers, or an agency, or an AI toolchain producing work, and nobody in the company can independently judge whether it is any good.

- · A build is underway and the date has started moving, and you need someone who will fix scope instead of renegotiating the calendar.

- · You are evaluating what a small team plus AI can realistically do before you commit to a hiring plan or a budget.

- · You need technical decisions defensible to a board, an auditor, or an insurer, in language they can actually act on.

- · The business already depends on systems nobody owns, and the person who built them has left or is about to.

- · You are spending on software and tooling without anyone in the room who can tell you what is worth the money.

Where it does not fit, and I would rather say this in the first conversation than in the fourth month. Software companies building a product to sell: that is a different job, and I am not taking those engagements. Deep platform engineering. A rescue that needs hands on a keyboard tomorrow morning. An organization that wants a title in the org chart without giving that title any decision authority. In each of those cases you need a different person, and you should go find them.

The outcome of this role is not a technology roadmap in a slide deck. It is a build where the expensive decisions were made early and on purpose, where the date is real because the scope is fixed, where the risks that live outside the code have already been found, and where the people doing the work know what they are building and why it is sequenced the way it is.

Technology decisions are leadership decisions. They get made by someone whether or not that person is qualified, and they get made early whether or not anyone notices.

Start a Conversation

Explore other offerings:

Fractional CCO

→

Consulting

→

← Back to Fractional Roles

Advisory path

## When methods are not the missing piece

Consulting and speaking address what happens inside the system. Advisory is for the conversation that cannot happen there: outside your hierarchy, without consequence to your political reality.

How advisory works

Ways to work together
