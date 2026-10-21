"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBossStore } from "@/app/lib/bossStore";

const cinzel = { fontFamily: "var(--font-cinzel), serif" } as const;

const CANVAS_W = 1024;
const CANVAS_H = 768;
const STROKE_WIDTH = 4;
const PROBLEM_BANNER_H = 96;
const PROBLEM_FONT = "32px ui-serif, Georgia, serif";

function paintBackground(ctx: CanvasRenderingContext2D, problem: string) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = "#d6d3d1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, PROBLEM_BANNER_H);
  ctx.lineTo(CANVAS_W, PROBLEM_BANNER_H);
  ctx.stroke();
  ctx.fillStyle = "#000000";
  ctx.font = PROBLEM_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Problem: ${problem}`, 24, PROBLEM_BANNER_H / 2);
}

function configurePen(ctx: CanvasRenderingContext2D) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = STROKE_WIDTH;
}

export default function BossDrawingPad() {
  const open = useBossStore((s) => s.whiteboardOpen);
  const close = useBossStore((s) => s.closeWhiteboard);
  const submitting = useBossStore((s) => s.submitting);
  const setSubmitting = useBossStore((s) => s.setSubmitting);
  const setVerdict = useBossStore((s) => s.setVerdict);
  const verdict = useBossStore((s) => s.verdict);
  const annotatedImage = useBossStore((s) => s.annotatedImage);
  const currentQuestion = useBossStore((s) => s.currentQuestion);

  const question = currentQuestion();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintBackground(ctx, question.problem);
    configurePen(ctx);
    undoStack.current = [];
    setHasInk(false);
  }, [question.problem]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset, question.problem]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (submitting || verdict) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    if (undoStack.current.length < 50) {
      undoStack.current.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
    }
    const p = getPos(e);
    if (!p) return;
    drawing.current = true;
    last.current = p;
    ctx.beginPath();
    ctx.arc(p.x, p.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const p = getPos(e);
    if (!ctx || !p || !last.current) return;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };

  const onPointerUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const undo = () => {
    if (submitting || verdict) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const snap = undoStack.current.pop();
    if (snap) {
      ctx.putImageData(snap, 0, 0);
      configurePen(ctx);
      setHasInk(undoStack.current.length > 0);
    } else {
      reset();
    }
  };

  const submit = async () => {
    const canvas = canvasRef.current;
    if (!canvas || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const imageBase64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, "");
      const res = await fetch("/api/grade-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          problem: question.problem,
          solutionSteps: question.solutionSteps,
          answer: question.answer,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Grading failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        verdict: "correct" | "incorrect";
        note: string;
        annotatedImageBase64: string | null;
      };
      const annotated = data.annotatedImageBase64
        ? `data:image/jpeg;base64,${data.annotatedImageBase64}`
        : null;
      setVerdict(data.verdict, data.note, annotated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Grading failed";
      setError(msg);
      setSubmitting(false);
    }
  };

  const continueAfterVerdict = () => {
    close();
  };

  if (!open) return null;

  const showResultView = verdict !== null;
  const isCorrect = verdict === "correct";

  return (
    <div
      className="pointer-events-auto absolute right-0 top-0 z-30 flex h-full w-[480px] flex-col gap-3 border-l border-rose-500/20 bg-black/70 p-4 shadow-2xl backdrop-blur-md"
      style={cinzel}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-rose-400/80">
            Whiteboard
          </div>
          <div className="text-sm uppercase tracking-[0.2em] text-white">
            {question.difficulty} · {question.category}
          </div>
        </div>
        <button
          onClick={close}
          disabled={submitting}
          className="shrink-0 border border-rose-500/40 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-rose-400/70 transition hover:border-rose-400 hover:text-rose-300 disabled:opacity-40"
        >
          Close
        </button>
      </div>

      {!showResultView && (
        <>
          <div className="border border-white/15 bg-white shadow-xl">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerUp}
              style={{
                width: "100%",
                height: "auto",
                touchAction: "none",
                cursor: submitting ? "wait" : "crosshair",
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={submitting || !hasInk}
                className="shrink-0 border border-white/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/55 transition hover:border-white/40 hover:text-white/90 disabled:opacity-40"
              >
                Undo
              </button>
              <button
                onClick={reset}
                disabled={submitting}
                className="shrink-0 border border-white/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/55 transition hover:border-white/40 hover:text-white/90 disabled:opacity-40"
              >
                Clear
              </button>
            </div>
            <button
              onClick={submit}
              disabled={submitting || !hasInk}
              className="shrink-0 border border-amber-500/60 px-6 py-2 text-[10px] uppercase tracking-[0.2em] text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-40"
            >
              {submitting ? "Grading…" : "Submit"}
            </button>
          </div>

          {error && (
            <div className="border border-rose-400/40 bg-rose-500/10 p-2 text-[10px] uppercase tracking-[0.2em] text-rose-200">
              {error}
            </div>
          )}
        </>
      )}

      {showResultView && (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          <div className="border border-white/15 bg-white shadow-xl">
            {annotatedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={annotatedImage} alt="Annotated work" className="w-full" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-[10px] uppercase tracking-[0.2em] text-stone-500">
                No annotated image returned
              </div>
            )}
          </div>

          <button
            onClick={continueAfterVerdict}
            className={`shrink-0 border px-6 py-2 text-[10px] uppercase tracking-[0.2em] transition ${
              isCorrect
                ? "border-amber-500/60 text-amber-400 hover:bg-amber-500/10"
                : "border-rose-500/40 text-rose-400/70 hover:border-rose-400 hover:text-rose-300"
            }`}
          >
            {isCorrect ? "Next Problem" : "Try Again"}
          </button>
        </div>
      )}
    </div>
  );
}
