"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import PlayLoadingScreen from "./PlayLoadingScreen";

const StartPlayContext = createContext<(() => void) | null>(null);
const INTRO_DURATION_MS = 2400;
const REDUCED_MOTION_DURATION_MS = 1200;
const EXIT_DURATION_MS = 400;

type PlayTransitionState = {
  fromPath: string;
  startedAt: number;
  reducedMotion: boolean;
};

export function PlayTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [transition, setTransition] = useState<PlayTransitionState | null>(null);
  const [exiting, setExiting] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const returnFocus = useRef<{ element: HTMLElement | null; path: string } | null>(null);
  const shouldRestoreFocus = useRef(false);

  const dismiss = useCallback(() => {
    shouldRestoreFocus.current = returnFocus.current !== null;
    setTransition(null);
    setExiting(false);
    setShowRecovery(false);
  }, []);

  const start = useCallback(() => {
    if (transition) return;
    returnFocus.current = {
      element: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      path: pathname,
    };
    setExiting(false);
    setShowRecovery(false);
    setTransition({
      fromPath: pathname,
      startedAt: performance.now(),
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }, [pathname, transition]);

  useEffect(() => {
    if (transition || !shouldRestoreFocus.current) return;
    shouldRestoreFocus.current = false;
    const origin = returnFocus.current;
    returnFocus.current = null;
    // Wait until React has removed inert before handing focus back to the page.
    if (origin?.path === pathname && origin.element?.isConnected) {
      origin.element.focus({ preventScroll: true });
    } else {
      document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
    }
  }, [pathname, transition]);

  useEffect(() => {
    if (!transition || pathname === transition.fromPath) return;

    // Keep the preview readable while the destination loads underneath it.
    const introDuration = transition.reducedMotion ? REDUCED_MOTION_DURATION_MS : INTRO_DURATION_MS;
    const remaining = Math.max(0, introDuration - (performance.now() - transition.startedAt));
    const fadeTimer = window.setTimeout(() => setExiting(true), remaining);
    const finishTimer = window.setTimeout(dismiss, remaining + (transition.reducedMotion ? 0 : EXIT_DURATION_MS));
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(finishTimer);
    };
  }, [pathname, transition, dismiss]);

  useEffect(() => {
    if (!transition) return;
    const recoveryTimer = window.setTimeout(() => setShowRecovery(true), 8000);
    return () => window.clearTimeout(recoveryTimer);
  }, [transition]);

  useEffect(() => {
    window.addEventListener("popstate", dismiss);
    window.addEventListener("pageshow", dismiss);
    return () => {
      window.removeEventListener("popstate", dismiss);
      window.removeEventListener("pageshow", dismiss);
    };
  }, [dismiss]);

  return (
    <StartPlayContext.Provider value={start}>
      <div className="contents" inert={transition !== null}>{children}</div>
      {transition && <PlayLoadingScreen exiting={exiting} showRecovery={showRecovery} onDismiss={dismiss} />}
    </StartPlayContext.Provider>
  );
}

export function PlayLink({ children, className }: { children: ReactNode; className?: string }) {
  const start = useContext(StartPlayContext);
  if (!start) throw new Error("PlayLink requires PlayTransitionProvider");

  return <Link href="/select-topic" onNavigate={start} className={className}>{children}</Link>;
}
