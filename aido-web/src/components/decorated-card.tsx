import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type CardAccent = "violet" | "amber" | "emerald" | "sky" | "slate";
type CardPattern = "hexagon" | "meteor" | "wave" | "shiny";

const accentStyles: Record<CardAccent, { glow: string; border: string; wash: string; tint: string }> = {
  violet: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(108,92,231,0.15),transparent_60%)]",
    border: "border-[#D8D2F5]",
    wash: "from-[#FFFDFC] via-[#FBF9FF] to-[#F3EFFD]",
    tint: "bg-[#6C5CE7]/[0.06]",
  },
  amber: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.12),transparent_60%)]",
    border: "border-[#EBE0CF]",
    wash: "from-[#FFFDFC] via-[#FFFBF5] to-[#FEF3E2]",
    tint: "bg-[#D97706]/[0.04]",
  },
  emerald: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_60%)]",
    border: "border-[#D4E5D8]",
    wash: "from-[#FFFDFC] via-[#F8FCF8] to-[#ECFAEF]",
    tint: "bg-[#10B981]/[0.04]",
  },
  sky: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_60%)]",
    border: "border-[#D0E2EE]",
    wash: "from-[#FFFDFC] via-[#F7FBFE] to-[#E8F4FB]",
    tint: "bg-[#0EA5E9]/[0.04]",
  },
  slate: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(108,92,231,0.08),transparent_60%)]",
    border: "border-[#E2DFD9]",
    wash: "from-[#FFFDFC] via-[#FCFBF9] to-[#F3F0EB]",
    tint: "bg-[#6C5CE7]/[0.025]",
  },
};

const patternSrc: Record<CardPattern, string> = {
  hexagon: "/Hexagon.svg",
  meteor: "/Meteor.svg",
  wave: "/Wave%20Line.svg",
  shiny: "/Simple%20Shiny.svg",
};

export function DecoratedCard({
  children,
  className,
  contentClassName,
  accent = "slate",
  pattern = "wave",
  secondaryPattern = "shiny",
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  accent?: CardAccent;
  pattern?: CardPattern;
  secondaryPattern?: CardPattern;
}) {
  const palette = accentStyles[accent];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[28px] border bg-white/95 shadow-[0_24px_60px_-34px_rgba(26,22,19,0.38)] transition-transform duration-300 hover:-translate-y-0.5",
        palette.border,
        className,
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", palette.wash)} />
      <div className={cn("absolute inset-0", palette.glow)} />
      <div className={cn("absolute inset-0", palette.tint)} />
      <div className="absolute inset-x-0 top-0 h-px bg-white/90" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.26] mix-blend-multiply">
        <Image
          src={patternSrc[pattern]}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center grayscale contrast-125 brightness-90"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.3] mix-blend-soft-light">
        <Image
          src={patternSrc[secondaryPattern]}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-right-top scale-110 grayscale contrast-150 brightness-110"
        />
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-gradient-to-l from-white/58 via-white/12 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/45 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-white/72 to-transparent" />

      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}
