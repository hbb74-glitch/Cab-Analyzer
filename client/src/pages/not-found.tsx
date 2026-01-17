import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="glass-panel p-12 rounded-2xl text-center space-y-6 max-w-md mx-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4 border border-destructive/20">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-muted-foreground">
          The signal you are looking for has been lost in the mix.
        </p>

        <Link href="/">
          <button className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            Return to Signal Chain
          </button>
        </Link>
      </div>
    </div>
  );
}
