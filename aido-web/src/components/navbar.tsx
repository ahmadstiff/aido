"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/daos", label: "DAOs" },
    { href: "/proposals", label: "Proposals" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#2D2842] bg-[#161229]/90 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/aido.png"
              alt="AIDO Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-lg font-extrabold tracking-tight text-[#EEEDF6]">
              AIDO
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-0.5">
            {links.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all ${
                    isActive
                      ? "bg-[#6C5CE7]/10 text-[#6C5CE7]"
                      : "text-[#A8A3BC] hover:text-[#EEEDF6] hover:bg-[#251D3F]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {health ? (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#1F1933] px-2.5 py-1 text-[10px]">
              <span className={`h-1.5 w-1.5 rounded-full ${health.ok ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="text-[#A8A3BC]">
                {health.ok ? "Backend" : "Offline"}
              </span>
              {health.liveAiConfigured && (
                <span className="text-emerald-300">· AI</span>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#1F1933] px-2.5 py-1 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A8A3BC]/40" />
              <span className="text-[#A8A3BC]">No Backend</span>
            </div>
          )}
          <appkit-button />
        </div>
      </div>
    </nav>
  );
}
