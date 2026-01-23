import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mic2, 
  Radio, 
  Target, 
  Ruler, 
  Music, 
  AlertCircle,
  ChevronRight
} from "lucide-react";

interface MicrophoneGuide {
  id: string;
  name: string;
  fullName: string;
  type: "dynamic" | "ribbon" | "condenser";
  manufacturer: string;
  pattern: string;
  character: string;
  closeMikingRange: { min: number; max: number; sweet: number };
  bestPositions: string[];
  avoidPositions?: string[];
  tips: string[];
  cabinetNotes: string;
  blendsWith: string[];
  genres: string[];
  switchSettings?: { name: string; description: string }[];
  sources: string[];
}

const MICROPHONE_GUIDES: MicrophoneGuide[] = [
  {
    id: "sm57",
    name: "SM57",
    fullName: "Shure SM57",
    type: "dynamic",
    manufacturer: "Shure",
    pattern: "Cardioid",
    character: "Mid-forward, aggressive presence peak around 5-6kHz. Handles high SPL without distortion. The industry standard for guitar cabinets.",
    closeMikingRange: { min: 0.5, max: 4, sweet: 1 },
    bestPositions: ["Cap Edge", "Cap (for aggression)", "Cap Off-Center"],
    avoidPositions: ["Surround edge (muddy)"],
    tips: [
      "At 0.5-1 inch: Maximum proximity effect, punchy lows, aggressive highs",
      "At 2-3 inches: More balanced, natural cabinet sound with room interaction",
      "Angling 15-45° off-axis reduces harshness while maintaining presence",
      "The presence peak can be tamed by moving toward the cone"
    ],
    cabinetNotes: "Works on virtually any cabinet. Pairs exceptionally well with V30s and Greenbacks. Can sound thin on some speakers at dead-cap position.",
    blendsWith: ["R121", "MD421", "e906"],
    genres: ["Rock", "Metal", "Blues", "Country", "Pop"],
    sources: [
      "Shure Application Notes",
      "Recording Engineer's Handbook - Bobby Owsinski",
      "Mixing with Your Mind - Michael Paul Stavrou"
    ]
  },
  {
    id: "r121",
    name: "R121",
    fullName: "Royer R-121",
    type: "ribbon",
    manufacturer: "Royer Labs",
    pattern: "Figure-8",
    character: "Warm, smooth top end with no harsh presence peak. Natural roll-off above 10kHz. Thick low-mids give weight to the sound.",
    closeMikingRange: { min: 4, max: 12, sweet: 6 },
    bestPositions: ["Cap Edge", "Cone", "Cap-Cone Transition"],
    avoidPositions: ["Under 4 inches (excessive proximity bass)"],
    tips: [
      "Royer recommends 6-8 inches as the starting point for guitar cabs",
      "Under 4 inches: Very bass-heavy due to strong proximity effect",
      "At 6-8 inches: Balanced, official Royer sweet spot",
      "Angle downward 20-30° to reduce proximity-effect bass buildup",
      "The rear lobe is brighter than the front - experiment with flipping the mic",
      "Handles high SPL well despite being a ribbon (max 135dB SPL)"
    ],
    cabinetNotes: "Excellent for taming harsh speakers like some V30s. The smooth top end complements aggressive amps. Often used as the 'dark' mic in a blend.",
    blendsWith: ["SM57", "MD421", "C414"],
    genres: ["Rock", "Blues", "Jazz", "Classic Rock", "Country"],
    sources: [
      "Royer Labs Application Guide",
      "Recording Guitarist - Jon Chappell",
      "Sound on Sound Magazine"
    ]
  },
  {
    id: "r92",
    name: "R92",
    fullName: "AEA R92",
    type: "ribbon",
    manufacturer: "AEA",
    pattern: "Figure-8",
    character: "Designed specifically for close-miking. Front side is bright/crisp, rear side is smooth/dark. Minimized proximity effect.",
    closeMikingRange: { min: 2, max: 12, sweet: 6 },
    bestPositions: ["Cap Edge", "Cone", "Cap-Cone Transition"],
    tips: [
      "AEA designed this for 1-18 inches, flattest response at 6-12 inches",
      "At 2-4 inches: Direct, maximum high-frequency content",
      "At 6-12 inches: Flattest frequency response (AEA recommended)",
      "Front side (logo) is 'Crisp' - bright, clean highs",
      "Rear side is 'Smooth' - darker, rolled-off highs for harsh amps",
      "Minimized proximity effect compared to other ribbons"
    ],
    cabinetNotes: "Ideal for vintage amp tones and classic rock sounds. May need EQ boost in high frequencies for modern tones.",
    blendsWith: ["SM57", "MD421", "e906"],
    genres: ["Blues", "Jazz", "Classic Rock", "R&B", "Soul"],
    sources: [
      "AEA Microphones Application Notes",
      "Tape Op Magazine",
      "Pensado's Place"
    ]
  },
  {
    id: "r10",
    name: "R10",
    fullName: "Royer R-10",
    type: "ribbon",
    manufacturer: "Royer Labs",
    pattern: "Figure-8",
    character: "Entry-level Royer ribbon with the signature smooth top end. Handles high SPL well. Warm, natural sound similar to the R-121.",
    closeMikingRange: { min: 4, max: 12, sweet: 6 },
    bestPositions: ["Cap Edge", "Cone", "Cap-Cone Transition"],
    tips: [
      "Same placement principles as R-121: start at 6-8 inches",
      "Under 4 inches: Strong proximity effect, very bass-heavy",
      "At 6-8 inches: Balanced Royer sweet spot",
      "Handles 160dB SPL - built for loud sources like guitar cabs",
      "Figure-8 pattern provides excellent side rejection"
    ],
    cabinetNotes: "Works beautifully on any cabinet. Shares the R-121's ability to tame harsh speakers. Great entry point into Royer ribbon sound.",
    blendsWith: ["SM57", "MD421", "e906"],
    genres: ["Rock", "Blues", "Classic Rock", "Jazz"],
    sources: [
      "Royer Labs Product Documentation",
      "Sound on Sound Review"
    ]
  },
  {
    id: "m160",
    name: "M160",
    fullName: "Beyerdynamic M160",
    type: "ribbon",
    manufacturer: "Beyerdynamic",
    pattern: "Hypercardioid",
    character: "Unique hypercardioid ribbon with tighter pickup pattern than typical figure-8 ribbons. Clear, detailed highs for a ribbon. Rich, creamy 3D midrange.",
    closeMikingRange: { min: 0, max: 8, sweet: 1 },
    bestPositions: ["Cap Edge (perimeter)", "Cap Off-Center"],
    tips: [
      "Jacquire King's go-to: 1 inch from grille, aimed at dust cap perimeter",
      "Right on the grille: Most bass-heavy, tight and punchy",
      "At 1 inch: Sweet spot - balanced tone with good air",
      "At 8 inches: Opens up the sound, less proximity effect",
      "Hypercardioid pattern provides excellent isolation",
      "Brighter than most ribbons - can work solo without a bright mic"
    ],
    cabinetNotes: "Excellent all-around ribbon for guitar cabs. Works well on bright and dark speakers alike. A secret weapon for many studio engineers.",
    blendsWith: ["SM57", "MD421", "R121"],
    genres: ["Rock", "Blues", "Jazz", "Fusion", "Progressive"],
    sources: [
      "Beyerdynamic Technical Documentation",
      "Pro Sound Web",
      "Gearslutz/Gearspace forums (professional threads)"
    ]
  },
  {
    id: "md421",
    name: "MD421",
    fullName: "Sennheiser MD421",
    type: "dynamic",
    manufacturer: "Sennheiser",
    pattern: "Cardioid",
    character: "Large-diaphragm dynamic with full-range response. Punchy low-end, clear mids, and smooth highs. 5-position bass roll-off switch.",
    closeMikingRange: { min: 0.5, max: 4, sweet: 1.5 },
    bestPositions: ["Cap Edge", "Cap", "Cap Off-Center"],
    tips: [
      "Use the bass roll-off switch: 'M' (Music) for full bass, 'S' (Speech) for reduced proximity effect",
      "At 0.5-1 inch: Full proximity effect, huge low-end - use 'S' setting if too boomy",
      "At 2-3 inches: More natural balance, great for cleaner tones",
      "Less aggressive presence peak than SM57 - smoother top end",
      "Excellent for scooped metal tones when placed on-cap"
    ],
    cabinetNotes: "A studio staple alongside the SM57. Works on any cabinet. The fuller low-end compared to SM57 makes it great for thin-sounding speakers.",
    blendsWith: ["SM57", "R121", "C414"],
    genres: ["Rock", "Metal", "Fusion", "Blues", "Pop"],
    sources: [
      "Sennheiser Application Engineering",
      "Recording Engineer's Handbook - Bobby Owsinski",
      "Mix Magazine"
    ]
  },
  {
    id: "md441",
    name: "MD441",
    fullName: "Sennheiser MD441-U",
    type: "dynamic",
    manufacturer: "Sennheiser",
    pattern: "Supercardioid",
    character: "Extremely accurate dynamic microphone with flat response. Tight supercardioid pattern. Five-position bass switch and presence switch.",
    closeMikingRange: { min: 1, max: 12, sweet: 8 },
    bestPositions: ["Cap Edge", "Cap Off-Center", "Slight off-axis"],
    tips: [
      "Sweet spot for many engineers: 6-12 inches, slightly off-axis",
      "At 1-2 inches: Maximum detail, very direct sound",
      "At 6-12 inches: Balanced detail without harshness - preferred by many",
      "Presence switch: 'Flat' for neutral, 'Presence' for ~4dB boost at 4kHz",
      "Bass switch: 'M' (Music/full) to 'S' positions for roll-off",
      "More neutral than SM57 or MD421 - reveals true speaker character"
    ],
    cabinetNotes: "The 'reference' dynamic for critical listening. Shows exactly what the speaker sounds like. May need the presence boost for mix-ready tones.",
    blendsWith: ["R121", "SM57", "e906"],
    genres: ["All genres - especially where accuracy is key"],
    switchSettings: [
      { name: "Flat", description: "Neutral frequency response - use for accurate capture" },
      { name: "Presence", description: "4dB boost at 4kHz - adds cut and definition" }
    ],
    sources: [
      "Sennheiser Pro Audio Documentation",
      "Sound on Sound Magazine",
      "TapeOp Magazine"
    ]
  },
  {
    id: "m88",
    name: "M88",
    fullName: "Beyerdynamic M88 TG",
    type: "dynamic",
    manufacturer: "Beyerdynamic",
    pattern: "Hypercardioid",
    character: "Warm, full-bodied dynamic with excellent low-frequency punch. Smooth highs without harshness. Great transient response.",
    closeMikingRange: { min: 0.5, max: 4, sweet: 1.5 },
    bestPositions: ["Cap Edge", "Cap-Cone Transition", "Cone"],
    tips: [
      "At 0.5-1 inch: Huge, warm low-end - great for bass-heavy tones",
      "At 2-3 inches: More balanced, still retains warmth",
      "Hypercardioid pattern provides good isolation",
      "The smooth top end works well on bright speakers",
      "Often used on bass cabs - translates well to guitar"
    ],
    cabinetNotes: "Underrated for guitar cabs. Provides warmth and weight that complements thinner speakers. Excellent on vintage-style amps.",
    blendsWith: ["SM57", "e906", "C414"],
    genres: ["Rock", "Blues", "Classic Rock", "Country", "Jazz"],
    sources: [
      "Beyerdynamic Application Guide",
      "Pro Audio Files",
      "Recording Magazine"
    ]
  },
  {
    id: "pr30",
    name: "PR30",
    fullName: "Heil Sound PR30",
    type: "dynamic",
    manufacturer: "Heil Sound",
    pattern: "Cardioid",
    character: "Large 1.5\" diaphragm. Bright and clear but without a presence peak (unlike SM57's 5-6kHz bump). Extended, smooth high-frequency response.",
    closeMikingRange: { min: 0.5, max: 4, sweet: 1 },
    bestPositions: ["Halfway center-to-edge", "Cap Edge"],
    tips: [
      "Sweet spot: 0.5-1 inch from grille, halfway between cone center and edge",
      "Less proximity effect than typical dynamics - more natural low-end",
      "At 0.5-1 inch: Balanced, full tone with good detail",
      "At 3-4 inches: Less proximity effect, reduced boominess",
      "End-address mic - point the end (not the side) at the speaker",
      "Excels on high-gain/metal - tight polar pattern, no fizz"
    ],
    cabinetNotes: "Excellent for adding clarity and definition. Use on dark cabinets or blend with a ribbon for balance. Can be too bright on already-bright speakers.",
    blendsWith: ["R121", "R92", "M160"],
    genres: ["Metal", "Hard Rock", "Progressive", "Modern Rock"],
    sources: [
      "Heil Sound Technical Resources",
      "Recording Hacks",
      "Gearspace professional discussions"
    ]
  },
  {
    id: "e906",
    name: "e906",
    fullName: "Sennheiser e906",
    type: "dynamic",
    manufacturer: "Sennheiser",
    pattern: "Supercardioid",
    character: "Flat-front design for easy placement. Three-position presence switch. Clear, defined sound with controlled proximity effect.",
    closeMikingRange: { min: 0.5, max: 3, sweet: 1 },
    bestPositions: ["Cap Edge", "Cap", "Cap Off-Center"],
    tips: [
      "Flat-front design allows hanging directly on cabinet grille",
      "Three-position switch: Bright (presence boost), Normal (flat), Dark (high-frequency cut)",
      "At 0.5-1 inch: Tight, focused sound - flat-front minimizes proximity issues",
      "At 2-3 inches: More open, natural tone",
      "Supercardioid pattern provides excellent isolation in live settings"
    ],
    cabinetNotes: "Designed specifically for guitar cabinets. The flat front makes positioning consistent and repeatable. A modern studio and live staple.",
    blendsWith: ["R121", "SM57", "MD421"],
    genres: ["Rock", "Metal", "Pop", "Blues", "Live performance"],
    switchSettings: [
      { name: "Bright", description: "Presence boost - adds cut and clarity" },
      { name: "Normal", description: "Flat, neutral response" },
      { name: "Dark", description: "High-frequency reduction - warmer, smoother" }
    ],
    sources: [
      "Sennheiser Application Notes",
      "Modern Recording Techniques - David Huber",
      "Premier Guitar Magazine"
    ]
  },
  {
    id: "m201",
    name: "M201",
    fullName: "Beyerdynamic M201 TG",
    type: "dynamic",
    manufacturer: "Beyerdynamic",
    pattern: "Hypercardioid",
    character: "Very accurate, uncolored dynamic with tight pattern. Excellent transient response. Often compared to small-diaphragm condensers.",
    closeMikingRange: { min: 1, max: 4, sweet: 2 },
    bestPositions: ["Cap Edge", "Cap Off-Center", "Cap-Cone Transition"],
    tips: [
      "At 1-2 inches: Detailed, accurate capture with controlled proximity effect",
      "At 3-4 inches: Natural, open sound with excellent transient clarity",
      "Hypercardioid pattern rejects room and bleed effectively",
      "Often called a 'dynamic condenser' for its accuracy",
      "Works exceptionally well for clean and slightly overdriven tones"
    ],
    cabinetNotes: "A secret weapon for engineers who want dynamic durability with near-condenser accuracy. Excellent on any speaker type.",
    blendsWith: ["R121", "SM57", "MD421"],
    genres: ["Jazz", "Blues", "Country", "Rock", "Fusion"],
    sources: [
      "Beyerdynamic Pro Audio Guide",
      "Recording Magazine",
      "Sound on Sound"
    ]
  },
  {
    id: "sm7b",
    name: "SM7B",
    fullName: "Shure SM7B",
    type: "dynamic",
    manufacturer: "Shure",
    pattern: "Cardioid",
    character: "Smooth, warm dynamic with controlled highs. Excellent electromagnetic shielding. Flat, wide-range frequency response.",
    closeMikingRange: { min: 1, max: 6, sweet: 2 },
    bestPositions: ["Cap Edge", "Cap-Cone Transition", "Cone"],
    tips: [
      "Bass roll-off and presence boost switches available",
      "At 1-2 inches: Full, warm tone with smooth highs",
      "At 3-4 inches: More open, less proximity effect",
      "The warm character complements bright amps and speakers",
      "Less presence peak than SM57 - more 'broadcast' smooth sound"
    ],
    cabinetNotes: "Underutilized on guitar cabs. Provides a smooth, warm alternative to brighter dynamics. Excellent for recording clean and slightly dirty tones.",
    blendsWith: ["e906", "PR30", "C414"],
    genres: ["Blues", "Jazz", "R&B", "Soul", "Clean Rock"],
    sources: [
      "Shure Application Guide",
      "Professional Audio Files",
      "Mix Magazine"
    ]
  },
  {
    id: "c414",
    name: "C414",
    fullName: "AKG C414",
    type: "condenser",
    manufacturer: "AKG",
    pattern: "Multi-pattern (typically Cardioid for cabs)",
    character: "Detailed, extended highs with accurate transient response. Slight presence peak. Multiple pattern options.",
    closeMikingRange: { min: 6, max: 18, sweet: 12 },
    bestPositions: ["Cap Edge (from distance)", "Cone (from distance)"],
    tips: [
      "Use cardioid pattern for most guitar cab applications",
      "At 6-12 inches: Captures cabinet and speaker interaction naturally",
      "At 12-18 inches: More room, natural ambience included",
      "Engage the pad (-10 or -20dB) for high-SPL sources",
      "The extended highs capture pick attack and string detail"
    ],
    cabinetNotes: "Best used at distance to capture the full cabinet sound. Not typically a close-mic choice, but adds air and detail when blended with a close dynamic or ribbon.",
    blendsWith: ["SM57", "R121", "MD421"],
    genres: ["Rock", "Jazz", "Acoustic styles", "Ambient"],
    sources: [
      "AKG Professional Audio Guide",
      "Recording Engineer's Handbook - Bobby Owsinski",
      "Sweetwater Sound"
    ]
  },
  {
    id: "roswell",
    name: "Roswell Cab Mic",
    fullName: "Roswell Pro Audio Cab Mic",
    type: "condenser",
    manufacturer: "Roswell Pro Audio",
    pattern: "Cardioid",
    character: "Small-diaphragm condenser designed for guitar cabinet recording. Handles high SPL with built-in pad options.",
    closeMikingRange: { min: 4, max: 12, sweet: 6 },
    bestPositions: ["Cap Edge", "Cone"],
    tips: [
      "Use the -10dB or -20dB pad for close-miking loud sources",
      "At 4-6 inches: Balanced capture with condenser detail",
      "At 8-12 inches: More room interaction, natural ambience",
      "Small-diaphragm design provides accurate transient response"
    ],
    cabinetNotes: "A specialized condenser for cab recording. Best positioned slightly further back than dynamics to capture the full speaker response.",
    blendsWith: ["SM57", "R121", "MD421"],
    genres: ["Rock", "Blues", "Pop", "Country"],
    sources: [
      "Roswell Pro Audio website",
      "User community feedback"
    ]
  }
];

