# Purge V1 Cards — Browser UI

I am not an engineer. No terminal required for this step.
Follow exactly. Report after each step.

---

## THE FILE ATTACHED

`purge-v1-cards-ui.js` — a browser page that runs the delete with a button

---

## STEP 1 — Place the file

Copy `purge-v1-cards-ui.js` to:
```
/api/ao/quotes/purge-v1-cards-ui.js
```

---

## STEP 2 — Add the Vercel route

In `vercel.json`, add this route the same way you added the previous one:
```
/api/ao/quotes/purge-v1-cards-ui → api/ao/quotes/purge-v1-cards-ui.js
```

---

## STEP 3 — Deploy

Commit and deploy to Vercel. Tell me when live.

---

## STEP 4 — Bart runs the delete in his browser

After deploy, Bart will:
1. Make sure he is signed into archetypeoriginal.com/ao/analyst
2. Open this URL in the same browser:
   https://www.archetypeoriginal.com/api/ao/quotes/purge-v1-cards-ui
3. He will see a page showing how many rows will be deleted
4. He clicks the red button to confirm
5. The page will show "Done" with the count of deleted rows

---

## STEP 5 — After Bart confirms it worked

Delete both files and their vercel.json routes:
```
/api/ao/quotes/purge-v1-cards.js
/api/ao/quotes/purge-v1-cards-ui.js
```

Deploy one final time to remove them from production.

---

## DO NOT TOUCH ANYTHING ELSE
