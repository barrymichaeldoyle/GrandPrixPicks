# Product voice

Grand Prix Picks sounds like a knowledgeable Formula 1 fan explaining something
clearly. It does not sound like a marketer, commentator, or assistant.

This guide is the source of truth for user-facing copy across web, mobile,
emails, notifications, metadata, and social cards. Product facts in `PRODUCT.md`
and domain terminology in the codebase still take precedence.

## Before writing

Decide what the person needs from the text:

1. The one fact they need now.
2. The action they can take next.
3. Any detail that changes that action.

If a line does none of those jobs, remove it. Do not invent helper text,
headings, taglines, or explanatory prose just to make a surface feel complete.

## Default rules

- State the useful fact directly.
- Prefer familiar Formula 1 terminology.
- Use the fewest words that preserve the meaning.
- Say each idea once.
- Use one term consistently for the same concept.
- Use specific verbs for actions and links.
- Make link text understandable without the sentence around it.
- Keep factual distinctions when they affect scoring, deadlines, access, money,
  privacy, or recovery.
- Let the surrounding interface provide context instead of narrating it.
- Read the copy aloud before shipping. If it sounds written rather than spoken,
  rewrite it.

## Avoid

These patterns are warnings, not a mechanical ban. Use one only when it is the
clearest way to express a real distinction.

- Contrast formulas used for emphasis: “X, not Y,” “not just X,” or “it’s not
  X—it’s Y.”
- Generic framing: “Whether you’re…,” “From X to Y…,” or “Everything you need
  to…”.
- Inflated verbs and adverbs: “unlock,” “elevate,” “seamlessly,” and
  “effortlessly” when plain language describes the same outcome.
- Claims such as “simple,” “easy,” “fast,” or “powerful” that the interface can
  demonstrate instead.
- Redundant headings followed by prose that repeats them.
- Bold fragments that restate the sentence immediately before them.
- Vague links such as “Learn more,” “Read more,” or “Click here” when the
  destination has a useful name.
- Commentary about the experience instead of information needed to use it.
- Friendly filler in errors, confirmations, empty states, and loading states.

## Examples

### Scoring

Avoid:

> A penalty moves where a driver starts, not where they were classified.  
> **How each session is scored**

Prefer:

> Grid penalties don’t change qualifying results.  
> **How scoring works**

### Result changes

An amendment note is read by people whose score just moved, and the fastest
available reading has to be the true one. Lead with the movement, then the
reason. A note that opens on the ruling makes the reader parse a clause before
they learn who gained and who lost, and a name next to a verb reads as its
subject.

Avoid:

> The FIA International Court of Appeal reinstated Gasly's two five-second
> penalties. Hadjar takes third.

Prefer:

> Gasly drops to seventh and Hadjar takes third. The FIA International Court of
> Appeal reinstated Gasly's two five-second penalties.

### Access

Avoid:

> Unlock more spots to keep joining leagues this season.  
> **Unlock more leagues**

Prefer:

> You’ve reached the free league limit.  
> **View Season Pass**

### Empty states

Avoid:

> Your predictions will appear here once you begin your Grand Prix Picks
> journey.

Prefer:

> No picks yet.

Add an action only when the person can take one from that state.

### Errors

Avoid:

> Something went wrong. Please try again later.

Prefer copy that names the failed action and a real recovery path:

> Your picks weren’t saved. Try again.

Do not invent a cause or promise when the system does not know one.

## Review checklist

- Does every line supply a fact, an action, or decision-changing context?
- Is any idea repeated by a heading, body line, or link?
- Can a sentence begin with its main point instead of a setup clause?
- Is a contrast construction doing real explanatory work, or adding drama?
- Would a regular Formula 1 fan use these words in conversation?
- Is the terminology factually correct for the session and scoring rule?
- Does the text still work at mobile width and when read out of context?
- Are errors and blocked states clear about what happened and what to do next?

## Automated check

Run `pnpm copy:audit` from the repository root. It reports likely synthetic-copy
patterns in product UI source and always exits successfully. A warning requires
editorial judgment; it does not prove the copy is wrong.

When a flagged phrase is deliberately the clearest wording, add
`copy-audit-ignore` on the same line or the line immediately before it. Use the
exception sparingly and let the surrounding code or comment explain the factual
need.
