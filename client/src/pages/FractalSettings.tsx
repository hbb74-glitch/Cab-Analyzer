import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Speaker, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check,
  Settings,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  FRACTAL_SPEAKER_SETTINGS, 
  GROSSMAN_CAB_NOTES, 
  FRACTAL_SETTINGS_INTRO,
  type FractalSpeakerSettings 
} from "@shared/knowledge/fractal-settings";

const CONFIDENCE_COLORS = {
  exact: "bg-green-500/20 text-green-400 border-green-500/30",
  high: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
};

const CONFIDENCE_LABELS = {
  exact: "Exact Match",
  high: "High Confidence (95%+)",
  moderate: "Best Available (~85%)"
};

export default function FractalSettings() {
  const [copied, setCopied] = useState(false);
  const [expandedSpeaker, setExpandedSpeaker] = useState<string | null>(null);

  const copyAllSettings = () => {
    const lines = FRACTAL_SPEAKER_SETTINGS.map((s, i) => {
      return `${i + 1}. ${s.speakerLabel}
   Impedance Curve: ${s.impedanceCurve.fractalCurve}
   Cab Resonance: ${s.cabResonance.value}
   Speaker Drive: ${s.speakerDrive || "5.0 (default)"}
   Speaker Thump: ${s.speakerThump || "5.0 (default)"}`;
    }).join("\n\n");
    
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySingleSetting = (setting: FractalSpeakerSettings) => {
    const text = `${setting.speakerLabel}
Impedance Curve: ${setting.impedanceCurve.fractalCurve}
Cab Resonance: ${setting.cabResonance.value}
Speaker Drive: ${setting.speakerDrive || "5.0 (default)"}
Speaker Thump: ${setting.speakerThump || "5.0 (default)"}
${setting.impedanceCurve.alternates ? `Alternates: ${setting.impedanceCurve.alternates.join(", ")}` : ""}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            Fractal Audio Settings
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Speaker impedance curves and cab resonance settings for your Axe-Fx III, FM9, FM3, or AM4.
            Optimized for Grossman iso cab use.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-1 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <span className="text-foreground font-medium">Speaker Impedance Curves</span> model the electrical interaction between the power amp and speaker. 
                They affect tone and feel but are NOT an EQ - they work with your IRs, not instead of them.
              </p>
              <p>
                These settings are specifically tuned for use with a <span className="text-foreground font-medium">Grossman iso cab</span> (closed-back, deep enclosure design).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Speaker Settings Reference
          </h2>
          <button
            onClick={copyAllSettings}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all"
            data-testid="button-copy-all-fractal"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy All"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className={cn("px-2 py-1 rounded border", CONFIDENCE_COLORS.exact)}>
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            Exact Match
          </span>
          <span className={cn("px-2 py-1 rounded border", CONFIDENCE_COLORS.high)}>
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            High Confidence (95%+)
          </span>
          <span className={cn("px-2 py-1 rounded border", CONFIDENCE_COLORS.moderate)}>
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Best Available (~85%)
          </span>
        </div>

        <div className="space-y-4">
          {FRACTAL_SPEAKER_SETTINGS.map((setting, i) => (
            <motion.div
              key={setting.speaker}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-xl overflow-hidden"
              data-testid={`card-fractal-speaker-${setting.speaker}`}
            >
              <button
                onClick={() => setExpandedSpeaker(expandedSpeaker === setting.speaker ? null : setting.speaker)}
                className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-all"
                data-testid={`button-expand-${setting.speaker}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20">
                    <Speaker className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary">{setting.speakerLabel}</span>
                  </div>
                  <span className={cn("px-2 py-1 rounded text-xs border", CONFIDENCE_COLORS[setting.impedanceCurve.confidence])}>
                    {CONFIDENCE_LABELS[setting.impedanceCurve.confidence]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-foreground">{setting.impedanceCurve.fractalCurve}</div>
                    <div className="text-xs text-muted-foreground">Cab Res: {setting.cabResonance.value}</div>
                  </div>
                  <Zap className={cn(
                    "w-5 h-5 transition-transform",
                    expandedSpeaker === setting.speaker ? "rotate-90 text-primary" : "text-muted-foreground"
                  )} />
                </div>
              </button>

              <AnimatePresence>
                {expandedSpeaker === setting.speaker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/10"
                  >
                    <div className="p-5 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Zap className="w-4 h-4 text-secondary" />
                            Impedance Curve Settings
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Primary Curve:</span>
                              <span className="font-mono text-foreground">{setting.impedanceCurve.fractalCurve}</span>
                            </div>
                            {setting.impedanceCurve.alternates && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Alternates:</span>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {setting.impedanceCurve.alternates.join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            {setting.impedanceCurve.notes}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Settings className="w-4 h-4 text-secondary" />
                            SPKR Tab Settings
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cab Resonance:</span>
                              <span className="font-mono text-foreground">{setting.cabResonance.value}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Speaker Drive:</span>
                              <span className="font-mono text-foreground">{setting.speakerDrive || "5.0"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Speaker Thump:</span>
                              <span className="font-mono text-foreground">{setting.speakerThump || "5.0"}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            {setting.cabResonance.notes}
                          </p>
                        </div>
                      </div>

                      {setting.additionalNotes && (
                        <div className="pt-3 border-t border-white/10">
                          <p className="text-xs text-muted-foreground flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            {setting.additionalNotes}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => copySingleSetting(setting)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                          data-testid={`button-copy-${setting.speaker}`}
                        >
                          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          {copied ? "Copied!" : "Copy Settings"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-secondary" />
            Grossman Iso Cab Notes
          </h3>
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                The Grossman iso cab is a <span className="text-foreground font-medium">closed-back</span> design with deeper internal dimensions than a typical guitar cabinet. This affects the impedance curve interaction:
              </p>
              
              <div className="space-y-2">
                <h4 className="text-foreground font-medium">Key Characteristics:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="text-foreground">Closed-back design</span> - Use closed-back impedance curves (not open-back like Deluxe Reverb)</li>
                  <li><span className="text-foreground">Deeper enclosure</span> - More low-end extension than typical 1x12 or 2x12 cabs</li>
                  <li><span className="text-foreground">Single speaker</span> - Use 1x12 curves when available (not 4x12)</li>
                  <li><span className="text-foreground">Acoustic isolation</span> - No room interaction, so cab resonance modeling matters more</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-foreground font-medium">General Recommendations:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="text-foreground">Cab Resonance:</span> Start at 5.5-6.5 (higher than default) to capture extended low-end</li>
                  <li><span className="text-foreground">Speaker Thump:</span> 5.0-6.0 depending on speaker (alnico speakers benefit from more)</li>
                  <li><span className="text-foreground">Speaker Drive:</span> Match to speaker power handling (lower wattage = more drive)</li>
                  <li><span className="text-foreground">LF Resonance:</span> May need slight boost (+0.5-1.0) for the deeper enclosure</li>
                </ul>
              </div>

              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <h4 className="text-foreground font-medium mb-2">When in Doubt:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Start with the recommended 1x12 curve for your speaker</li>
                  <li>If tone is too tight/thin, try a 2x12 curve variant</li>
                  <li>If tone is too boomy, reduce Cab Resonance and Speaker Thump</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