function MicTypeIcon({ type }: { type: MicrophoneGuide["type"] }) {
  const colors = {
    dynamic: "text-blue-400",
    ribbon: "text-orange-400",
    condenser: "text-purple-400"
  };
  
  return (
    <Badge variant="outline" className={`${colors[type]} border-current`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function MicrophoneCard({ mic }: { mic: MicrophoneGuide }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Mic2 className="w-5 h-5 text-primary" />
              {mic.fullName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{mic.manufacturer} | {mic.pattern}</p>
          </div>
          <MicTypeIcon type={mic.type} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Character</h4>
          <p className="text-sm">{mic.character}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Ruler className="w-4 h-4 text-primary" />
              Close-Miking Range
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-lg font-mono font-bold text-primary">
                {mic.closeMikingRange.min}" - {mic.closeMikingRange.max}"
              </div>
              <div className="text-xs text-muted-foreground">
                Sweet spot: <span className="text-primary font-medium">{mic.closeMikingRange.sweet}"</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="w-4 h-4 text-primary" />
              Best Positions
            </div>
            <div className="flex flex-wrap gap-1">
              {mic.bestPositions.map((pos) => (
                <Badge key={pos} variant="secondary" className="text-xs">
                  {pos}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {mic.switchSettings && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Radio className="w-4 h-4 text-yellow-400" />
              Switch Settings
            </h4>
            <div className="grid gap-2">
              {mic.switchSettings.map((setting) => (
                <div key={setting.name} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                  <span className="font-medium text-yellow-400">{setting.name}:</span>{" "}
                  <span className="text-sm text-muted-foreground">{setting.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Technique Tips</h4>
          <ul className="space-y-1">
            {mic.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {mic.avoidPositions && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-red-400 mb-1">
              <AlertCircle className="w-4 h-4" />
              Positions to Avoid
            </div>
            <p className="text-sm text-muted-foreground">{mic.avoidPositions.join(", ")}</p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Cabinet Notes</h4>
          <p className="text-sm text-muted-foreground">{mic.cabinetNotes}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Music className="w-4 h-4 text-primary" />
              Best For
            </div>
            <div className="flex flex-wrap gap-1">
              {mic.genres.slice(0, 4).map((genre) => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {mic.genres.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{mic.genres.length - 4}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Blends Well With</h4>
            <div className="flex flex-wrap gap-1">
              {mic.blendsWith.map((blend) => (
                <Badge key={blend} className="text-xs bg-primary/20 text-primary border-primary/30">
                  {blend}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Sources:</span> {mic.sources.join(", ")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MikingGuide() {
  const [selectedType, setSelectedType] = useState<string>("all");
  
  const micTypes = ["all", "dynamic", "ribbon", "condenser"];
  
  const filteredMics = selectedType === "all" 
    ? MICROPHONE_GUIDES 
    : MICROPHONE_GUIDES.filter(m => m.type === selectedType);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          <span className="text-primary">Miking</span> Guide
        </h1>
        <p className="text-muted-foreground">
          Curated close-miking techniques for each microphone in your locker. 
          Information sourced from professional recording engineering references.
        </p>
      </div>

      <div className="mb-6">
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList>
            {micTypes.map((type) => (
              <TabsTrigger 
                key={type} 
                value={type}
                className="capitalize"
                data-testid={`tab-mictype-${type}`}
              >
                {type === "all" ? "All Mics" : `${type}s`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
        <h3 className="font-medium mb-2">Quick Reference: Close-Miking Distances</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-primary font-mono">0.5" - 1"</span>
            <p className="text-muted-foreground text-xs">Maximum proximity effect, punchy, aggressive</p>
          </div>
          <div>
            <span className="text-primary font-mono">1" - 2"</span>
            <p className="text-muted-foreground text-xs">Sweet spot for most dynamics</p>
          </div>
          <div>
            <span className="text-primary font-mono">2" - 4"</span>
            <p className="text-muted-foreground text-xs">Balanced, natural tone</p>
          </div>
          <div>
            <span className="text-primary font-mono">6"+</span>
            <p className="text-muted-foreground text-xs">Room interaction, condensers</p>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="grid gap-6 md:grid-cols-2">
          {filteredMics.map((mic) => (
            <MicrophoneCard key={mic.id} mic={mic} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
