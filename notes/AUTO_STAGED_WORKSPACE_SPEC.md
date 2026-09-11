# Auto: the staged workspace

Spec from a conversation with Bart on 2026-09-11. Nothing here is built yet.
Read this before touching the artifact panel.

## Why

The Cain header image was generated, saved to the draft, and present in the
artifact panel, and Bart could not tell. The panel stacked a draft, a reference
upload he had rejected, and Auto's images in one column, resolved by parsing
chat history. The newest image sat below the fold of a half-height scroll box
and the only clue was a scrollbar.

The panel had no idea what stage of the work Bart was in. Everything Auto had
ever produced competed for the same space.

Bart's framing: "Everything I see on the right should be the image. Everything
on the left should be about interacting with that image."

## The workflow, in Bart's words

1. Seed an idea.
2. Auto does the research.
3. Discuss the research.
4. Build a brief.
5. **Approve the brief.**
6. Auto writes the post.
7. Review the post.
8. Notes, and Auto edits.
9. **Approve the post.** Move to the image.
10. Auto drafts an image prompt from what it knows about the series' images.
    Bart should never have to supply that knowledge.
11. **Approve the prompt.** Auto generates.
12. Discuss and iterate.
13. **Approve the image.** Move to captions.
14. Discuss and iterate. **Approve the captions.**
15. **Approve the schedule.** Publishing is Auto's final action on that approval,
    with no separate approval.
16. Manual posts: LinkedIn Business (until LinkedIn grants API access) and
    Facebook Personal.

Six approvals: brief, post, image prompt, image, captions, schedule.

## Tabs

The artifact panel becomes five tabs. Bart can move between them freely.

| Tab | Shows | Approvals |
|---|---|---|
| Research & Brief | The brief once it exists; research behind a link | Brief |
| Post | The current post, with Show changes | Post |
| Image | The prompt, then the current image fitted to the panel | Prompt, then image |
| Captions | Every channel's caption, current version | Captions |
| Schedule & Publish | What goes out when; then "still to post by hand" | Schedule |

Captions and Schedule are deliberately separate. Bart: captions carry too much
conversation to share a tab, and Auto routinely gets them wrong on the first
pass.

## Rules

1. **One thing per tab, current version only.** Earlier versions live behind a
   "previous versions" link inside the tab and never share the view.
2. **Approvals move the tab. Looking does not.** Approving the post switches to
   Image. Clicking back to Post to read it changes nothing about the stage.
3. **Nothing changes silently.** New content in a tab Bart is not viewing puts a
   marker on that tab. A replaced version announces itself ("Image, version 3,
   just now").
4. **Images fit the panel.** No scrolling to see the whole image.
5. **Reference uploads are not candidates.** Bart's uploads appear as
   thumbnails on the chat message where he attached them, never in the Image
   tab beside Auto's output.
6. **The stage comes from the draft's real state, not from chat parsing.**
   Approved with no image means Image. Image set, no approved captions, means
   Captions. It must be the same whether Bart clicked Approve or Auto called
   approve_draft, and it must survive a reload.
7. **A workflow strip stays visible.** Stage names only, showing approved,
   current, and next. No content behind it.

## Chat is aware of the open tab

Every message to Auto carries which tab Bart is viewing and which stage the
draft is in. Same pattern as Archy's pageContext (commit 6c1e4a2b5).

- The chat talks to the tab that is open. On the Image stage, Bart can open
  Post and ask about a line; Auto answers about the post and knows the work is
  still mid-image.
- **A question needs no reopen. A change to an approved artifact does.** Auto
  raises it: "That changes the approved post. Want me to make the edit and send
  it back for approval?" After re-approval, Bart returns to where he was, and
  Auto names what the change may affect downstream (image prompt, captions).
- This extends the dialogue-first rule already in place for notes: a question
  gets an answer, not a rewrite.

## Schedule & Publish, the end of the line

After the schedule is approved, Auto publishes to every automated channel. The
tab then shows "Still to post by hand": LinkedIn Business and Facebook
Personal, each with the caption ready to copy, the image ready to download, and
"Mark as posted". Marking both closes the post. When LinkedIn grants API
access, LinkedIn Business moves from this list to automatic with no other
change.

## Pop out

Any tab can be opened in its own browser window, by Bart, deliberately. Auto
never opens windows. The default is one panel.

## Related fixes, separate from the panel

- **Series image context.** In the Cain thread Auto said there was "no VISUAL
  SERIES CONTEXT" for the Archetype Series and Bart had to find the references.
  When the Image tab opens for a series entry, prior images in that series load
  automatically before Auto drafts the prompt.
- **Caption quality.** See notes/CAPTION_COMPRESSION_2026-09-11.md.

## Build order

1. Stage derived from draft state, with tests. Everything else reads it.
2. Tab shell and the Image tab (the one that failed).
3. Open-tab context sent with each message, and the prompt rules for it.
4. Post, Captions, Research & Brief tabs.
5. Schedule & Publish, including the manual-post list.
6. Pop out.

Mobile uses the same tabs inside the existing drawer.
