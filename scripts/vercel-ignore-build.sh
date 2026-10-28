#!/bin/bash
# Vercel's "ignored build step" (2026-10-28). Exit 0 skips the build; anything
# else builds. Bart: a 13 minute build costs him the wait when he is waiting on
# a change, so a commit that changes nothing the live site runs (notes, plans,
# tests, backups, database notes) does not start one. If the previous commit
# is not available, git exits non-zero and the site builds as usual.
git diff --quiet HEAD^ HEAD -- . \
  ':(exclude)notes' \
  ':(exclude)docs' \
  ':(exclude)backups' \
  ':(exclude)database' \
  ':(exclude)lib/__tests__' \
  ':(glob,exclude)src/**/__tests__/**' \
  ':(exclude)cypress' \
  ':(exclude).github'
