import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type CardAccent = "violet" | "amber" | "emerald" | "sky" | "slate";
type CardPattern = "hexagon" | "meteor" | "wave" | "shiny";

const accentStyles: Record<CardAccent, { glow: string; border: string; wash: string; tint: string }> = {
  violet: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(108,92,231,0.25),transparent_60%)]",
    border: "border-[#C4B5FD]",
    wash: "from-[#FAF8FF] via-[#F0EAFF] to-[#E4DAFC]",
    tint: "bg-[#6C5CE7]/[0.08]",
  },
  amber: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.20),transparent_60%)]",
    border: "border-[#D0C5FA]",
    wash: "from-[#FBF9FF] via-[#F3EEFF] to-[#E9E0FC]",
    tint: "bg-[#8B5CF6]/[0.06]",
  },
  emerald: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(108,92,231,0.18),transparent_60%)]",
    border: "border-[#D4CAFC]",
    wash: "from-[#FBFAFF] via-[#F4F0FF] to-[#ECE5FD]",
    tint: "bg-[#6C5CE7]/[0.05]",
  },
  sky: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_60%)]",
    border: "border-[#D6CDFA]",
    wash: "from-[#FCFAFF] via-[#F5F1FF] to-[#EDE7FC]",
    tint: "bg-[#8B5CF6]/[0.04]",
  },
  slate: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(108,92,231,0.12),transparent_60%)]",
    border: "border-[#DEDCE6]",
    wash: "from-[#FCFBFF] via-[#F7F5FC] to-[#F0EDF6]",
    tint: "bg-[#6C5CE7]/[0.03]",
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
        "group relative overflow-hidden rounded-[28px] border bg-white/95 shadow-[0_24px_60px_-34px_rgba(26,22,19,0.38)]",
        palette.border,
        className,
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", palette.wash)} />
      <div className={cn("absolute inset-0", palette.glow)} />
      <div className={cn("absolute inset-0", palette.tint)} />
      <div className="absolute inset-x-0 top-0 h-px bg-white/90" />

      <div className="pointer-events-none absolute inset-0 opacity-[0.32] mix-blend-multiply">
        <Image
          src={patternSrc[pattern]}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center contrast-125"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.38] mix-blend-soft-light">
        <Image
          src={patternSrc[secondaryPattern]}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-right-top scale-110 contrast-150"
        />
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-gradient-to-l from-white/12 via-white/4 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}
