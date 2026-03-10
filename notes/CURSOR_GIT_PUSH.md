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
