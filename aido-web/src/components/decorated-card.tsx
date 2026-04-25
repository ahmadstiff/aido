import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type CardAccent = "violet" | "amber" | "emerald" | "sky" | "slate";
type CardPattern = "hexagon" | "meteor" | "wave" | "shiny";

const accentStyles: Record<CardAccent, { glow: string; border: string; wash: string; tint: string }> = {
  violet: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(108,92,231,0.35),transparent_60%)]",
    border: "border-[#3D2F7A]",
    wash: "from-[#1A1435] via-[#1E1640] to-[#261B52]",
    tint: "bg-[#6C5CE7]/[0.12]",
  },
  amber: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.28),transparent_60%)]",
    border: "border-[#352A68]",
    wash: "from-[#191335] via-[#1C1540] to-[#231A4E]",
    tint: "bg-[#8B5CF6]/[0.08]",
  },
  emerald: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(108,92,231,0.24),transparent_60%)]",
    border: "border-[#302860]",
    wash: "from-[#181330] via-[#1B153A] to-[#201848]",
    tint: "bg-[#6C5CE7]/[0.07]",
  },
  sky: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.22),transparent_60%)]",
    border: "border-[#322A64]",
    wash: "from-[#181330] via-[#1C153C] to-[#211A4A]",
    tint: "bg-[#8B5CF6]/[0.06]",
  },
  slate: {
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(108,92,231,0.18),transparent_60%)]",
    border: "border-[#2D2842]",
    wash: "from-[#161128] via-[#191432] to-[#1D173C]",
    tint: "bg-[#6C5CE7]/[0.05]",
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
        "group relative overflow-hidden rounded-[28px] border bg-[#161229] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.6)]",
        palette.border,
        className,
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", palette.wash)} />
      <div className={cn("absolute inset-0", palette.glow)} />
      <div className={cn("absolute inset-0", palette.tint)} />
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />

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

      <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-gradient-to-l from-white/[0.03] via-transparent to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#6C5CE7]/[0.06] blur-2xl" />

      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}
