"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const WORLD_PREVIEWS = [
  { name: "Math", image: "/topic-cards/topic-boss.jpg", className: "math" },
  { name: "Words", image: "/topic-cards/topic-adventure.jpg", className: "words" },
  { name: "Explore", image: "/topic-cards/topic-maze.jpg", className: "explore" },
  { name: "Feelings", image: "/topic-cards/topic-garden-v2.png", className: "feelings" },
];

type PlayLoadingScreenProps = {
  exiting: boolean;
  showRecovery: boolean;
  onDismiss: () => void;
};

export default function PlayLoadingScreen({ exiting, showRecovery, onDismiss }: PlayLoadingScreenProps) {
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    screenRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <div
      ref={screenRef}
      className="iris-launch-screen"
      data-exiting={exiting}
      role="dialog"
      aria-modal="true"
      aria-labelledby="iris-launch-title"
      aria-describedby="iris-launch-status"
      tabIndex={-1}
      onKeyDown={(event) => { if (event.key === "Escape") onDismiss(); }}
    >
      <div className="iris-launch-content">
        <div className="iris-launch-art" aria-hidden="true">
          {WORLD_PREVIEWS.map((world) => (
            <div key={world.name} className={`iris-launch-card iris-launch-card-${world.className}`}>
              <div className="iris-launch-photo">
                <Image
                  src={world.image}
                  alt=""
                  fill
                  // Match the homepage so the transition reuses its cached images.
                  sizes="(max-width: 1024px) 50vw, 320px"
                  quality={75}
                  loading="eager"
                  className="object-cover"
                />
              </div>
              <span className="iris-launch-card-label">{world.name}</span>
            </div>
          ))}
        </div>

        <h2 id="iris-launch-title" className="font-display text-3xl font-medium text-ink sm:text-4xl">A little adventure awaits.</h2>
        <p id="iris-launch-status" role="status" className="mt-3 text-lg text-ink-soft">
          {showRecovery ? "This is taking a little longer." : "Getting your worlds ready…"}
        </p>
        <div className="iris-launch-dots" aria-hidden="true"><span /><span /><span /></div>

        {showRecovery && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {/* A normal link also recovers if client-side navigation has stalled. */}
            <a href="/select-topic" className="iris-btn iris-btn-primary px-6 py-3">Try again</a>
            <button type="button" onClick={onDismiss} className="iris-btn iris-btn-soft px-6 py-3">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
