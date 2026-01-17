import { useHistory } from "@/hooks/use-analyses";
import { format } from "date-fns";
import { Loader2, Calendar, Mic2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function History() {
  const { data: analyses, isLoading, error } = useHistory();

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center text-destructive">
        <AlertCircle className="w-6 h-6 mr-2" /> Failed to load history
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analysis History</h1>
          <span className="text-sm text-muted-foreground font-mono">
            {analyses?.length || 0} RECORDS
          </span>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">File</th>
                  <th className="p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Setup</th>
                  <th className="p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">Metrics</th>
                  <th className="p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground text-center">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analyses?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No analyses found yet. Go analyze some IRs!
                    </td>
                  </tr>
                ) : (
                  analyses?.map((item) => (
                    <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center text-muted-foreground text-sm font-mono">
                          <Calendar className="w-3.5 h-3.5 mr-2 opacity-50" />
                          {format(new Date(item.createdAt || ""), "MMM d, yyyy")}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-foreground">{item.filename}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Mic2 className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                            <span className="capitalize">{item.micType}</span>
                            <span className="mx-1.5 opacity-30">|</span>
                            <span className="capitalize">{item.micPosition}</span>
                          </div>
                          <span className="text-xs text-muted-foreground/60 pl-5">
                            {item.distance}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-sm">
                        <div className="flex flex-col gap-1">
                          <span className={item.peakAmplitudeDb > -0.5 ? "text-destructive" : "text-muted-foreground"}>
                            {item.peakAmplitudeDb} dB
                          </span>
                          <span className="text-muted-foreground/60 text-xs">
                            {item.durationMs}ms
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          {item.isPerfect ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {item.qualityScore}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-muted-foreground border border-white/10">
                              {item.qualityScore}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
