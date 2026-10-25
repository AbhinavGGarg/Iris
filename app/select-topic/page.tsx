"use client";

import Image from "next/image";
import { FiArrowRight } from "react-icons/fi";
import HubHeader from "@/app/components/hub/HubHeader";
import { useRouter } from "next/navigation";
import { usePreloadBuddyModels } from "@/app/components/hub/usePreloadBuddyModels";
import { useHubStore, type Topic } from "@/app/lib/hubStore";

type TopicCard = {
  topic: Topic;
  title: string;
  game: string;
  blurb: string;
  imageSrc: string;
  imageAlt: string;
  subject: string;
  dot: string;
  hover: string;
};

// Cover crops scale landscape images by height in the tall desktop cards.
// Smaller screens use a 4:3 frame, so allow 1.125x its width for the 3:2 sources.
const TOPIC_IMAGE_SIZES = [
  "(min-width: 1280px) max(408px, 100dvh)",
  "(min-width: 1024px) calc(56.25vw - 67.5px)",
  "(min-width: 640px) calc(56.25vw - 49.5px)",
  "calc(112.5vw - 54px)",
].join(", ");

const TOPICS: TopicCard[] = [
  {
    topic: "math",
    title: "Math",
    game: "Boss Battle",
    blurb:
      "Solve math problems to power up your attacks and defeat the arena boss.",
    imageSrc: "/topic-cards/topic-boss.jpg",
    imageAlt:
      "Dark circular arena with dramatic red and magenta lighting like the boss battle",
    subject: "Math",
    dot: "bg-rose-500",
    hover: "hover:border-rose-400",
  },
  {
    topic: "spelling_asl",
    title: "ASL",
    game: "Word Adventure",
    blurb:
      "Spell words and practice signing as you hike a forest trail, zone by zone.",
    imageSrc: "/topic-cards/topic-adventure.jpg",
    imageAlt:
      "Sunlit forest trail through green woods like the Word Adventure journey",
    subject: "ASL & reading",
    dot: "bg-emerald-500",
    hover: "hover:border-emerald-500",
  },
  {
    topic: "science",
    title: "Explore",
    game: "Maze Quest",
    blurb:
      "Answer science questions to earn steps and find your way out of the maze.",
    imageSrc: "/topic-cards/topic-maze.jpg",
    imageAlt:
      "Nighttime hedge maze with purple fog and lit paths, matching the Maze Quest scene",
    subject: "Science",
    dot: "bg-sky-500",
    hover: "hover:border-sky-500",
  },
  {
    topic: "feelings",
    title: "Feelings",
    game: "Feelings Garden",
    blurb:
      "Visit your neighbors, name how they feel, and pick kind ways to help.",
    imageSrc: "/topic-cards/topic-garden-v3.png",
    imageAlt:
      "Quiet cottage garden with soft green foliage, a winding stone path, and a lily pond",
    subject: "Feelings",
    dot: "bg-rose-500",
    hover: "hover:border-rose-400",
  },
];

export default function SelectTopicPage() {
  const router = useRouter();
  usePreloadBuddyModels();
  const setSelectedTopic = useHubStore((s) => s.setSelectedTopic);

  const pick = (t: Topic) => {
    setSelectedTopic(t);
    router.push("/select-character");
  };

  return (
    <main className="flex min-h-dvh w-full flex-col bg-paper text-ink">
      <HubHeader step={1} backHref="/" wide />

      <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-6 pb-10 pt-4 sm:px-8 lg:px-12">
        <h1 tabIndex={-1} className="font-display text-4xl font-semibold focus:outline-none sm:text-5xl 2xl:text-6xl">Where to today?</h1>
        <p className="mt-3 text-lg text-ink-soft sm:text-xl">Pick a world. You can switch any time.</p>

        <div className="mt-8 grid w-full gap-6 sm:grid-cols-2 xl:flex-1 xl:grid-cols-4">
          {TOPICS.map((t) => (
            <article
              key={t.topic}
              className={`iris-card group flex min-w-0 flex-col overflow-hidden transition-colors duration-200 ${t.hover}`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink xl:aspect-auto xl:min-h-64 xl:flex-1">
                <Image
                  src={t.imageSrc}
                  alt={t.imageAlt}
                  fill
                  quality={90}
                  sizes={TOPIC_IMAGE_SIZES}
                  className="object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  priority={t.topic === "science"}
                />
              </div>

              <div className="flex flex-1 flex-col p-6 xl:flex-none 2xl:p-8">
                <div className="flex items-center gap-2 text-sm font-bold text-ink-soft">
                  <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
                  {t.subject}
                </div>
                <h2 className="font-display mt-2 text-2xl font-semibold 2xl:text-3xl">{t.game}</h2>
                <p className="mt-3 flex-1 text-base leading-relaxed text-ink-soft xl:min-h-[4.875rem] 2xl:min-h-[5.5rem] 2xl:text-lg">{t.blurb}</p>
                <button
                  type="button"
                  onClick={() => pick(t.topic)}
                  className="iris-btn iris-btn-primary mt-6 min-h-14 w-full px-5 py-3 text-xl"
                >
                  Play {t.title} <FiArrowRight aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
