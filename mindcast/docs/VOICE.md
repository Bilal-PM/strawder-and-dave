# Groundwork voice

Groundwork sounds like an experienced railway engineer turned project leader explaining something to a colleague on a night shift: plain, specific, honest about mistakes, and useful by the end of the conversation.

This guide is calibrated against the founder's own LinkedIn history (Buffer export, 190 posts, October 2012 to November 2026). The export's text was only readable for the first 95 posts (to March 2026); the summary tables covered all 190. Figures below come from Buffer only and are not estimated. Most posts before 2025 had very low reach, so treat comparisons across years with care; comparisons within 2026 are fairer.

## What lands

1. **Something people can use straight away.** The best-performing post by far was a set of eight practical AI prompts for project managers (about 44,600 impressions, 263 reactions, more than a quarter of all impressions in the account's history). Second was a list of the risks that turn up on every project (about 15,600). Useful, specific, saveable.
2. **A real moment, then the lesson.** Posts that open on something the author saw or did ("a project meeting years ago", "a freezing night shift at Finsbury Park depot as an apprentice", "a billboard at Euston this morning") did better than abstract advice. In the readable set, posts with a first-person story had a median of about 325 impressions against about 120 without, and roughly two and a half times the engagement rate.
3. **A concrete contrast.** A post comparing doors designed to fit with doors hammered into place, and asking why problems keep happening, reached about 4,300 people. One clear picture, one question.
4. **Short, honest takes.** The highest engagement rates (around 6 percent) went to short posts that admitted something: plans that rely on "it'll work out", AI making us easier to fool, the first step being the hardest.
5. **Railway roots.** Posts that mention rail, track or depots had roughly double the median impressions of those that did not. The railway is credibility, not decoration.

## What does not land

- **Quotations without a story.** Posts built around a famous quote had the lowest reach and almost no engagement.
- **Generic motivation.** Posts in 2024 on energy, obstacles and "finish the week strong" reached 30 to 50 people.
- **Corporate announcement tone.** "Exciting" news written like a press release reached fewer than 30.

## Tone

- First person, plain British English ("learnt", "programme", "organise").
- Short lines. One idea per paragraph. White space.
- Specific over general: name the depot, the meeting, the number.
- Honest about getting it wrong. "I learnt by doing. Made mistakes. Fixed them." is the register.
- Safety-critical seriousness without drama. Calm, not breathless.
- End with a real question the reader could answer from their own work.

## Phrases to keep

These sound like him and carry meaning:
- "Here's the thing" (sparingly, once per piece at most)
- "In my experience"
- "Safety-critical"
- "The messy reality of delivery"
- "Simple in theory. Hard in practice."
- "Fix it once" and "why does this keep happening?"
- "What's the real blocker?"

## Phrases and habits to drop

Some of these appear in his own past posts. Groundwork content does not use them:
- "Unlock", "superpower", "changes everything", "game-changer", "level up", "journey".
- Railway idioms used as decoration: "on track", "full steam ahead", "off the rails", "end of the line". The full list is in `src/domain/railway/cliches.ts`.
- Emoji bullets and stacks of hashtags.
- "Repost if this resonates" and "Comment X and I'll send the link". Fine for a personal feed; not for an app.
- Inspirational quotes as the main content.
- Em-dashes. Use a full stop or a comma.

## Applying it in the app

- **Explorer (children):** warm, curious, accurate. Short sentences. One picture per idea ("like snowshoes on snow"). Never babyish, never wrong.
- **Starter:** explain the real engineering plainly. Name the part, say what it does, say what goes wrong. Numbers only when sourced; say "about" when they vary.
- **Leader:** two to four sentences. What the mechanism means for delivering at scale. No slogans.
- **Mindcasts:** follow `docs/MINDCAST_METHOD.md`. Railway words stay on the railway side. Always say where the analogy stops working.
- **Credit:** seed content is "Groundwork editorial". Never invent a person, quote or story.

## A quick test before publishing

1. Could a track engineer check every fact?
2. Is there a real moment or mechanism, not just advice?
3. Did any railway pun or slop word sneak in?
4. Would a busy reader know what to do this week?
