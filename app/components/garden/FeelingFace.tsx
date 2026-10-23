import type { Feeling } from "@/app/lib/gardenStories";

const FILL: Record<Feeling, string> = {
  happy: "#ffd95a",
  sad: "#9fd0ff",
  angry: "#ff8f80",
  scared: "#cdbcff",
};

export default function FeelingFace({ feeling, size = 48 }: { feeling: Feeling; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="22" fill={FILL[feeling]} stroke="#1e1a3a" strokeWidth="2" />
      {feeling === "scared" ? (
        <>
          <circle cx="17" cy="21" r="4.2" fill="#fff" stroke="#1e1a3a" strokeWidth="1.5" />
          <circle cx="31" cy="21" r="4.2" fill="#fff" stroke="#1e1a3a" strokeWidth="1.5" />
          <circle cx="17" cy="21.5" r="1.8" fill="#1e1a3a" />
          <circle cx="31" cy="21.5" r="1.8" fill="#1e1a3a" />
        </>
      ) : (
        <>
          <circle cx="17" cy="21" r="2.6" fill="#1e1a3a" />
          <circle cx="31" cy="21" r="2.6" fill="#1e1a3a" />
        </>
      )}
      {feeling === "sad" && (
        <>
          <path d="M12 15 L20 13" stroke="#1e1a3a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M36 15 L28 13" stroke="#1e1a3a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M17 35 Q24 29 31 35" fill="none" stroke="#1e1a3a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M33 25 q2 4 0 5 q-2 -1 0 -5z" fill="#3aa0e6" />
        </>
      )}
      {feeling === "angry" && (
        <>
          <path d="M12 13 L21 17" stroke="#1e1a3a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M36 13 L27 17" stroke="#1e1a3a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M17 35 Q24 30 31 35" fill="none" stroke="#1e1a3a" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {feeling === "happy" && (
        <>
          <path d="M13 14 Q17 12 21 14" fill="none" stroke="#1e1a3a" strokeWidth="2" strokeLinecap="round" />
          <path d="M27 14 Q31 12 35 14" fill="none" stroke="#1e1a3a" strokeWidth="2" strokeLinecap="round" />
          <path d="M15 29 Q24 38 33 29" fill="none" stroke="#1e1a3a" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {feeling === "scared" && (
        <>
          <path d="M12 12 Q16 9 20 12" fill="none" stroke="#1e1a3a" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 12 Q32 9 36 12" fill="none" stroke="#1e1a3a" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="24" cy="33" rx="3.6" ry="4.4" fill="#5a2626" stroke="#1e1a3a" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
