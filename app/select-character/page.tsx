"use client";

import { FiArrowRight } from "react-icons/fi";
import HubHeader from "@/app/components/hub/HubHeader";
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
    <main className="flex min-h-screen w-full flex-col bg-paper text-ink">
      <HubHeader step={2} backHref="/select-topic" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-16 pt-4">
        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-iris-500">
          {TOPIC_LABEL[selectedTopic]}
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold sm:text-5xl">Who&apos;s coming with you?</h1>
        <p className="mt-3 text-lg text-ink-soft">Your buddy talks with you and cheers you on the whole way.</p>

        <div className="mt-10 grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHARACTER_LIST.map((c) => {
            const isHover = hovered === c.slug;
            return (
              <button
                key={c.slug}
                onMouseEnter={() => setHovered(c.slug)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => pick(c.slug)}
                className="iris-card group flex w-full flex-col items-center px-5 pb-6 pt-6 text-center transition duration-200 hover:-translate-y-1 hover:border-iris-500 focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun"
              >
                <div
                  className="h-40 w-40 overflow-hidden rounded-full"
                  style={{ background: `${c.color}22` }}
                >
                  <CharacterPreview slug={c.slug} hovered={isHover} />
                </div>

                <div className="font-display mt-5 text-xl font-semibold">{c.label}</div>
                <div className="mt-1.5 min-h-[2.5rem] text-sm leading-snug text-ink-soft">
                  {CHARACTER_BLURB[c.slug]}
                </div>

                <span className="mt-4 inline-flex items-center gap-2 font-display text-base font-semibold text-iris-500 transition group-hover:gap-3">
                  Pick {c.label.split(" ")[1]} <FiArrowRight />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
