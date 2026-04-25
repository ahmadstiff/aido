"use client";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">AIDO</span>
        </div>
        <div className="flex items-center gap-4">
          <appkit-button />
        </div>
      </div>
    </nav>
  );
}
