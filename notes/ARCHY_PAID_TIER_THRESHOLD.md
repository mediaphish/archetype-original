# Archy: the paid-tier threshold

Recorded 2026-09-09, at Bart's direction, as a roadmap item rather than work.

## The trigger

**When the corpus reaches 750,000 to 1,000,000 words, Archy needs a paid tier,
or a paid option alongside the free one.**

Today the corpus is 592 documents and 315,041 words (`data/knowledge-full.json`).
Roughly a third of the way there.

## Why the number is the number

It is not arbitrary and it is not really about cost, though cost is what moves
first. Three things change at once around that size:

1. **Retrieval stops being cheap.** Every answer embeds the question and pulls
   context. More corpus means more chunks, a larger index, and longer prompts
   for the same question. The per-answer cost curve bends before the corpus
   does.

2. **The thing being given away becomes substantial.** At 300,000 words Archy is
   a good site feature. At a million it is a body of work someone could consult
   instead of hiring Bart. That is the point where free access starts competing
   with the fractional practice rather than feeding it.

3. **Quality has to be provable.** A visitor tolerates a mediocre free answer.
   A paying one does not. See below.

## The open question Bart raised, unanswered

> How do I prove that he is intelligent enough and trained well enough on my
> corpus?

This is the real blocker, not billing. Nobody pays for a chatbot; they pay for
an answer they trust. There is currently no measurement of whether Archy
answers well, only that he answers.

An eval harness was designed for this and has **not** been built. Bart has not
chosen between building it and leaving it on the roadmap. It would need, at
minimum:

- A fixed question set drawn from the corpus, with answers Bart has graded
  himself, so the standard is his and not a model's.
- Retrieval scoring separate from answer scoring. Most failures here are the
  wrong chunks, not the wrong words, and the two look identical from outside.
- Adversarial cases: questions the corpus does not answer. Archy saying "Bart
  has not written about that" is a correct answer, and a system that never says
  it is a system that fabricates.
- A regression run, so a corpus addition or a prompt change cannot quietly make
  him worse.

Without that, there is no evidence to put in front of a buyer, and no way to
know if the paid version is better than the free one was.

## What to check before acting on this

Corpus size, in words:

```
node -e "const d=require('./data/knowledge-full.json');const docs=d.documents||d.docs||d;console.log(docs.length,'docs',docs.reduce((n,x)=>n+String(x.content||x.text||'').split(/\s+/).length,0),'words')"
```

Related: `notes/AUTO_VS_ARCHY.md`, `notes/ARCHY_QUESTIONS_LOGGING.md`. The
question log is the cheapest source of eval questions, because it is what people
actually asked.
