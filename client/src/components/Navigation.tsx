import { Link, useLocation } from "wouter";
import { Mic2, Activity, BarChart3, Radio, Lightbulb, Layers, Zap, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Analyzer", icon: Activity },
    { href: "/pairing", label: "Pairing", icon: Layers },
    { href: "/recommendations", label: "Suggestions", icon: Lightbulb },
    { href: "/miking-guide", label: "Miking", icon: BookOpen },
    { href: "/fractal", label: "AM4", icon: Zap },
    { href: "/history", label: "History", icon: BarChart3 },
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
              IR<span className="text-primary">.Scope</span>
            </span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_-5px_rgba(34,197,94,0.4)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                    data-testid={`link-nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
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
