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
    imageSrc: "/topic-cards/topic-garden.jpg",
    imageAlt:
      "Sunny village with cozy houses and friendly animal neighbors around a pond",
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
    <main className="flex min-h-screen w-full flex-col bg-paper text-ink">
      <HubHeader step={1} backHref="/" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-16 pt-4">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Where to today?</h1>
        <p className="mt-3 text-lg text-ink-soft">Pick a world. You can switch any time.</p>

        <div className="mt-10 grid w-full gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {TOPICS.map((t) => (
            <button
              key={t.topic}
              type="button"
              onClick={() => pick(t.topic)}
              className={`iris-card group flex w-full flex-col overflow-hidden text-left transition duration-200 hover:-translate-y-1 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun ${t.hover}`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink">
                <Image
                  src={t.imageSrc}
                  alt={t.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  priority={t.topic === "science"}
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-ink-soft">
                  <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
                  {t.subject}
                </div>
                <h2 className="font-display mt-1.5 text-2xl font-semibold">{t.game}</h2>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">{t.blurb}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-display text-lg font-semibold text-iris-500 transition group-hover:gap-3">
                  Play {t.title} <FiArrowRight />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
