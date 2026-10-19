# Run of show

One pass, 6 to 8 minutes. Your July recording was 3:16 in a single take, so this
is the same job with more to cover.

---

## Before you hit record

**Disconnect LinkedIn in the application first.** Segment 2 shows the consent
screen, and you cannot show it while already connected. Settings, LinkedIn card,
the grey **Disconnect LinkedIn** button. It removes the connection only; your
posts and history stay. Then leave it disconnected until you are rolling.

**Have a post written and ready to publish**, not yet published. Copy is in
`demo-post.md`.

**Open these tabs in this order**, so you are never hunting mid-take:

1. archetypeoriginal.com
2. The application, Settings page
3. LinkedIn, your company page
4. Your LinkedIn post on LinkedIn itself (for the reactions list in segment 4)

Segments 4, 5 and 6 all happen on the Settings page, in the LinkedIn card, by
scrolling down: "LinkedIn post performance", then "LinkedIn data this app
holds", then the red "Erase all LinkedIn data" box.

**Clear the screen.** Close mail, chat, anything with notifications. LinkedIn
stores this file for audit, so whatever is on screen goes into their system.

**Test your microphone** by recording ten seconds and playing it back. The last
submission was lost at their end, so a second lost recording is the one thing
worth being paranoid about.

**Have the teleprompter open on a second device**, not on the screen you are
recording.

---

## The order

| Segment | Show | Roughly |
|---|---|---|
| 1 | Home page. Who you are, what this is, one member. | 0:30 |
| 2 | Reconnect LinkedIn. **Pause on the consent screen so the scopes are readable.** | 1:00 |
| 3 | Publish the prepared post from the application, then show it live on LinkedIn. | 1:30 |
| 4 | Post performance. State that only counts are shown, never member identities. | 1:30 |
| 5 | Performance across posts. Explain why impressions read zero. | 1:00 |
| 6 | LinkedIn data screen. Show what is held, show the delete control. | 1:15 |
| 7 | The four compliance answers, in order. | 0:45 |
| 8 | Close with your name and company. | 0:15 |

**The one moment that must not be rushed is segment 2.** LinkedIn asked
specifically to see the consent screen with the permission scopes. Let it sit on
screen for a good five seconds before you click through.

**Do not actually press delete in segment 6.** Show the screen and the control,
describe what it does, and move on. Pressing it disconnects LinkedIn and ends the
recording's usefulness.

---

## After

**Export as MP4.** Not MOV. Their first request was for a downloadable file and
MP4 travels better.

```bash
ffmpeg -i your-recording.mov -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac linkedin-review-2026-10.mp4
```

**Upload to Google Drive.**

**Set sharing to "Anyone with the link" and the role to Viewer.** Then open the
link in an incognito window and confirm the **Download** option appears. They
said explicitly that they need to save it in their system. A stream-only link
fails that, and it is the most likely reason to get bounced a second time.

**Paste the link into `reply-email.md`** where it says `[VIDEO LINK]`, and send
it as a reply inside Rishi's original thread. Not a new message. They do not
monitor mail outside the thread.
