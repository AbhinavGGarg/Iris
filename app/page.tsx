"use client";

import Image from "next/image";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import IrisMark from "@/app/components/brand/IrisMark";
import { PlayLink } from "@/app/components/hub/PlayTransition";

const WORLDS = [
  { src: "/topic-cards/topic-adventure.jpg", alt: "Forest trail from Word Adventure", subject: "ASL & reading", game: "Word Adventure", dot: "bg-emerald-500" },
  { src: "/topic-cards/topic-boss.jpg", alt: "Glowing arena from Boss Battle", subject: "Math", game: "Boss Battle", dot: "bg-rose-500" },
  { src: "/topic-cards/topic-maze.jpg", alt: "Night hedge maze from Maze Quest", subject: "Science", game: "Maze Quest", dot: "bg-sky-500" },
  { src: "/topic-cards/topic-garden-v3.png", alt: "Quiet cottage garden with a stone path and lily pond", subject: "Feelings", game: "Feelings Garden", dot: "bg-rose-500" },
];

const STEPS = [
  { n: "1", title: "Pick a world", text: "Math, ASL, science, or feelings. Each one is its own little game." },
  { n: "2", title: "Choose a buddy", text: "A bear, fox, robot, or cat who talks with you the whole time." },
  { n: "3", title: "Answer your way", text: "Say it out loud, fingerspell it in ASL, or sketch it on the whiteboard." },
];

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col bg-paper text-ink">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display flex items-center gap-2 text-2xl font-semibold text-ink">
          <IrisMark size={30} className="text-ink" />
          Iris
        </Link>
        <div className="flex items-center gap-6">
          <a href="#how" className="hidden text-[15px] font-bold text-ink-soft transition hover:text-ink sm:block">
            How it works
          </a>
          <Link href="/select-topic" className="hidden text-[15px] font-bold text-ink-soft transition hover:text-ink sm:block">
            Games
          </Link>
          <PlayLink className="iris-btn iris-btn-primary px-5 py-2.5 text-[15px]">
            Play now
          </PlayLink>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-14">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-iris-500">
            Learning games for kids who learn out loud
          </p>
          <h1 className="font-display mt-4 text-[clamp(2.6rem,5.2vw,4.25rem)] font-semibold leading-[1.04]">
            Learn by talking.
            <br />
            Play{" "}
            <span className="relative inline-block text-iris-500">
              your way.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                <path d="M3 8c40-6 90-7 194-3" fill="none" stroke="#ffc53d" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-soft">
            Iris is built for neurodivergent kids, kids with limb differences, and Deaf ASL learners.
            A buddy asks questions out loud, listens to the answer, and cheers every step forward.
            Nobody has to type.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <PlayLink className="iris-btn iris-btn-primary px-8 py-4 text-lg">
              Start playing <FiArrowRight />
            </PlayLink>
            <a href="#how" className="text-base font-bold text-ink underline decoration-sun decoration-[3px] underline-offset-[6px] transition hover:text-iris-600">
              See how it works
            </a>
          </div>
        </div>

        <div className="grid h-[440px] grid-cols-2 grid-rows-2 gap-3 sm:h-[480px]">
          {WORLDS.map((w, i) => (
            <Link
              key={w.game}
              href="/select-topic"
              className="group relative overflow-hidden rounded-[1.5rem] bg-ink"
            >
              <Image
                src={w.src}
                alt={w.alt}
                fill
                sizes="(max-width: 1024px) 50vw, 320px"
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
                priority={i === 0}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-12">
                <div className="flex items-center gap-2 text-xs font-bold text-white/85">
                  <span className={`h-2 w-2 rounded-full ${w.dot}`} />
                  {w.subject}
                </div>
                <div className="font-display mt-0.5 text-xl font-semibold text-white">{w.game}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="border-t border-ink/10 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <h2 className="font-display text-3xl font-semibold">How a session works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="border-t-2 border-ink pt-5">
                <span className="font-display text-4xl font-semibold text-iris-500">{s.n}</span>
                <h3 className="font-display mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
