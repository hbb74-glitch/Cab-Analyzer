import { Link, useLocation } from "wouter";
import { Activity, Radio, BookOpen, Zap, Wrench, Blend, Mic2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

function KnobNavIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="9" x2="12" y2="5" />
    </svg>
  );
}

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Analyzer", icon: Activity },
    { href: "/learner", label: "Learner", icon: Brain },
    { href: "/blend-builder", label: "Blend Builder", icon: Blend },
    { href: "/mic-shots-suggester", label: "Mic Shots Suggester", icon: Mic2 },
    { href: "/sic-tool", label: "SIC Tool", icon: Zap },
    { href: "/amp-drive-dialer", label: "Amp And Drive Dialer", icon: Wrench },
    { href: "/reference-manual", label: "Reference Manual", icon: BookOpen },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)]">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight font-mono">
              Tone<span className="text-primary"> Architect</span>
            </span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto scrollbar-hide max-w-[calc(100vw-140px)] sm:max-w-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_-5px_rgba(34,197,94,0.4)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                    data-testid={`link-nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
