"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBossStore } from "@/app/lib/bossStore";

const displayFont = { fontFamily: "var(--font-sans)" } as const;

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
  const verdictNote = useBossStore((s) => s.verdictNote);
  const submitAnswer = useBossStore((s) => s.submitAnswer);
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
    paintBackground(ctx, question.prompt);
    configurePen(ctx);
    undoStack.current = [];
    setHasInk(false);
  }, [question.prompt]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset, question.prompt]);

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
          problem: question.prompt,
          solutionSteps: question.steps,
          answer: String(question.answer),
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
      // Free text-only graders return no marked-up image, so show the child's own drawing.
      const annotated = data.annotatedImageBase64
        ? `data:image/jpeg;base64,${data.annotatedImageBase64}`
        : dataUrl;
      setVerdict(data.verdict, data.note, annotated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Grading failed";
      setError(msg);
      setSubmitting(false);
    }
  };

  const continueAfterVerdict = () => {
    // A correct drawing lands the hit; an incorrect one just lets them try again.
    if (verdict === "correct") submitAnswer(question.answer, "whiteboard");
    close();
  };

  if (!open) return null;

  const showResultView = verdict !== null;
  const isCorrect = verdict === "correct";

  return (
    <div
      className="iris-panel pointer-events-auto absolute bottom-3 right-3 top-3 z-30 flex w-[480px] flex-col gap-3 p-5"
      style={displayFont}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-xl font-semibold text-ink">
            Whiteboard
          </div>
          <div className="mt-0.5 text-sm font-semibold capitalize text-ink-soft">
            {question.prompt}
          </div>
        </div>
        <button
          onClick={close}
          disabled={submitting}
          className="iris-btn iris-btn-soft shrink-0 px-4 py-2 text-sm"
        >
          Close
        </button>
      </div>

      {!showResultView && (
        <>
          <div className="overflow-hidden rounded-2xl bg-white ring-2 ring-iris-100">
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
                className="iris-btn iris-btn-soft shrink-0 px-4 py-2 text-sm"
              >
                Undo
              </button>
              <button
                onClick={reset}
                disabled={submitting}
                className="iris-btn iris-btn-soft shrink-0 px-4 py-2 text-sm"
              >
                Clear
              </button>
            </div>
            <button
              onClick={submit}
              disabled={submitting || !hasInk}
              className="iris-btn iris-btn-primary shrink-0 px-6 py-2 text-sm"
            >
              {submitting ? "Grading…" : "Submit"}
            </button>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">
              {error}
            </div>
          )}
        </>
      )}

      {showResultView && (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          <div className={`rounded-2xl px-4 py-3 text-[15px] font-semibold ${isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {isCorrect ? "Correct! Your attack is ready." : "Not quite yet. Check your work and try again."}
            {verdictNote && <span className="mt-0.5 block text-sm font-normal">{verdictNote}</span>}
          </div>
          <div className="overflow-hidden rounded-2xl bg-white ring-2 ring-iris-100">
            {annotatedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={annotatedImage} alt="Annotated work" className="w-full" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm font-semibold text-ink-soft">
                No annotated image returned
              </div>
            )}
          </div>

          <button
            onClick={continueAfterVerdict}
            className={`iris-btn shrink-0 px-6 py-3 text-base ${
              isCorrect
                ? "iris-btn-primary"
                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
            }`}
          >
            {isCorrect ? "Attack!" : "Try again"}
          </button>
        </div>
      )}
    </div>
  );
}
