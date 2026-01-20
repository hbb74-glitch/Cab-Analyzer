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
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  FRACTAL_SPEAKER_SETTINGS, 
  AM4_SPKR_DEFAULTS,
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSpeaker, setExpandedSpeaker] = useState<string | null>(null);

  const copyAllSettings = () => {
    const lines = FRACTAL_SPEAKER_SETTINGS.map((s, i) => {
      return `${i + 1}. ${s.speakerLabel}
   Impedance Curve: ${s.impedanceCurve.fractalCurve}
   LF Reso Freq: ${s.spkrSettings.lfResonanceFreq} Hz
   LF Resonance: ${s.spkrSettings.lfResonance}
   HF Reso Freq: ${s.spkrSettings.hfResonanceFreq} Hz
   Speaker Thump: ${s.spkrSettings.speakerThump}
   Speaker Drive: ${s.spkrSettings.speakerDrive}
   Speaker Compression: ${s.spkrSettings.speakerCompression}`;
    }).join("\n\n");
    
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySingleSetting = (setting: FractalSpeakerSettings) => {
    const text = `${setting.speakerLabel}
Impedance Curve: ${setting.impedanceCurve.fractalCurve}
LF Reso Freq: ${setting.spkrSettings.lfResonanceFreq} Hz
LF Resonance: ${setting.spkrSettings.lfResonance}
HF Reso Freq: ${setting.spkrSettings.hfResonanceFreq} Hz
Speaker Thump: ${setting.spkrSettings.speakerThump}
Speaker Drive: ${setting.spkrSettings.speakerDrive}
Speaker Compression: ${setting.spkrSettings.speakerCompression}
${setting.impedanceCurve.alternates ? `Alternates: ${setting.impedanceCurve.alternates.join(", ")}` : ""}`;
    
    navigator.clipboard.writeText(text);
    setCopiedId(setting.speaker);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2">
            AM4 Settings
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Speaker impedance curves and SPKR page settings for your Fractal Audio AM4.
            Match the curve to the speaker used to capture your IRs.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-1 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <span className="text-foreground font-medium">Speaker Impedance Curves</span> model the electrical interaction between the power amp and speaker. 
                They affect tone AND feel - they're NOT an EQ and work with your IRs, not instead of them.
              </p>
              <p>
                <span className="text-foreground font-medium">Match the curve to your IR's speaker</span> (V30, Cream, etc.), not your playback system.
                Studio monitors and headphones are transparent - they reproduce whatever you send them.
                The curve adds the dynamics and "push back" feel that the IR alone can't capture.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-secondary" />
            AM4 SPKR Page Parameters
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Resonance Parameters</h4>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>LF Reso Freq</span>
                  <span className="font-mono text-foreground">{AM4_SPKR_DEFAULTS.lfResonanceFreq} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span>LF Resonance</span>
                  <span className="font-mono text-foreground">{AM4_SPKR_DEFAULTS.lfResonance}</span>
                </div>
                <div className="flex justify-between">
                  <span>HF Reso Freq</span>
                  <span className="font-mono text-foreground">{AM4_SPKR_DEFAULTS.hfResonanceFreq} Hz</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Speaker Modeling</h4>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Speaker Thump</span>
                  <span className="font-mono text-foreground">{AM4_SPKR_DEFAULTS.speakerThump}</span>
                </div>
                <div className="flex justify-between">
                  <span>Speaker Drive</span>
                  <span className="font-mono text-foreground">{AM4_SPKR_DEFAULTS.speakerDrive}</span>
                </div>
                <div className="flex justify-between">
                  <span>Speaker Compression</span>
                  <span className="font-mono text-foreground">{AM4_SPKR_DEFAULTS.speakerCompression}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic pt-2 border-t border-white/10">
            These are the AM4 defaults. The speaker-specific settings below are optimized for the Grossman iso cab.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Speaker className="w-5 h-5 text-primary" />
            Speaker-Specific Settings
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
                <div className="flex items-center gap-4 flex-wrap">
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
                    <div className="text-xs text-muted-foreground">Thump: {setting.spkrSettings.speakerThump} | Drive: {setting.spkrSettings.speakerDrive}</div>
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 transition-transform",
                    expandedSpeaker === setting.speaker ? "rotate-180 text-primary" : "text-muted-foreground"
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
                            Impedance Curve
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Primary Curve:</span>
                              <span className="font-mono text-foreground">{setting.impedanceCurve.fractalCurve}</span>
                            </div>
                            {setting.impedanceCurve.alternates && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Alternates:</span>
                                <span className="font-mono text-xs text-muted-foreground text-right max-w-[200px]">
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
                            SPKR Page Settings
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">LF Reso Freq:</span>
                              <span className="font-mono text-foreground">{setting.spkrSettings.lfResonanceFreq} Hz</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">LF Resonance:</span>
                              <span className="font-mono text-foreground">{setting.spkrSettings.lfResonance}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">HF Reso Freq:</span>
                              <span className="font-mono text-foreground">{setting.spkrSettings.hfResonanceFreq} Hz</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Speaker Thump:</span>
                              <span className="font-mono text-foreground">{setting.spkrSettings.speakerThump}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Speaker Drive:</span>
                              <span className="font-mono text-foreground">{setting.spkrSettings.speakerDrive}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Speaker Compression:</span>
                              <span className="font-mono text-foreground">{setting.spkrSettings.speakerCompression}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10">
                        <p className="text-xs text-muted-foreground flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          {setting.notes}
                        </p>
                      </div>

                      {setting.additionalNotes && (
                        <p className="text-xs text-muted-foreground/70 italic pl-6">
                          {setting.additionalNotes}
                        </p>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => copySingleSetting(setting)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
                          data-testid={`button-copy-${setting.speaker}`}
                        >
                          {copiedId === setting.speaker ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          {copiedId === setting.speaker ? "Copied!" : "Copy Settings"}
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
                The Grossman iso cab is a <span className="text-foreground font-medium">closed-back</span> design with deeper internal dimensions than a typical guitar cabinet. This affects the speaker impedance curve interaction:
              </p>
              
              <div className="space-y-2">
                <h4 className="text-foreground font-medium">Key Characteristics:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="text-foreground">Closed-back design</span> - Use closed-back impedance curves (not open-back)</li>
                  <li><span className="text-foreground">Deeper enclosure</span> - More low-end extension than typical 1x12 or 2x12 cabs</li>
                  <li><span className="text-foreground">Single speaker</span> - Use 1x12 curves when available (not 4x12)</li>
                  <li><span className="text-foreground">Acoustic isolation</span> - No room interaction, so speaker modeling matters more</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-foreground font-medium">Grossman-Specific Adjustments:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="text-foreground">LF Reso Freq:</span> May need +5-10 Hz higher to compensate for extended bass</li>
                  <li><span className="text-foreground">Speaker Thump:</span> 1.3-1.5 range captures the deeper cabinet's punch</li>
                  <li><span className="text-foreground">LF Resonance:</span> Slight boost (1.1-1.3) for the extended low-end</li>
                </ul>
              </div>

              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <h4 className="text-foreground font-medium mb-2">When in Doubt:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Start with the recommended settings for your speaker</li>
                  <li>If tone is too boomy, reduce LF Resonance and Speaker Thump</li>
                  <li>If tone is too thin, increase LF Resonance and Speaker Thump</li>
                  <li>Trust your ears - impedance curves affect feel as much as tone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
