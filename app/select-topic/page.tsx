"use client";

import Image from "next/image";
import Link from "next/link";
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
  accentClass: string;
  hoverGlow: string;
};

const TOPICS: TopicCard[] = [
  {
    topic: "math",
    title: "Math",
    game: "Boss Battle",
    blurb:
      "Solve math problems to power your attacks in the dark arena boss fight.",
    imageSrc: "/topic-cards/topic-boss.jpg",
    imageAlt:
      "Dark circular arena with dramatic red and magenta lighting like the boss battle",
    accentClass: "text-amber-400",
    hoverGlow: "hover:shadow-[0_0_48px_rgba(200,140,40,0.3)]",
  },
  {
    topic: "spelling_asl",
    title: "ASL",
    game: "Word Adventure",
    blurb:
      "Spell words and practice signs along a forest path through every zone.",
    imageSrc: "/topic-cards/topic-adventure.jpg",
    imageAlt:
      "Sunlit forest trail through green woods like the Word Adventure journey",
    accentClass: "text-amber-200",
    hoverGlow: "hover:shadow-[0_0_48px_rgba(160,130,50,0.25)]",
  },
  {
    topic: "science",
    title: "Explore",
    game: "Maze Quest",
    blurb:
      "Answer a question, earn a step, and find your way through the glowing maze.",
    imageSrc: "/topic-cards/topic-maze.jpg",
    imageAlt:
      "Nighttime hedge maze with purple fog and lit paths, matching the Maze Quest scene",
    accentClass: "text-amber-300",
    hoverGlow: "hover:shadow-[0_0_48px_rgba(180,140,60,0.25)]",
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
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0b0907] text-white">

      {/* ── Atmospheric background ── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c1208] via-[#0e0b07] to-[#060404]" />
        <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 translate-y-1/4 rounded-full bg-amber-900/20 blur-[140px]" />
        <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-stone-700/10 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 40%, #000 100%)",
          }}
        />
      </div>

      {/* ── Top navigation ── */}
      <nav className="relative z-20 flex items-center justify-between border-b border-white/8 bg-black/70 px-8 py-4 backdrop-blur-sm">
        <Link
          href="/"
          className="logo-group flex items-center text-base font-black tracking-[0.2em] text-white uppercase"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          V<span className="logo-arrow">↑</span>
        </Link>

        <span
          className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Step 1 of 2
        </span>

        <Link
          href="/"
          className="border border-white/20 px-5 py-2 text-[10px] uppercase tracking-[0.25em] text-white/55 transition hover:border-white/40 hover:text-white/90"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          ← Back
        </Link>
      </nav>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-1 flex-col px-8 py-14">

        {/* Heading */}
        <div className="mb-12 text-center">
          <h1
            className="text-4xl font-black uppercase tracking-[0.15em] text-white sm:text-5xl"
            style={{
              fontFamily: "var(--font-cinzel), serif",
              textShadow:
                "0 0 60px rgba(200,164,60,0.2), 0 2px 4px rgba(0,0,0,0.8)",
            }}
          >
            Choose Your Path
          </h1>
          <p
            className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/40"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            What do you want to practice today?
          </p>
        </div>

        {/* ── Topic cards ── */}
        <div className="mx-auto w-full max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => (
            <button
              key={t.topic}
              type="button"
              onClick={() => pick(t.topic)}
              className={`group flex w-full flex-col overflow-hidden border border-white/10 bg-white/3 text-left shadow-2xl backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${t.hoverGlow}`}
            >
              {/* Image */}
              <div className="relative aspect-[5/4] w-full overflow-hidden bg-[#0c0905]">
                <Image
                  src={t.imageSrc}
                  alt={t.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                  className="object-cover opacity-65 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-80"
                  priority={t.topic === "science"}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, #0b0907 0%, rgba(11,9,7,0.4) 50%, transparent 100%)",
                  }}
                  aria-hidden
                />
                {/* Game label on image */}
                <p
                  className={`absolute bottom-3 left-4 text-[9px] font-bold uppercase tracking-[0.3em] ${t.accentClass}`}
                  style={{ fontFamily: "var(--font-cinzel), serif" }}
                >
                  {t.game}
                </p>
              </div>

              {/* Card body */}
              <div className="flex flex-1 flex-col px-5 py-5">
                <h2
                  className="text-sm font-bold uppercase tracking-[0.18em] text-white"
                  style={{ fontFamily: "var(--font-cinzel), serif" }}
                >
                  {t.title}
                </h2>
                <p className="mt-2 text-[11px] leading-relaxed tracking-wide text-white/50">
                  {t.blurb}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                  <span
                    className={`text-[10px] uppercase tracking-[0.25em] transition group-hover:text-amber-300 ${t.accentClass}`}
                    style={{ fontFamily: "var(--font-cinzel), serif" }}
                  >
                    Continue
                  </span>
                  <span
                    className="flex h-7 w-7 items-center justify-center border border-amber-500/40 text-xs text-amber-400 transition group-hover:border-amber-400 group-hover:bg-amber-500/10"
                    aria-hidden
                  >
                    →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom-right badge ── */}
      <div className="fixed bottom-6 right-6 z-20">
        <div
          className="border border-white/15 bg-black/50 px-5 py-2 text-[10px] uppercase tracking-[0.25em] text-white/30 backdrop-blur-md"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Step 1 — Topic
        </div>
      </div>
    </main>
  );
}