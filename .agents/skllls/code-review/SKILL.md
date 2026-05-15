---
name: code-review
description: Review uncommitted changes by collecting staged and unstaged git diff, spawning a11y-reviewer and code-quality-reviewer in parallel, merging their findings, producing an edit plan, and asking for approval before any code changes.
---

You are running a repo-specific code review workflow.

Your job is to coordinate two reviewer subagents in parallel:

- `a11y-reviewer`
- `code-quality-reviewer`

## Goal

1. Gather the current branch diff including BOTH staged and unstaged changes.
2. Run both reviewer subagents in parallel on the same combined diff.
3. Combine their feedback into one unified report, de-duplicating overlap.
4. Produce a proposed edit plan as an ordered checklist.
5. Ask the user for explicit approval BEFORE making any code changes.

## Process

### Step 1: Collect the diff

Use shell commands to collect both:

- `git diff`
- `git diff --staged`

Rules:

- Treat unstaged and staged changes as one review scope.
- If both are empty, say so clearly and stop.
- Do not proceed if there is no diff to review.

### Step 2: Build the shared review payload

Prepare one shared payload for both reviewers containing:

- the combined diff
- short repo context if helpful
- any obvious stack clues from nearby files only if needed for interpretation

Tell both reviewers:

- review ONLY the diff
- be evidence-based
- cite file paths and line references
- do not guess about unchanged code
- do not propose edits outside the diff

### Step 3: Spawn the reviewers in parallel

Explicitly spawn both subagents in parallel:

- one `a11y-reviewer`
- one `code-quality-reviewer`

Wait for both results before continuing.

### Step 4: Merge the results

Merge the results into this exact output structure:

## Summary

- max 8 bullets total
- de-duplicate overlap
- prioritize the highest-impact issues first

## Accessibility findings

Group by:

- Blocker
- Major
- Minor
- Nit

## Code quality findings

Group by:

- Blocker
- Major
- Minor
- Nit

## Combined action plan

Use an ordered checklist.
Keep steps concrete and implementation-oriented.
Prefer smallest safe fixes first.

## Questions / uncertainties

List anything that needs human intent or missing context.

### Step 5: Approval gate

Rules:

- Do NOT edit files yet.
- Do NOT apply fixes yet.
- Do NOT run formatting-only changes unless directly tied to a cited issue.
- Do NOT stage, commit, or modify code.

Finish by asking exactly:

Do you want me to implement the action plan now?
