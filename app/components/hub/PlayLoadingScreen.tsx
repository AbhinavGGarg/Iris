"use client";

import { useEffect, useRef } from "react";
import { FiBookOpen, FiCompass, FiHeart, FiPlus } from "react-icons/fi";
import IrisMark from "@/app/components/brand/IrisMark";

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
          <div className="iris-launch-orbit" />
          <div className="iris-launch-logo"><IrisMark size={88} /></div>
          <span className="iris-launch-symbol iris-launch-symbol-math"><FiPlus /></span>
          <span className="iris-launch-symbol iris-launch-symbol-reading"><FiBookOpen /></span>
          <span className="iris-launch-symbol iris-launch-symbol-explore"><FiCompass /></span>
          <span className="iris-launch-symbol iris-launch-symbol-feelings"><FiHeart /></span>
        </div>

        <h2 id="iris-launch-title" className="font-display text-4xl font-semibold text-ink sm:text-5xl">Let&apos;s play.</h2>
        <p id="iris-launch-status" role="status" className="mt-3 text-lg text-ink-soft">
          {showRecovery ? "This is taking a little longer." : "Opening your worlds…"}
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
