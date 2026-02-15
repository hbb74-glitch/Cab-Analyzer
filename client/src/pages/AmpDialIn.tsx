import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Lightbulb,
  Star,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  Music,
  Headphones,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FRACTAL_AMP_MODELS } from "@shared/knowledge/amp-designer";
import {
  getDialInPresets,
  type DialInPreset,
  type DialInSettings,
  type AmpControlLayout,
} from "@shared/knowledge/amp-dial-in";

interface AIDialInResult {
  modelName: string;
  basedOn: string;
  settings: DialInSettings;
  controlLayout: AmpControlLayout;
  expertTips: { parameter: string; suggestion: string; why: string }[];
  tips: string[];
  whatToListenFor: string[];
  famousUsers: string;
  styleNotes: string;
  quickTweak: string;
}

function KnobIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <line x1="12" y1="8.5" x2="12" y2="4" />
      <line x1="7.5" y1="16" x2="5" y2="18" />
      <line x1="16.5" y1="16" x2="19" y2="18" />
    </svg>
  );
}

function AmpKnob({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const percentage = value / max;
  const startAngle = -135;
  const endAngle = 135;
  const angle = startAngle + percentage * (endAngle - startAngle);

  const tickCount = 11;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const tickAngle = startAngle + (i / (tickCount - 1)) * (endAngle - startAngle);
    const radians = (tickAngle * Math.PI) / 180;
    const innerR = 38;
    const outerR = 43;
    return {
      x1: 50 + innerR * Math.sin(radians),
      y1: 50 - innerR * Math.cos(radians),
      x2: 50 + outerR * Math.sin(radians),
      y2: 50 - outerR * Math.cos(radians),
      active: i <= Math.round(percentage * (tickCount - 1)),
    };
  });

  const pointerRadians = (angle * Math.PI) / 180;
  const pointerInner = 8;
  const pointerOuter = 28;

  return (
    <div className="flex flex-col items-center gap-1" data-testid={`knob-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <svg viewBox="0 0 100 100" className="w-20 h-20 sm:w-24 sm:h-24">
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
            strokeWidth={i === Math.round(percentage * (tickCount - 1)) ? 2 : 1}
            strokeLinecap="round"
          />
        ))}

        <circle
          cx="50"
          cy="50"
          r="30"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />

        <circle
          cx="50"
          cy="50"
          r="26"
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.1)"
          strokeWidth="1"
        />

        <line
          x1={50 + pointerInner * Math.sin(pointerRadians)}
          y1={50 - pointerInner * Math.cos(pointerRadians)}
          x2={50 + pointerOuter * Math.sin(pointerRadians)}
          y2={50 - pointerOuter * Math.cos(pointerRadians)}
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <circle
          cx="50"
          cy="50"
          r="4"
          fill="hsl(var(--primary) / 0.2)"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
        />

        <text
          x="50"
          y="90"
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="9"
          fontFamily="monospace"
        >
          {value.toFixed(1)}
        </text>
      </svg>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function ToggleIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1" data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className={cn(
        "w-4 h-4 rounded-full border-2 transition-colors",
        active
          ? "bg-primary border-primary shadow-[0_0_8px_rgba(34,197,94,0.5)]"
          : "bg-transparent border-muted-foreground/30"
      )} />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function MultiSwitchIndicator({ label, value, options }: { label: string; value: string; options: string[] }) {
  return (
    <div className="flex flex-col items-center gap-1" data-testid={`switch-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-1 rounded-md border border-border overflow-hidden">
        {options.map((opt) => (
          <div
            key={opt}
            className={cn(
              "px-2 py-1 text-xs font-mono transition-colors",
              opt === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            {opt}
          </div>
        ))}
      </div>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function GraphicEQDisplay({ settings }: { settings: DialInSettings }) {
  const bands = [
    { id: "eq80", label: "80", freq: "80Hz" },
    { id: "eq240", label: "240", freq: "240Hz" },
    { id: "eq750", label: "750", freq: "750Hz" },
    { id: "eq2200", label: "2.2k", freq: "2.2kHz" },
    { id: "eq6600", label: "6.6k", freq: "6.6kHz" },
  ];

  const hasBands = bands.some(b => settings[b.id] !== undefined);
  if (!hasBands) return null;

  return (
    <div className="space-y-2" data-testid="graphic-eq-display">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graphic EQ</span>
        <Badge variant="outline" className="text-xs">5-Band</Badge>
      </div>
      <div className="flex items-end justify-center gap-3 sm:gap-4 py-2">
        {bands.map((band) => {
          const val = (settings[band.id] as number) ?? 5;
          const percentage = val / 10;
          return (
            <div key={band.id} className="flex flex-col items-center gap-1">
              <div className="relative w-4 h-24 sm:h-28 bg-muted/30 rounded-full border border-border overflow-hidden">
                <div
                  className="absolute bottom-0 w-full rounded-full transition-all"
                  style={{
                    height: `${percentage * 100}%`,
                    background: `linear-gradient(to top, hsl(var(--primary) / 0.4), hsl(var(--primary)))`,
                  }}
                />
                <div
                  className="absolute w-full flex items-center justify-center"
                  style={{ bottom: `${percentage * 100 - 4}%` }}
                >
                  <div className="w-6 h-2 rounded-full bg-primary border border-primary-foreground/20 shadow-sm" />
                </div>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{val.toFixed(0)}</span>
              <span className="text-[10px] text-muted-foreground/70">{band.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DynamicControlDisplay({ settings, controlLayout }: { settings: DialInSettings; controlLayout: AmpControlLayout }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap py-4">
        {controlLayout.knobs.map((knob) => {
          const val = settings[knob.id];
          const numVal = typeof val === 'number' ? val : 5;
          return <AmpKnob key={knob.id} label={knob.label} value={numVal} max={knob.max || 10} />;
        })}
      </div>

      {controlLayout.switches.length > 0 && (
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {controlLayout.switches.map((sw) => {
            const val = settings[sw.id];
            if (sw.type === "toggle") {
              return <ToggleIndicator key={sw.id} label={sw.label} active={val === true} />;
            }
            if (sw.type === "multi" && sw.options) {
              return (
                <MultiSwitchIndicator
                  key={sw.id}
                  label={sw.label}
                  value={(val as string) || sw.options[0]}
                  options={sw.options}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      {controlLayout.graphicEQ && (
        <GraphicEQDisplay settings={settings} />
      )}
    </div>
  );
}

function PresetDisplay({ preset, controlLayout, isAI }: { preset: DialInPreset | null; controlLayout: AmpControlLayout; isAI?: boolean }) {
  if (!preset) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="font-mono text-xs">
          {preset.style}
        </Badge>
        {isAI && (
          <Badge variant="outline" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" />
            AI Generated
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{preset.source}</span>
      </div>

      <DynamicControlDisplay settings={preset.settings} controlLayout={controlLayout} />
    </motion.div>
  );
}

function AIResultDisplay({ result }: { result: AIDialInResult }) {
  const [showExpert, setShowExpert] = useState(false);

  const asPreset: DialInPreset = {
    id: "ai-result",
    style: result.styleNotes ? "AI Recommended" : "AI Starting Point",
    settings: result.settings,
    tips: result.tips,
    whatToListenFor: result.whatToListenFor,
    source: "AI-generated from Fractal Wiki / Yek's Guide / Forum"
  };

  return (
    <div className="space-y-6">
      <PresetDisplay preset={asPreset} controlLayout={result.controlLayout} isAI />

      {result.famousUsers && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{result.famousUsers}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result.quickTweak && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CircleDot className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Key Tweak</p>
                <p className="text-sm">{result.quickTweak}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result.tips && result.tips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {result.tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {result.whatToListenFor && result.whatToListenFor.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Headphones className="w-4 h-4 text-blue-400" />
              What to Listen For
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {result.whatToListenFor.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-blue-400 mt-1 flex-shrink-0">
                    <Headphones className="w-3 h-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {result.expertTips && result.expertTips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              onClick={() => setShowExpert(!showExpert)}
              className="flex items-center gap-2 w-full text-left"
              data-testid="button-toggle-expert"
            >
              <CardTitle className="text-sm flex items-center gap-2">
                {showExpert ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Expert Parameter Tips
              </CardTitle>
            </button>
          </CardHeader>
          <AnimatePresence>
            {showExpert && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0 space-y-3">
                  {result.expertTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                        {tip.parameter}
                      </Badge>
                      <div>
                        <p className="font-medium">{tip.suggestion}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{tip.why}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}
    </div>
  );
}

export default function AmpDialIn() {
  const { toast } = useToast();
  const [selectedModelId, setSelectedModelId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [aiResult, setAiResult] = useState<AIDialInResult | null>(null);
  const [showAI, setShowAI] = useState(false);

  const selectedModel = FRACTAL_AMP_MODELS.find((m) => m.id === selectedModelId);

  const filteredModels = useMemo(() => {
    if (!searchQuery) return FRACTAL_AMP_MODELS;
    const q = searchQuery.toLowerCase();
    return FRACTAL_AMP_MODELS.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.basedOn.toLowerCase().includes(q) ||
        m.characteristics.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const staticPresets = useMemo(() => {
    if (!selectedModelId) return null;
    return getDialInPresets(selectedModelId, FRACTAL_AMP_MODELS);
  }, [selectedModelId]);

  const currentPreset = staticPresets?.presets[selectedPresetIdx] || null;

  const aiMutation = useMutation({
    mutationFn: async (data: { modelId: string; style?: string }) => {
      const res = await apiRequest("POST", "/api/amp-dial-in", data);
      return res.json() as Promise<AIDialInResult>;
    },
    onSuccess: (data) => {
      setAiResult(data);
      setShowAI(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate AI dial-in advice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    setSelectedPresetIdx(0);
    setAiResult(null);
    setShowAI(false);
  };

  const handleAIGenerate = () => {
    if (!selectedModel) return;
    aiMutation.mutate({
      modelId: selectedModel.id,
      style: customStyle || undefined,
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/50">
              <KnobIcon className="w-6 h-6 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Amp <span className="text-orange-400">Dial-In</span>
            </h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Amp-accurate starting settings for every Fractal Audio model. Real controls, real layouts.
          </p>
        </motion.div>

        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Music className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Select Amp Model</span>
              <Badge variant="secondary" className="ml-auto text-xs font-mono">
                {FRACTAL_AMP_MODELS.length} models
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, real amp, or tone description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-model"
              />
            </div>

            <Select value={selectedModelId} onValueChange={handleModelSelect}>
              <SelectTrigger data-testid="select-dial-in-model">
                <SelectValue placeholder="Choose an amp model..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <span className="font-mono text-xs">{model.label}</span>
                    <span className="text-muted-foreground text-xs ml-2 hidden sm:inline">
                      ({model.basedOn.split(",")[0]})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedModel && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3"
              >
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-foreground">{selectedModel.label}</span>
                  <span className="mx-1">—</span>
                  <span>{selectedModel.basedOn}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {selectedModel && staticPresets && (
            <motion.div
              key={selectedModelId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <KnobIcon className="w-5 h-5 text-orange-400" />
                      Starting Settings
                    </CardTitle>
                    {staticPresets.source === "family" && staticPresets.familyName && (
                      <Badge variant="outline" className="text-xs">
                        {staticPresets.familyName} family
                      </Badge>
                    )}
                    {staticPresets.source === "model" && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Star className="w-3 h-3" />
                        Model-specific
                      </Badge>
                    )}
                    {staticPresets.source === "generic" && (
                      <Badge variant="outline" className="text-xs">
                        General guide
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {staticPresets.presets.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {staticPresets.presets.map((p, idx) => (
                        <Button
                          key={p.id}
                          variant={idx === selectedPresetIdx ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setSelectedPresetIdx(idx); setShowAI(false); }}
                          data-testid={`button-preset-${idx}`}
                        >
                          {p.style}
                        </Button>
                      ))}
                    </div>
                  )}

                  {!showAI && currentPreset && (
                    <>
                      <PresetDisplay preset={currentPreset} controlLayout={staticPresets.controlLayout} />

                      {currentPreset.tips.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Lightbulb className="w-4 h-4 text-yellow-500" />
                              Tips
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <ul className="space-y-2">
                              {currentPreset.tips.map((tip, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {currentPreset.whatToListenFor.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Headphones className="w-4 h-4 text-blue-400" />
                              What to Listen For
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <ul className="space-y-2">
                              {currentPreset.whatToListenFor.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-blue-400 mt-1 flex-shrink-0">
                                    <Headphones className="w-3 h-3" />
                                  </span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}

                  {showAI && aiResult && (
                    <AIResultDisplay result={aiResult} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium">AI Dial-In Advisor</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get personalized settings based on Fractal Wiki, Yek's Guide, and forum knowledge. Optionally describe your target tone.
                  </p>
                  <Input
                    placeholder="e.g., 80s thrash rhythm, blues lead, worship clean, djent..."
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    data-testid="input-custom-style"
                  />
                  <Button
                    onClick={handleAIGenerate}
                    disabled={aiMutation.isPending}
                    className="w-full"
                    data-testid="button-ai-dial-in"
                  >
                    {aiMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating settings...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Settings for {selectedModel.label}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedModel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <KnobIcon className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Select an amp model above to see recommended starting settings
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
