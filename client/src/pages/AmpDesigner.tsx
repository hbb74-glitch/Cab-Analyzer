import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Wrench,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Music,
  CircuitBoard,
  Loader2,
  Search,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  FRACTAL_AMP_MODELS,
  FRACTAL_DRIVE_MODELS,
  KNOWN_MODS,
  getModsForModel,
} from "@shared/knowledge/amp-designer";

interface ParameterChange {
  parameter: string;
  direction: string;
  suggestedValue: string;
  rationale: string;
}

interface DesignerResult {
  modName: string;
  summary: string;
  history: string;
  parameterChanges: ParameterChange[];
  startingPoint: string;
  toneDescription: string;
  cautions: string[];
  interactionNotes: string;
  alternatives: string[];
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction.toLowerCase().includes("increase")) {
    return <ArrowUp className="w-4 h-4 text-green-400" />;
  }
  if (direction.toLowerCase().includes("decrease")) {
    return <ArrowDown className="w-4 h-4 text-orange-400" />;
  }
  return <Minus className="w-4 h-4 text-blue-400" />;
}

export default function AmpDesigner() {
  const { toast } = useToast();
  const [category, setCategory] = useState<"amp" | "drive">("amp");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedModId, setSelectedModId] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedParam, setCopiedParam] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [result, setResult] = useState<DesignerResult | null>(null);

  const models = category === "amp" ? FRACTAL_AMP_MODELS : FRACTAL_DRIVE_MODELS;
  const selectedModel = models.find((m) => m.id === selectedModelId);

  const availableMods = useMemo(() => {
    if (!selectedModelId) return [];
    const modelMods = getModsForModel(selectedModelId);
    const categoryMods = KNOWN_MODS.filter(
      (m) => m.category === category || m.category === "both"
    );
    const combined = Array.from(new Map([...modelMods, ...categoryMods].map((m) => [m.id, m] as const)).values());
    return combined;
  }, [selectedModelId, category]);

  const selectedMod = KNOWN_MODS.find((m) => m.id === selectedModId);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {
        category,
        baseModelId: selectedModelId,
        baseModelLabel: selectedModel?.label || selectedModelId,
      };
      if (selectedModId && selectedModId !== "custom") {
        body.modId = selectedModId;
        body.modLabel = selectedMod?.label || selectedModId;
      }
      if (customDescription.trim()) {
        body.customDescription = customDescription.trim();
      }
      if (additionalNotes.trim()) {
        body.additionalNotes = additionalNotes.trim();
      }
      const res = await apiRequest("POST", "/api/amp-designer", body);
      return res.json() as Promise<DesignerResult>;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Failed to generate mod parameters",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    selectedModelId &&
    (selectedModId || customDescription.trim()) &&
    !mutation.isPending;

  const handleCategoryChange = (val: string) => {
    setCategory(val as "amp" | "drive");
    setSelectedModelId("");
    setSelectedModId("");
    setCustomDescription("");
    setResult(null);
  };

  const handleModelChange = (val: string) => {
    setSelectedModelId(val);
    setSelectedModId("");
    setResult(null);
  };

  const handleModChange = (val: string) => {
    setSelectedModId(val);
    if (val !== "custom") {
      setCustomDescription("");
    }
    setResult(null);
  };

  const copyAllParameters = () => {
    if (!result) return;
    const lines = [
      `${result.modName} - ${selectedModel?.label || ""}`,
      ``,
      result.summary,
      ``,
      `Parameter Changes:`,
      ...result.parameterChanges.map(
        (p, i) =>
          `${i + 1}. ${p.parameter}: ${p.direction} to ${p.suggestedValue}\n   ${p.rationale}`
      ),
      ``,
      `Starting Point: ${result.startingPoint}`,
      ``,
      `Tone: ${result.toneDescription}`,
      ...(result.cautions.length
        ? [``, `Cautions:`, ...result.cautions.map((c) => `- ${c}`)]
        : []),
      ...(result.interactionNotes
        ? [``, `Parameter Interactions: ${result.interactionNotes}`]
        : []),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyParameterOnly = (param: ParameterChange) => {
    const text = `${param.parameter}: ${param.direction} to ${param.suggestedValue}`;
    navigator.clipboard.writeText(text);
    setCopiedParam(param.parameter);
    setTimeout(() => setCopiedParam(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1
            className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary pb-2"
            data-testid="text-amp-designer-title"
          >
            Amp Designer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Translate real-world amp and pedal circuit mods into Fractal Audio
            Axe-FX / FM3 Expert parameters.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Category
                </label>
                <Select
                  value={category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amp">
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Amp Models
                      </span>
                    </SelectItem>
                    <SelectItem value="drive">
                      <span className="flex items-center gap-2">
                        <CircuitBoard className="w-4 h-4" />
                        Drive / Fuzz Pedals
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Base Model
                </label>
                <Select
                  value={selectedModelId}
                  onValueChange={handleModelChange}
                >
                  <SelectTrigger data-testid="select-model">
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedModel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-foreground">
                    {selectedModel.basedOn}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}&mdash; {selectedModel.characteristics}
                  </span>
                </div>
              </motion.div>
            )}

            {selectedModelId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Modification
                  </label>
                  <Select
                    value={selectedModId}
                    onValueChange={handleModChange}
                  >
                    <SelectTrigger data-testid="select-mod">
                      <SelectValue placeholder="Select a known mod or choose custom..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        <span className="flex items-center gap-2">
                          <Wrench className="w-4 h-4" />
                          Custom Mod Description
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedMod && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 rounded-lg bg-muted/50 border border-border space-y-2"
                  >
                    <p className="text-sm text-foreground font-medium">
                      {selectedMod.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedMod.description}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetails(!showDetails)}
                      data-testid="button-toggle-circuit-details"
                    >
                      {showDetails ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <span className="text-xs">Circuit details</span>
                    </Button>
                    <AnimatePresence>
                      {showDetails && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-muted-foreground/80 italic"
                        >
                          {selectedMod.circuitChanges}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {(selectedModId === "custom" || !selectedModId) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {selectedModId === "custom"
                        ? "Describe the mod you want"
                        : "Or describe a custom mod"}
                    </label>
                    <Textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder={
                        category === "amp"
                          ? 'e.g., "Jose Arredondo style mod with added master volume, cascaded gain, tighter bass..."'
                          : 'e.g., "Swap silicon diodes for germanium, increase input cap for more bass..."'
                      }
                      className="resize-none"
                      rows={3}
                      data-testid="input-custom-description"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Additional notes (optional)
                  </label>
                  <Textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="e.g., I play metal with downtuned guitars, using V30 cab, prefer tight low end..."
                    className="resize-none"
                    rows={2}
                    data-testid="input-additional-notes"
                  />
                </div>

                <Button
                  onClick={() => mutation.mutate()}
                  disabled={!canSubmit}
                  className="w-full"
                  data-testid="button-generate-mod"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Circuit Mod...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Generate Parameter Recipe
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle
                      className="text-xl flex items-center gap-2 flex-wrap"
                      data-testid="text-mod-name"
                    >
                      <Wrench className="w-5 h-5 text-primary shrink-0" />
                      {result.modName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {result.summary}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllParameters}
                    data-testid="button-copy-all-params"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? "Copied" : "Copy All"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {result.history && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Music className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {result.history}
                      </p>
                    </div>
                  )}

                  {result.startingPoint && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-foreground">
                          Starting Point:{" "}
                        </span>
                        <span className="text-muted-foreground">
                          {result.startingPoint}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CircuitBoard className="w-4 h-4 text-primary" />
                      Parameter Changes
                    </h3>
                    <div className="space-y-2">
                      {result.parameterChanges.map((param, i) => (
                        <motion.div
                          key={`${param.parameter}-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-3 rounded-lg border border-border bg-card"
                          data-testid={`card-param-${i}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <DirectionIcon direction={param.direction} />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-foreground text-sm">
                                    {param.parameter}
                                  </span>
                                  <Badge variant="secondary">
                                    {param.direction} &rarr;{" "}
                                    {param.suggestedValue}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {param.rationale}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyParameterOnly(param)}
                              data-testid={`button-copy-param-${i}`}
                            >
                              {copiedParam === param.parameter ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {result.toneDescription && (
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <p className="text-sm">
                        <span className="font-medium text-primary">
                          Expected Tone:{" "}
                        </span>
                        <span className="text-foreground">
                          {result.toneDescription}
                        </span>
                      </p>
                    </div>
                  )}

                  {result.interactionNotes && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-foreground">
                          Parameter Interactions:{" "}
                        </span>
                        <span className="text-muted-foreground">
                          {result.interactionNotes}
                        </span>
                      </div>
                    </div>
                  )}

                  {result.cautions && result.cautions.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Cautions
                      </h3>
                      <ul className="space-y-1">
                        {result.cautions.map((c, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-yellow-500 mt-1 shrink-0">
                              &bull;
                            </span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.alternatives && result.alternatives.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-secondary" />
                        Related Mods to Explore
                      </h3>
                      <ul className="space-y-1">
                        {result.alternatives.map((alt, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-secondary mt-1 shrink-0">
                              &bull;
                            </span>
                            {alt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
