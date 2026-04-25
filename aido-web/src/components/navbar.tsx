"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/proposals", label: "Proposals" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#E2DFD9] bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/aido.png"
              alt="AIDO Logo"
              width={24}
              height={24}
            />
            <span className="text-lg font-extrabold tracking-tight text-[#1A1613]">
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
                      : "text-[#8C8680] hover:text-[#1A1613] hover:bg-[#F0EEEB]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center">
          <appkit-button />
        </div>
      </div>
    </nav>
  );
}
