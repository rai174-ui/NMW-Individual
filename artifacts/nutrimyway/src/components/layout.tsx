import { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center font-sans">
      <main className="w-full max-w-[420px] flex-1 pb-20 pt-safe relative bg-background shadow-2xl sm:border-x sm:border-border/40 overflow-x-hidden">
        {children}
      </main>
      <div className="w-full text-center py-2 text-[10px] text-muted-foreground/60 flex flex-col items-center gap-1">
        <span>Powered by Nutrition My Way</span>
      </div>
      <BottomNav />
    </div>
  );
}
