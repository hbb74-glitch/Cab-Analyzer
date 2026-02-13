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
  ChevronRight,
  Printer,
  X,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    bestPositions: ["Cap Edge", "Cap (for aggression)", "Half to 2/3 toward edge"],
    avoidPositions: ["Surround edge (muddy)"],
    tips: [
      "Craig Anderton: Start 1-2\" back, perpendicular to speaker, half to two-thirds toward edge",
      "Bobby Owsinski: Place 3/4 between edge and center for balanced body and definition",
      "Moving toward center = brighter; moving toward edge = darker/warmer",
      "At 45° off-axis: Warmer, less harsh - reduces presence peak",
      "For IR production: Captures well at 0.5-2\" for direct, punchy response",
      "[DUAL-MIC] Fredman technique: Two SM57s at 55° angle, one on-axis, one off - thick modern metal tone"
    ],
    cabinetNotes: "Works on virtually any cabinet. SM57 IRs blend exceptionally well with ribbon IRs (R121, R10) in post. Pairs exceptionally with V30s and Greenbacks.",
    blendsWith: ["R121", "MD421", "e906"],
    genres: ["Rock", "Metal", "Blues", "Country", "Pop"],
    sources: [
      "Shure Application Notes",
      "Recording Engineer's Handbook - Bobby Owsinski",
      "Craig Anderton - Miking Guitar Amp Cabinets",
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
    character: "Warm, smooth top end with no harsh presence peak. Natural roll-off above 10kHz. Thick low-mids give weight to the sound. Handles 135-160dB SPL.",
    closeMikingRange: { min: 4, max: 6, sweet: 6 },
    bestPositions: ["Cap Edge (midway to edge)", "Cone", "60° cross-axis"],
    avoidPositions: ["Under 4 inches (excessive proximity bass)"],
    tips: [
      "For IR production: 4-6\" range manages proximity effect while staying close",
      "Royer official: Can go right up to grille if amp isn't creating plosives",
      "60° cross-axis technique (1940s-50s): Very 'chewy' tone, smooth highs",
      "Back side (logo away) is slightly brighter - great for adding air",
      "Flip polarity when using back side for proper phase alignment",
      "Strong proximity effect - 4-6\" keeps it controlled for IRs"
    ],
    cabinetNotes: "Known as 'the electric guitar mic.' For IR production, 4-6\" keeps proximity effect controlled. Takes EQ extremely well.",
    blendsWith: ["SM57", "MD421", "C414"],
    genres: ["Rock", "Blues", "Jazz", "Classic Rock", "Country"],
    sources: [
      "Royer Labs Application Guide",
      "Royer Labs Video Library - Ross Hogarth",
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
    closeMikingRange: { min: 2, max: 6, sweet: 6 },
    bestPositions: ["Cap Edge", "Cone", "Cap-Cone Transition"],
    tips: [
      "For IR production: 4-6\" provides balanced response with controlled proximity",
      "At 2-4 inches: Direct, maximum high-frequency content",
      "At 4-6 inches: Balanced with minimized proximity effect",
      "Front side (logo) is 'Crisp' - bright, clean highs",
      "Rear side is 'Smooth' - darker, rolled-off highs for harsh amps",
      "Minimized proximity effect compared to other ribbons - great for close work"
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
    closeMikingRange: { min: 4, max: 6, sweet: 6 },
    bestPositions: ["Cap Edge", "Cone", "Cap-Cone Transition"],
    tips: [
      "For IR production: 4-6\" range balances proximity effect",
      "Under 4 inches: Strong proximity effect, very bass-heavy",
      "At 6 inches: Balanced Royer sweet spot for IRs",
      "Handles 160dB SPL - built for loud sources like guitar cabs",
      "Figure-8 pattern provides excellent side rejection"
    ],
    cabinetNotes: "Works beautifully on any cabinet. Shares the R-121's ability to tame harsh speakers. For IR work, stay at 4-6\" range.",
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
    character: "Unique hypercardioid ribbon with tighter pattern than figure-8. Warm, creamy midrange with detailed highs. Natural 'expensive' sound without harshness.",
    closeMikingRange: { min: 0, max: 6, sweet: 1 },
    bestPositions: ["Cap Edge (perimeter)", "1 inch from grille", "4-6 inches back"],
    tips: [
      "Jacquire King technique: 1\" from grille, aimed at dust cap perimeter",
      "At 1 inch: Maximum detail with controlled proximity bass - sweet spot",
      "At 4-6 inches: More balanced, less proximity effect",
      "Top-address (end-fire) mic - point the end at the speaker",
      "Often used solo without EQ - natural, polished sound",
      "Hypercardioid pattern excellent for isolation in close-miking"
    ],
    cabinetNotes: "A secret weapon for IR producers. Brighter than most ribbons but never harsh. Handles high SPL easily. Hypercardioid rejects room reflections.",
    blendsWith: ["SM57", "MD421", "e906", "R121"],
    genres: ["Rock", "Blues", "Jazz", "Fusion", "Progressive", "Metal"],
    sources: [
      "Beyerdynamic Technical Documentation",
      "Premier Guitar - On Track",
      "TapeOp Magazine Review",
      "Gearspace Professional Threads"
    ]
  },
  {
    id: "md421",
    name: "MD421",
    fullName: "Sennheiser MD421",
    type: "dynamic",
    manufacturer: "Sennheiser",
    pattern: "Cardioid",
    character: "Large-diaphragm dynamic with full-range response. Wider frequency range than SM57 - more highs, more lows. Scooped mids, brighter and less compressed.",
    closeMikingRange: { min: 1, max: 4, sweet: 2 },
    bestPositions: ["Cap Edge", "45° angled toward voice coil", "Halfway to edge"],
    tips: [
      "Bobby Owsinski's favorite: Place 421 at 45° to SM57, pointing toward voice coil",
      "Position 2-4\" back to avoid excessive proximity effect buildup",
      "Bass switch: Start at 'M' (Music), move toward 'S' if too bass-heavy",
      "Wider frequency response fills out low-end and treble that SM57 lacks",
      "Mix typically 60:40 (SM57:MD421) or lower in mix to add body",
      "Can sound thin on its own - really shines when paired with SM57"
    ],
    cabinetNotes: "Bobby Owsinski's go-to pairing with SM57 at 45° angle. The 421 adds punch and body while SM57 provides mids. Phase-align by flipping phase, matching amp hiss, then flipping back.",
    blendsWith: ["SM57", "R121", "C414"],
    genres: ["Rock", "Metal", "Fusion", "Blues", "Pop"],
    sources: [
      "Sennheiser Application Engineering",
      "Recording Engineer's Handbook - Bobby Owsinski",
      "Bobby Owsinski's Music Production Blog",
      "Mix Magazine"
    ]
  },
  {
    id: "md421k",
    name: "MD421K",
    fullName: "Sennheiser MD421K (Kompakt)",
    type: "dynamic",
    manufacturer: "Sennheiser",
    pattern: "Cardioid",
    character: "Compact variant of the MD421. Tighter midrange focus with slightly less low-end extension than the full-size MD421. More forward-sounding mids, slightly brighter overall character. Similar proximity effect behavior but in a smaller housing.",
    closeMikingRange: { min: 1, max: 4, sweet: 2 },
    bestPositions: ["Cap Edge", "45° angled toward voice coil", "Halfway to edge"],
    tips: [
      "Similar placement principles to MD421 but expect tighter, more focused midrange",
      "Position 2-4\" back like the full-size MD421 to control proximity effect",
      "Slightly brighter than the full MD421 — may need less CapEdge brightness compensation",
      "Bass switch works the same as full MD421 — start at 'M' (Music)",
      "The compact form factor can be easier to position in tight multi-mic setups",
      "Not interchangeable with full MD421 — they have different sonic fingerprints"
    ],
    cabinetNotes: "The Kompakt version shares the MD421's general character but with a tighter midrange and slightly less extended low-end. Choose MD421K when you want more mid focus and the full MD421 when you want wider frequency range and more scooped mids.",
    blendsWith: ["SM57", "R121", "C414"],
    genres: ["Rock", "Metal", "Fusion", "Blues", "Pop"],
    sources: [
      "Sennheiser Application Engineering",
      "Recording Engineer's Handbook - Bobby Owsinski"
    ]
  },
  {
    id: "md441",
    name: "MD441",
    fullName: "Sennheiser MD441-U",
    type: "dynamic",
    manufacturer: "Sennheiser",
    pattern: "Supercardioid",
    character: "Extremely transparent dynamic - condenser-like detail with minimal coloration. Full midrange without SM57 scoop. Limited proximity effect.",
    closeMikingRange: { min: 1, max: 6, sweet: 4 },
    bestPositions: ["Cap Edge", "Slightly off-axis", "4-6 inches back"],
    tips: [
      "For IR production: 4-6\" sweet spot, slightly off-axis for smoother highs",
      "At 1-2 inches: Maximum detail, very direct sound",
      "Off-axis positioning reduces harshness for vintage/clean tones",
      "Presence switch: Flat for neutral, Presence for +4dB at 4kHz",
      "5-position bass switch: Start at 'M', reduce if boomy",
      "Move in 1cm increments - small moves make big tonal changes"
    ],
    cabinetNotes: "The 'reference' dynamic for critical listening. Transparent capture of exactly what amp produces. For IR work, 4-6\" provides balanced detail.",
    blendsWith: ["R121", "SM57", "e906"],
    genres: ["All genres - especially where accuracy is key"],
    switchSettings: [
      { name: "Flat", description: "Neutral frequency response - accurate capture" },
      { name: "Presence", description: "+4dB at 4kHz - adds cut and definition for mix" }
    ],
    sources: [
      "Sennheiser Pro Audio Documentation",
      "HomeRecording.com Professional Threads",
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
    character: "Flat-front side-address design for easy placement. Three-position presence switch at 4kHz. Peak at 4.2kHz with switch adjustments.",
    closeMikingRange: { min: 0, max: 2, sweet: 1 },
    bestPositions: ["Just off-center of cone", "Cap Edge", "15-45° off-axis (darker)"],
    tips: [
      "Position 1 (Bright): +7dB at 4.2kHz - aggressive metal, cutting rhythm",
      "Position 2 (Normal): +5dB at 4.2kHz - classic rock, natural amp tone",
      "Position 3 (Dark): +2dB at 4kHz - jazz/blues, smooth warm sounds",
      "Best position: Just off-center of cone (reduces harshness, adds warmth)",
      "For recording: Use short stand, not draped, for stable positioning",
      "Switch requires small screwdriver - tamper-resistant design",
      "High-gain tip: Use Position 3 to reduce fizz and harshness"
    ],
    cabinetNotes: "Side-address - marked 'FRONT' for correct orientation. Most engineers start with Position 2 (Normal). Supercardioid pattern excellent for tight spaces and reducing bleed.",
    blendsWith: ["R121", "SM57", "MD421", "M160"],
    genres: ["Rock", "Metal", "Pop", "Blues", "Live performance"],
    switchSettings: [
      { name: "Bright (Pos 1)", description: "+7dB at 4.2kHz - aggressive, cutting through mix" },
      { name: "Normal (Pos 2)", description: "+5dB at 4.2kHz - natural amp tone, most popular" },
      { name: "Dark (Pos 3)", description: "+2dB at 4kHz - warm jazz/blues, tames brightness" }
    ],
    sources: [
      "Sennheiser e906 Manual",
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
    pattern: "Multi-pattern (Cardioid for close-miking)",
    character: "Detailed, extended highs with accurate transient response. Slight presence peak. Requires pad for close-miking loud sources.",
    closeMikingRange: { min: 4, max: 6, sweet: 6 },
    bestPositions: ["Cap Edge (4-6 inches)", "Cone (for darker tone)"],
    tips: [
      "ALWAYS engage -10 or -20dB pad for close-miking loud amps",
      "Use cardioid pattern to minimize room pickup",
      "For IR production: 4-6\" with pad minimizes room",
      "Craig Anderton: Condensers too sensitive for very close placement",
      "Extended highs capture pick attack - great for clarity"
    ],
    cabinetNotes: "Less common for IR production due to room sensitivity. When used, stay at 4-6\" with pad engaged. Adds air and definition when needed.",
    blendsWith: ["SM57", "R121", "MD421"],
    genres: ["Rock", "Jazz", "Clean tones", "Fusion"],
    sources: [
      "AKG Professional Audio Guide",
      "Craig Anderton - Miking Guitar Amp Cabinets",
      "Recording Engineer's Handbook - Bobby Owsinski"
    ]
  },
  {
    id: "roswell",
    name: "Roswell Cab Mic",
    fullName: "Roswell Pro Audio Cab Mic",
    type: "condenser",
    manufacturer: "Roswell Pro Audio",
    pattern: "Cardioid (slightly narrow)",
    character: "Large-diaphragm condenser (34mm) with ribbon-like voicing. Gentle roll-off above 3kHz for smooth top end. Handles 125dB SPL without clipping.",
    closeMikingRange: { min: 2, max: 12, sweet: 6 },
    bestPositions: ["Cap (dust cap center)", "Cap Edge"],
    tips: [
      "Roswell recommends: Start centered on dust cap, 6 inches from grille",
      "Move closer for more bass (proximity effect is linear and predictable)",
      "Move further for less bass - no need to back off far",
      "Designed to work standalone without needing additional mics",
      "Ribbon-like smooth top end avoids 5-6kHz harshness"
    ],
    cabinetNotes: "Purpose-built for guitar cabs. Ribbon-like voicing with condenser durability and headroom. Developed with David Grissom and Tim Pierce.",
    blendsWith: ["SM57", "R121", "MD421"],
    genres: ["Rock", "Blues", "Country", "Jazz", "All styles"],
    sources: [
      "Roswell Pro Audio official website",
      "roswellproaudio.com/products/cab-mic"
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

function CheatSheet({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyToClipboard = async () => {
    const textList = MICROPHONE_GUIDES.map(mic => {
      const switchInfo = mic.switchSettings 
        ? ` | Switch: ${mic.switchSettings.map(s => s.name).join(", ")}`
        : "";
      const topTip = mic.tips[0] || "";
      return `${mic.name} (${mic.type})
  Range: ${mic.closeMikingRange.min}"-${mic.closeMikingRange.max}" | Sweet: ${mic.closeMikingRange.sweet}"
  Best: ${mic.bestPositions.slice(0, 2).join(", ")}${switchInfo}
  Tip: ${topTip}`;
    }).join("\n\n");

    const fullText = `CLOSE-MIKING CHEAT SHEET (0-6" IR Production)
==============================================
Sourced from Craig Anderton, Bobby Owsinski, and pro engineers

${textList}

---
POSITION GUIDE (Cap to Cone = Bright to Dark):
Cap = dust cap center (brightest, most aggressive)
Cap Edge = where cap meets cone (balanced - often the sweet spot)
Cone = mid-cone area (darkest, warmest)

CLOSE-MIKING DISTANCE EFFECTS (0-6" range):
0-1" = Maximum proximity bass, very direct/punchy
1-2" = Sweet spot for most dynamics
2-4" = Reduced proximity, more natural balance
4-6" = Minimal proximity, fuller speaker response

Note: All distances optimized for IR production.`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background print:static print:bg-white">
      <div className="max-w-4xl mx-auto p-6 print:p-2">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h2 className="text-2xl font-bold">Miking Cheat Sheet</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCopyToClipboard} 
              data-testid="button-copy-cheatsheet"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy List"}
            </Button>
            <Button onClick={handlePrint} data-testid="button-print-cheatsheet">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={onClose} data-testid="button-close-cheatsheet">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="print:block">
          <h1 className="text-xl font-bold mb-4 hidden print:block text-black">IR.Scope Miking Cheat Sheet</h1>
          
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-border print:border-black">
                <th className="text-left py-2 px-2 font-semibold">Mic</th>
                <th className="text-left py-2 px-2 font-semibold">Type</th>
                <th className="text-left py-2 px-2 font-semibold">Range</th>
                <th className="text-left py-2 px-2 font-semibold">Sweet Spot</th>
                <th className="text-left py-2 px-2 font-semibold">Best Positions</th>
                <th className="text-left py-2 px-2 font-semibold">Switch</th>
              </tr>
            </thead>
            <tbody>
              {MICROPHONE_GUIDES.map((mic, i) => (
                <tr key={mic.id} className={`border-b border-border/50 print:border-gray-300 ${i % 2 === 0 ? 'bg-muted/20 print:bg-gray-50' : ''}`}>
                  <td className="py-2 px-2 font-medium">{mic.name}</td>
                  <td className="py-2 px-2 text-muted-foreground print:text-gray-600 capitalize">{mic.type}</td>
                  <td className="py-2 px-2 font-mono">{mic.closeMikingRange.min}"-{mic.closeMikingRange.max}"</td>
                  <td className="py-2 px-2 font-mono font-bold text-primary print:text-black">{mic.closeMikingRange.sweet}"</td>
                  <td className="py-2 px-2 text-muted-foreground print:text-gray-600">{mic.bestPositions.slice(0, 2).join(", ")}</td>
                  <td className="py-2 px-2 text-muted-foreground print:text-gray-600">
                    {mic.switchSettings ? mic.switchSettings.map(s => s.name).join("/") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 grid grid-cols-2 gap-4 text-xs print:text-[10px]">
            <div className="p-3 bg-muted/30 rounded print:bg-gray-100 print:border print:border-gray-300">
              <h4 className="font-semibold mb-1">Position Guide</h4>
              <ul className="space-y-0.5 text-muted-foreground print:text-gray-600">
                <li><strong>Cap:</strong> Center of dust cap (brightest)</li>
                <li><strong>Cap Edge:</strong> Where cap meets cone (balanced)</li>
                <li><strong>Cap-Cone Tr:</strong> Transition zone (warmer)</li>
                <li><strong>Cone:</strong> Mid-cone area (darkest)</li>
              </ul>
            </div>
            <div className="p-3 bg-muted/30 rounded print:bg-gray-100 print:border print:border-gray-300">
              <h4 className="font-semibold mb-1">Distance Effects</h4>
              <ul className="space-y-0.5 text-muted-foreground print:text-gray-600">
                <li><strong>Closer:</strong> More bass (proximity), tighter</li>
                <li><strong>Further:</strong> More balanced, natural</li>
                <li><strong>Ribbons:</strong> Generally need more distance</li>
                <li><strong>Dynamics:</strong> Can go very close (0.5-2")</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MikingGuide() {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  
  const micTypes = ["all", "dynamic", "ribbon", "condenser"];
  
  const filteredMics = selectedType === "all" 
    ? MICROPHONE_GUIDES 
    : MICROPHONE_GUIDES.filter(m => m.type === selectedType);

  if (showCheatSheet) {
    return <CheatSheet onClose={() => setShowCheatSheet(false)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          <span className="text-primary">Miking</span> Guide
        </h1>
        <p className="text-muted-foreground">
          Curated close-miking techniques optimized for IR production. 
          Sourced from Craig Anderton, Bobby Owsinski, and professional recording engineers.
        </p>
        <Button 
          variant="outline" 
          className="mt-3"
          onClick={() => setShowCheatSheet(true)}
          data-testid="button-show-cheatsheet"
        >
          <Printer className="w-4 h-4 mr-2" />
          Printable Cheat Sheet
        </Button>
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
