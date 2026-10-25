import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import IrisMark from "@/app/components/brand/IrisMark";

export default function HubHeader({ step, backHref, wide = false }: { step: 1 | 2; backHref: string; wide?: boolean }) {
  return (
    <nav className={`mx-auto flex w-full items-center justify-between py-6 ${wide ? "max-w-[1800px] px-6 sm:px-8 lg:px-12" : "max-w-6xl px-6"}`}>
      <Link href="/" className="font-display flex items-center gap-2 text-2xl font-semibold text-ink">
        <IrisMark size={30} className="text-ink" />
        Iris
      </Link>

      <div className="flex items-center gap-3 text-sm font-bold text-ink-soft">
        <span className="hidden sm:inline">Step {step} of 2</span>
        <span className="flex gap-1.5" aria-label={`Step ${step} of 2`}>
          <span className="h-2 w-8 rounded-full bg-iris-500" />
          <span className={`h-2 w-8 rounded-full ${step === 2 ? "bg-iris-500" : "bg-ink/10"}`} />
        </span>
      </div>

      <Link href={backHref} className="iris-btn iris-btn-soft px-4 py-2 text-sm">
        <FiArrowLeft /> Back
      </Link>
    </nav>
  );
}
