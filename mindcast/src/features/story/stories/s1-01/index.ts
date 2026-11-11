/**
 * Stop 1, "Why rails need gaps", as an illustrated story.
 *
 * Captions follow docs/VOICE.md: plain British English, contractions, no em-dashes, no railway puns, no
 * figures (the app explains principles; each railway sets its own numbers). Every railway claim matches the
 * lesson's checked key facts in src/domain/railway/lessons.ts (s1-01), and the lens scene uses its Mindcast.
 * Steel "expands" and "contracts"; it never "grows" (docs/MINDCAST_METHOD.md §5).
 * Starter captions stay within about 25 words.
 */
import type { Story } from "../../types";
import { CheckScene } from "./check";
import { CwrScene } from "./cwr";
import { FieldScene } from "./field";
import { HookScene } from "./hook";
import { JointScene } from "./joint";
import { LensScene } from "./lens";
import { MoveScene } from "./move";
import { TryScene } from "./try";
import { WarmScene } from "./warm";

export const s1_01: Story = {
  lessonId: "s1-01",
  scenes: [
    {
      id: "listen",
      eyebrow: "Listen",
      Art: HookScene,
      caption: {
        explorer: "Listen to an old railway and you'll hear clickety-clack. That sound is a clue. Let's find out what makes it.",
        starter: "On older lines a train goes clickety-clack. Each clack is a wheel crossing a small gap between two rails. The gaps are there on purpose.",
        leader: "That clack is the sound of a design decision. Someone chose to leave a gap at every joint, and accepted the noise and wear that came with it.",
      },
    },
    {
      id: "warm",
      eyebrow: "Warm steel",
      Art: WarmScene,
      // Opens on a playful guess, drawn in the scene; the caption explains once the drawing has shown it.
      interactive: true,
      before: {
        explorer: "Have a guess. When the sun warms this rail, what do you think happens to it? Tap one.",
        starter: "What do you think happens? Tap a guess, then watch the rail on a warm day.",
        leader: "A quick guess before the drawing shows it: when the sun warms this rail, what does it do?",
      },
      caption: {
        explorer: "When the sun warms a rail, the steel gets a tiny bit longer. When it cools down again, it gets a tiny bit shorter.",
        starter: "Warm steel expands. Cool steel contracts. In full sun a rail runs hotter than the air, and over a whole rail length that adds up.",
        leader: "Temperature is a force nobody on site can switch off. The engineering question was never how to stop expansion. It was where to let it go.",
      },
    },
    {
      id: "try",
      eyebrow: "Try it",
      Art: TryScene,
      interactive: true,
      caption: {
        explorer: "Your turn. Drag the sun up and down. Watch the little gap between the rails close when it's hot and open when it's cold.",
        starter: "Drag the sun. As the rails warm, they expand into the gap until it closes. With no room left, the steel starts to push sideways.",
        leader: "Drag the sun. The gap takes the pressure until it's used up. After that the force still has to go somewhere, and it finds the weakest direction.",
      },
    },
    {
      id: "joint",
      eyebrow: "The joint",
      Art: JointScene,
      caption: {
        explorer: "Here's a joint up close. Steel plates and bolts hold the two rail ends together, with a little gap left between them.",
        starter: "At a joint, fishplates are bolted through both rail ends. The rails can slide a little into the gap. Each wheel dips over it: clack.",
        leader: "Every joint is a small step for the wheel. It wears the rail ends, works the bolts loose and needs constant attention. The allowance has a running cost.",
      },
    },
    {
      id: "welded",
      eyebrow: "Today's railway",
      Art: CwrScene,
      caption: {
        explorer: "Busy railways today weld rails into one very long piece and clip it down tight. Then there are no gaps, and no clack.",
        starter: "Main lines now weld rails into one long rail, stretch it to the right length, then clip it down. Sleepers and ballast hold it still.",
        leader: "Welded rail swaps thousands of small movements for one large force held inside the steel. It's quieter and cheaper to look after, but only if it was fixed down right.",
      },
    },
    {
      id: "field",
      eyebrow: "From the field",
      Art: FieldScene,
      // DRAFT: practitioner advice written in the founder's voice for him to replace with his own words or a
      // real story. The note card's text lives in ./field.tsx (FIELD_NOTE). Nothing in the UI shows "draft".
      draft: true,
      caption: {
        explorer: "Railway workers check the joints on hot days. A closed gap is fine. A wide gap in the heat means something may be stuck.",
        starter: "On a hot day, closed gaps are fine. A wide gap is the question: what's stopping the rail sliding into its room?",
        leader: "Heat doesn't wait for the programme. Plan the extra watching that hot weather needs, and treat a wide gap on a hot day as a question, not a detail.",
      },
    },
    {
      id: "lens",
      eyebrow: "The lens",
      Art: LensScene,
      caption: {
        explorer: "Grown-ups use this idea at work. When worries have a time and place to be said, they don't build up and burst out somewhere else.",
        starter: "Work has the same pattern. A standing slot for problems gives pressure a planned place to go. Block it, and it comes out sideways.",
        leader: "Name the pressures certain to arrive and give each a planned place to go. Unlike steel, people aren't predictable, so use the room to listen, not to measure anyone.",
      },
    },
    {
      id: "move",
      eyebrow: "Your move",
      Art: MoveScene,
      interactive: true,
      caption: {
        explorer: "A job for a grown-up: keep five minutes in a team meeting each week for anything that's stuck, even when nobody needs it.",
        starter: "Add one standing five-minute \"what's stuck?\" slot to your team meeting this week, and keep it even when nobody uses it.",
        leader: "Add a standing five-minute \"what's stuck?\" slot to your team meeting this week. Leave it on the agenda even when nobody uses it. That's the point.",
      },
    },
    {
      id: "check",
      eyebrow: "Quick check",
      Art: CheckScene,
      interactive: true,
      caption: {
        explorer: "Quick check. It's a hot day. Tap the spot on the track where the steel has room to get longer.",
        starter: "Quick check. It's a hot afternoon. Tap the place in the drawing where this steel has room to expand.",
        leader: "Quick check. Tap where this track gives the pressure a planned place to go.",
      },
    },
  ],
};
