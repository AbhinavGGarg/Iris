"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FaHandPeace, FaCalculator, FaCompass } from "react-icons/fa";
import { FiSettings, FiMusic, FiStar } from "react-icons/fi";

function SpinArrow({ className }: { className?: string }) {
  const [spinning, setSpinning] = useState(false);
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        transformOrigin: "center",
        animation: spinning ? "spin360 0.55s ease-in-out" : "none",
      }}
      onMouseEnter={() => setSpinning(true)}
      onAnimationEnd={() => setSpinning(false)}
    >
      ↑
    </span>
  );
}

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0b0907] text-white">

      {/* ── Atmospheric background layers ── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Base dark-warm gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c1208] via-[#0e0b07] to-[#060404]" />
        {/* Ambient glow — bottom-left warm pool */}
        <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 translate-y-1/4 rounded-full bg-amber-900/25 blur-[140px]" />
        {/* Ambient glow — mid-right cool pool */}
        <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-stone-700/15 blur-[110px]" />
        {/* Subtle center light behind hero text */}
        <div className="absolute left-1/2 top-1/2 h-80 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-800/10 blur-[100px]" />
        {/* Noise vignette overlay */}
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
        {/* Logo */}
        <span
          className="flex items-center text-xl font-black tracking-[0.2em] text-white uppercase select-none cursor-default"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          V<SpinArrow />
        </span>

        {/* Nav links */}
        <div className="hidden items-center gap-10 md:flex">
          {[
            { label: "Home", href: "/" },
            { label: "Math", href: "/select-topic" },
            { label: "ASL", href: "/select-topic" },
            { label: "Explore", href: "/select-topic" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col items-center gap-1"
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              <span className="text-sm font-semibold tracking-[0.25em] uppercase text-white/70 transition group-hover:text-amber-400">
                {label}
              </span>
              <span className="flex gap-[3px]">
                <span className="h-[3px] w-[3px] rounded-full bg-white/20 group-hover:bg-amber-400/60 transition" />
                <span className="h-[3px] w-[3px] rounded-full bg-white/20 group-hover:bg-amber-400/60 transition" />
                <span className="h-[3px] w-[3px] rounded-full bg-white/20 group-hover:bg-amber-400/60 transition" />
              </span>
            </Link>
          ))}
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-3 text-white/50">
          <span className="cursor-pointer text-sm transition hover:text-white"><FiSettings /></span>
          <span className="cursor-pointer text-sm transition hover:text-white"><FiStar /></span>
        </div>
      </nav>

      {/* ── Fixed left sidebar ── */}
      <div className="fixed left-0 top-1/2 z-20 -translate-y-1/2 flex flex-col items-center gap-5 border-r border-white/8 bg-black/40 px-3 py-5 backdrop-blur-sm">
        {[
          { icon: <FaCalculator />, label: "Math" },
          { icon: <FaHandPeace />, label: "ASL" },
          { icon: <FaCompass />, label: "Explore" },
        ].map(({ icon, label }) => (
          <Link
            key={label}
            href="/select-topic"
            title={label}
            className="flex flex-col items-center gap-1 opacity-50 transition hover:opacity-100"
          >
            <span className="text-xl">{icon}</span>
          </Link>
        ))}
      </div>

      {/* ── Hero ── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1
          className="logo-group text-[clamp(3rem,10vw,7rem)] font-black uppercase tracking-[0.12em] text-white cursor-default select-none"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            textShadow:
              "0 0 80px rgba(200,164,60,0.25), 0 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          V<SpinArrow />
        </h1>

        <p
          className="mt-5 max-w-2xl text-base font-normal uppercase tracking-[0.18em] leading-relaxed text-white/55"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Conversational-based learning games for neurodivergent kids, kids with limb differences, and Deaf ASL learners.
        </p>

        {/* CTA buttons */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/select-topic"
            className="border border-amber-500 px-14 py-4 text-sm font-bold uppercase tracking-[0.3em] text-amber-400 transition hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            Start
          </Link>
          <Link
            href="/select-topic"
            className="border border-white/35 px-14 py-4 text-sm font-bold uppercase tracking-[0.3em] text-white/75 transition hover:bg-white/5"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            See Games
          </Link>
        </div>

        {/* Subject tags */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
          <Tag icon={<FaCalculator />} label="Math" />
          <Tag icon={<FaHandPeace />} label="ASL" />
          <Tag icon={<FaCompass />} label="Explore" />
        </div>
      </div>

      {/* ── Bottom-right badge ── */}
      <div className="fixed bottom-6 right-6 z-20 flex items-center gap-3">
        <Link
          href="/select-topic"
          className="border border-white/20 bg-black/50 px-6 py-2.5 text-xs uppercase tracking-[0.25em] text-white/55 backdrop-blur-md transition hover:text-white/90"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Begin Journey
        </Link>
        <button
          className="flex h-8 w-8 items-center justify-center border border-white/20 bg-black/50 text-white/50 backdrop-blur-md transition hover:text-white/90"
          aria-label="Sound"
        >
          <FiMusic />
        </button>
      </div>
    </main>
  );
}

function Tag({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      className="flex items-center gap-2 border border-white/12 bg-white/4 px-6 py-2 text-sm uppercase tracking-[0.2em] text-white/45 backdrop-blur-md"
      style={{ fontFamily: "var(--font-cinzel), serif" }}
    >
      {icon} {label}
    </span>
  );
}