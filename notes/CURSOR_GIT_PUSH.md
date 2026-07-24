# Getting push to work from Cursor

Cursor’s terminal doesn’t use your Mac keychain for Git, so `git push` from the AI/terminal can fail with “Device not configured.” Nothing is wrong on your side.

The repo is set up to use a **GitHub token** from the environment when one is present. Add it once and pushes from Cursor will work again.

## One-time setup

1. **Create a GitHub Personal Access Token**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - Enable scope: **repo**
   - Copy the token (starts with `ghp_`)

2. **Add the token in Cursor**
   - Open Cursor Settings (Cmd+,)
   - Search for: **terminal integrated env**
   - Under “Terminal › Integrated: Env Osx” (or “Env” on your OS), click “Add Item”
   - Name: `GITHUB_TOKEN`
   - Value: paste the token you copied
   - Save

After that, when the AI runs `git push` in this repo, it will use that token and the push will succeed. Your keychain and normal Terminal usage are unchanged.

## Publishing must use one identical command (avoids repeat approval prompts)

Approval prompts match on the exact command text. Bundling commit, pull, conflict
resolution, push, and status check into one block makes every publish a brand-new
command (the commit message differs each time), so a previously granted approval
never matches and Bart gets asked again on every single publish.

Run prep as separate steps, then publish with exactly this, unchanged, every time:

```
git push origin main
```

Rules for agents:

- Never inline a commit message, heredoc, pull, merge, or conditional logic in the
  same command as the push.
- Do the commit in its own step. Do `git pull origin main --no-rebase` and any
  conflict resolution in their own step. Then push with the bare command above.
- Do not add flags, redirects, `&&` chains, `tail`, or `cd` to the push command.
  Any variation creates a new command that must be approved again.
- Deploy status checks are a separate command afterward, never part of the push.
