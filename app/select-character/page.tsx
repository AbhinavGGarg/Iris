"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CharacterPreview from "@/app/components/hub/CharacterPreview";
import { CHARACTER_LIST, type CharacterSlug } from "@/app/lib/characters";
import { TOPIC_TO_ROUTE, useHubStore, type Topic } from "@/app/lib/hubStore";

const TOPIC_LABEL: Record<Topic, string> = {
  science: "Explore",
  math: "Math",
  spelling_asl: "ASL",
};

const CHARACTER_BLURB: Record<CharacterSlug, string> = {
  bear: "Warm, patient, gives big cheers.",
  fox: "Quick and clever — loves a puzzle.",
  robot: "Helpful and steady. Beep boop!",
  cat: "Curious explorer, lands on her feet.",
};

export default function SelectCharacterPage() {
  const router = useRouter();
  const selectedTopic = useHubStore((s) => s.selectedTopic);
  const setSelectedCharacter = useHubStore((s) => s.setSelectedCharacter);
  const [hovered, setHovered] = useState<CharacterSlug | null>(null);

  useEffect(() => {
    if (!selectedTopic) router.replace("/select-topic");
  }, [selectedTopic, router]);

  if (!selectedTopic) return null;

  const pick = (slug: CharacterSlug) => {
    setSelectedCharacter(slug);
    router.push(TOPIC_TO_ROUTE[selectedTopic]);
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
          Step 2 of 2
        </span>

        <Link
          href="/select-topic"
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
            Choose Your Ally
          </h1>
          <p
            className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/40"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            Who&apos;s joining the {TOPIC_LABEL[selectedTopic]} battle?
          </p>
        </div>

        {/* ── Character cards ── */}
        <div className="mx-auto w-full max-w-5xl grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CHARACTER_LIST.map((c) => {
            const isHover = hovered === c.slug;
            return (
              <button
                key={c.slug}
                onMouseEnter={() => setHovered(c.slug)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => pick(c.slug)}
                className="group flex w-full flex-col items-center border border-white/10 bg-white/3 px-5 py-6 text-center shadow-2xl backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
                style={{
                  boxShadow: isHover
                    ? `0 0 48px rgba(180,140,60,0.2)`
                    : undefined,
                }}
              >
                {/* 3-D character preview */}
                <div
                  className="h-36 w-36 overflow-hidden rounded-full border border-white/10 transition duration-300 group-hover:border-amber-500/30"
                  style={{ background: `${c.color}18` }}
                >
                  <CharacterPreview slug={c.slug} hovered={isHover} />
                </div>

                {/* Name */}
                <div
                  className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-white"
                  style={{ fontFamily: "var(--font-cinzel), serif" }}
                >
                  {c.label}
                </div>

                {/* Blurb */}
                <div
                  className="mt-1.5 text-[10px] leading-relaxed tracking-wide text-white/45"
                  style={{ fontFamily: "var(--font-cinzel), serif" }}
                >
                  {CHARACTER_BLURB[c.slug]}
                </div>

                {/* CTA */}
                <div className="mt-5 flex w-full items-center justify-between border-t border-white/8 pt-4">
                  <span
                    className="text-[10px] uppercase tracking-[0.25em] text-amber-400/70 transition group-hover:text-amber-300"
                    style={{ fontFamily: "var(--font-cinzel), serif" }}
                  >
                    Select
                  </span>
                  <span
                    className="flex h-7 w-7 items-center justify-center border border-amber-500/40 text-xs text-amber-400 transition group-hover:border-amber-400 group-hover:bg-amber-500/10"
                    aria-hidden
                  >
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom-right badge ── */}
      <div className="fixed bottom-6 right-6 z-20">
        <div
          className="border border-white/15 bg-black/50 px-5 py-2 text-[10px] uppercase tracking-[0.25em] text-white/30 backdrop-blur-md"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Step 2 — Ally
        </div>
      </div>
    </main>
  );
}