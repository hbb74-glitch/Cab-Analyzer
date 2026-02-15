export interface AmpModel {
  id: string;
  label: string;
  basedOn: string;
  category: 'amp';
  characteristics: string;
}

export interface DriveModel {
  id: string;
  label: string;
  basedOn: string;
  category: 'drive';
  characteristics: string;
}

export interface KnownMod {
  id: string;
  label: string;
  appliesTo: string[];
  category: 'amp' | 'drive' | 'both';
  description: string;
  circuitChanges: string;
}

export interface ExpertParameter {
  name: string;
  category: 'amp' | 'drive';
  range: string;
  defaultValue: string;
  circuitEquivalent: string;
  description: string;
}

export const FRACTAL_AMP_MODELS: AmpModel[] = [

  // ═══════════════════════════════════════════
  // FENDER TWEED ERA
  // ═══════════════════════════════════════════

  { id: "5f1-tweed", label: "5F1 TWEED", basedOn: "Fender narrow-panel Tweed Champ, 5F1", category: "amp", characteristics: "Single-ended, single-tube Fender. Pure, raw tone that breaks up beautifully at low volume. Eric Clapton's Layla tones. One knob: Volume." },
  { id: "5f1-tweed-ec", label: "5F1 TWEED EC", basedOn: "2011 Fender EC Vibro-Champ", category: "amp", characteristics: "Eric Clapton signature reissue of the Vibro-Champ. Warm, touch-sensitive clean-to-crunch tones with built-in tremolo. Single-ended simplicity." },
  { id: "5f8-tweed-bright", label: "5F8 TWEED BRIGHT", basedOn: "Keith Urban's 1959 Fender narrow-panel high-power Tweed Twin, 5F8", category: "amp", characteristics: "Bright channel of the rare high-power Tweed Twin. Rich harmonic content with chimey top end. Big, open sound with vintage Fender grit when pushed." },
  { id: "5f8-tweed-jumped", label: "5F8 TWEED JUMPED", basedOn: "1959 Fender narrow-panel high-power Tweed Twin, 5F8", category: "amp", characteristics: "Jumped channel configuration of the high-power Tweed Twin. Combines both channels for fuller frequency response and richer harmonic complexity." },
  { id: "5f8-tweed-normal", label: "5F8 TWEED NORMAL", basedOn: "1959 Fender narrow-panel high-power Tweed Twin, 5F8", category: "amp", characteristics: "Normal channel of the high-power Tweed Twin. Warmer, darker voicing than the Bright channel. Fat, round clean tones with smooth breakup." },
  { id: "deluxe-tweed", label: "DELUXE TWEED", basedOn: "1957 Fender narrow-panel Tweed Deluxe, 5E3", category: "amp", characteristics: "Raw, gritty, vintage breakup. The Neil Young tone. Interactive volume controls, beautiful harmonic distortion when cranked. Classic blues standard." },
  { id: "deluxe-tweed-jumped", label: "DELUXE TWEED JUMPED", basedOn: "1957 Fender narrow-panel Tweed Deluxe, 5E3", category: "amp", characteristics: "Jumped channel configuration of the Tweed Deluxe. Both channels combined for fuller, more complex tone with richer harmonics and earlier breakup." },
  { id: "59-bassguy-bright", label: "59 BASSGUY BRIGHT", basedOn: "1959 Fender narrow-panel Tweed Bassman, 5F6-A", category: "amp", characteristics: "Bright channel of the legendary Tweed Bassman. The amp that inspired Marshall. Chimey highs with warm, fat breakup. Blues standard." },
  { id: "59-bassguy-jumped", label: "59 BASSGUY JUMPED", basedOn: "1959 Fender narrow-panel Tweed Bassman, 5F6-A", category: "amp", characteristics: "Jumped channel Tweed Bassman combining Bright and Normal inputs. Full-spectrum tone with the best of both channels. Rich, complex harmonic content." },
  { id: "59-bassguy-normal", label: "59 BASSGUY NORMAL", basedOn: "1959 Fender narrow-panel Tweed Bassman, 5F6-A", category: "amp", characteristics: "Normal channel of the Tweed Bassman. Warmer, darker voicing. Fat, round tone that breaks up beautifully when cranked." },
  { id: "59-bassguy-ri-jumped", label: "59 BASSGUY RI JUMPED", basedOn: "Fender 59 Bassman LTD Vintage Reissue", category: "amp", characteristics: "Jumped channels on the Fender reissue Bassman. Modern build quality with vintage Tweed Bassman character. Warm, fat crunch with full frequency response." },
  { id: "supertweed", label: "SUPERTWEED", basedOn: "Custom Fractal model inspired by Fender '57 Tweed Super 5E4", category: "amp", characteristics: "Fender Super Tweed-inspired custom model. Raw, gritty, louder than Deluxe Tweed. Beautiful harmonic distortion at volume." },
  { id: "princetone-5f2", label: "PRINCETONE 5F2", basedOn: "Fender Tweed Princeton, 5F2-A", category: "amp", characteristics: "Small Tweed-era Fender Princeton. Simple, pure tone with early breakup. Single-ended design with warm, compressed character. Great practice and recording amp." },

  // ═══════════════════════════════════════════
  // FENDER BROWNFACE ERA
  // ═══════════════════════════════════════════

  { id: "6g4-super", label: "6G4 SUPER", basedOn: "1960 Brownface Fender Super, 6G4", category: "amp", characteristics: "Transitional brownface Fender. Warmer than blackface, more harmonically rich. Unique, lush tremolo circuit with a smooth, organic character." },
  { id: "6g12-concert", label: "6G12 CONCERT", basedOn: "1960 Brownface Fender Concert, 6G12", category: "amp", characteristics: "Brownface-era Fender Concert. 40W with 4x10 speakers. Warm, complex tone with the signature brownface harmonic richness. Great for blues and roots." },
  { id: "deluxe-6g3", label: "DELUXE 6G3", basedOn: "Brownface Fender Deluxe, 6G3, bright channel", category: "amp", characteristics: "Brownface Fender Deluxe bright channel. Transitional design between Tweed and Blackface eras. Warm yet articulate with unique harmonic character." },

  // ═══════════════════════════════════════════
  // FENDER BLACKFACE / SILVERFACE ERA
  // ═══════════════════════════════════════════

  { id: "deluxe-verb-normal", label: "DELUXE VERB NORMAL", basedOn: "1965 Blackface Fender Deluxe Reverb, AB763", category: "amp", characteristics: "Normal channel of the classic Deluxe Reverb. Sweet, chimey Fender cleans that break up nicely when pushed. Studio workhorse with warm, round tone." },
  { id: "deluxe-verb-vibrato", label: "DELUXE VERB VIBRATO", basedOn: "1965 Blackface Fender Deluxe Reverb, AB763", category: "amp", characteristics: "Vibrato channel of the Deluxe Reverb with built-in reverb and tremolo. The quintessential recording amp. Lush, three-dimensional clean tones." },
  { id: "super-verb-normal", label: "SUPER VERB NORMAL", basedOn: "1964 Fender Super Reverb, AB763", category: "amp", characteristics: "Normal channel of the 4x10 Fender Super Reverb. More headroom and low-end than the Deluxe. Warm, punchy clean tones." },
  { id: "super-verb-vibrato", label: "SUPER VERB VIBRATO", basedOn: "1964 Fender Super Reverb, AB763", category: "amp", characteristics: "Vibrato channel of the Super Reverb with reverb and tremolo. Great clean tone with singing breakup. Excellent for blues, country, and roots." },
  { id: "band-commander", label: "BAND-COMMANDER", basedOn: "1968 Silverface/Blackface Fender Bandmaster head, AB763", category: "amp", characteristics: "Blackface Fender head. Clean, bright, responds well to pedals. Similar voicing to Deluxe Reverb but with more headroom as a head unit." },
  { id: "double-verb-normal", label: "DOUBLE VERB NORMAL", basedOn: "1966 blackface Fender Twin Reverb", category: "amp", characteristics: "Normal channel of the blackface Twin Reverb. Maximum Fender clean headroom. Crystal clear, scooped, very loud. The standard for pristine clean tones." },
  { id: "double-verb-silverface", label: "DOUBLE VERB SILVERFACE", basedOn: "1971 silverface Fender Twin Reverb", category: "amp", characteristics: "Silverface-era Twin Reverb. Slightly different voicing from the blackface with a bit more midrange. Still massive clean headroom with that classic Fender sparkle." },
  { id: "double-verb-vibrato", label: "DOUBLE VERB VIBRATO", basedOn: "1966 blackface Fender Twin Reverb", category: "amp", characteristics: "Vibrato channel of the blackface Twin. Crystal clear cleans with built-in reverb and tremolo. Country, jazz, and clean tone standard." },
  { id: "princetone-aa964", label: "PRINCETONE AA964", basedOn: "Silverface Fender Princeton without reverb, AA964", category: "amp", characteristics: "Silverface Princeton without reverb. Small, sweet, compressed breakup at manageable volumes. Pure, unadorned Fender tone in a compact format." },
  { id: "princetone-reverb", label: "PRINCETONE REVERB", basedOn: "1966 blackface Fender Princeton with reverb, AA964", category: "amp", characteristics: "Blackface Princeton Reverb. One of the best recording amps ever made. Sweet, compressed breakup with lush spring reverb and tremolo." },
  { id: "tremolo-lux", label: "TREMOLO LUX", basedOn: "Blackface Fender Tremolux, AA763", category: "amp", characteristics: "Blackface Fender Tremolux head. Clean, chimey Fender tone with built-in tremolo. Similar to Deluxe Reverb but as a head unit without reverb." },
  { id: "65-bassguy-bass", label: "65 BASSGUY BASS", basedOn: "1965 Blackface Fender Bassman head, AB165", category: "amp", characteristics: "Blackface-era Bassman bass channel. Cleaner than Tweed version. More headroom, tighter bass response with solid low-end foundation." },
  { id: "65-bassguy-normal", label: "65 BASSGUY NORMAL", basedOn: "1965 Blackface Fender Bassman head, AB165", category: "amp", characteristics: "Blackface Bassman normal channel. Bright, clean, punchy. Good pedal platform with Fender sparkle and clarity." },
  { id: "dweezils-bassguy", label: "DWEEZIL'S BASSGUY", basedOn: "Dweezil Zappa's 1965 blackface Fender Bassman, AB165", category: "amp", characteristics: "Dweezil Zappa's personal blackface Bassman. Unique character from aged components and specific tube complement. Warm, articulate, and responsive." },
  { id: "jr-blues", label: "JR BLUES", basedOn: "Fender Blues Junior", category: "amp", characteristics: "Small, affordable Fender combo. EL84 power tubes give it a more British flavor. Warm cleans to moderate crunch. Popular gigging and practice amp." },
  { id: "jr-blues-fat", label: "JR BLUES FAT", basedOn: "Fender Blues Junior", category: "amp", characteristics: "Blues Junior with the Fat switch engaged. Adds bass and midrange body for a thicker, warmer tone. Fills out the sound for fuller crunch tones." },

  // ═══════════════════════════════════════════
  // MARSHALL PLEXI
  // ═══════════════════════════════════════════

  { id: "1959slp-jumped", label: "1959SLP JUMPED", basedOn: "100W Marshall Super Lead Plexi 1959 reissue", category: "amp", characteristics: "Jumped channels on the 100W Plexi reissue. Both channels linked for the full Plexi experience. Rich, complex harmonics with classic rock crunch. The EVH early-era starting point." },
  { id: "1959slp-normal", label: "1959SLP NORMAL", basedOn: "100W Marshall Super Lead Plexi 1959 reissue", category: "amp", characteristics: "Normal channel of the 100W Plexi reissue. Warmer, darker voicing. Fat, round tone with smooth breakup. Less bright than the Treble channel." },
  { id: "1959slp-treble", label: "1959SLP TREBLE", basedOn: "100W Marshall Super Lead Plexi 1959 reissue", category: "amp", characteristics: "Treble channel of the 100W Plexi reissue. Brighter, more aggressive voicing with more cutting presence. The classic Plexi crunch tone." },
  { id: "1987x-jumped", label: "1987X JUMPED", basedOn: "50W Marshall 1987X reissue", category: "amp", characteristics: "Jumped channels on the 50W Plexi reissue. Earlier breakup than the 100W due to lower wattage. Full, rich tone combining both channels." },
  { id: "1987x-normal", label: "1987X NORMAL", basedOn: "50W Marshall 1987X reissue", category: "amp", characteristics: "Normal channel of the 50W Plexi reissue. Warm, round, earlier breakup than 100W. Classic British crunch at more manageable volumes." },
  { id: "1987x-treble", label: "1987X TREBLE", basedOn: "50W Marshall 1987X reissue", category: "amp", characteristics: "Treble channel of the 50W Plexi reissue. Bright, cutting Plexi tone with mid-forward character. Very dynamic and touch-sensitive." },
  { id: "plexi-100w-1970", label: "PLEXI 100W 1970", basedOn: "1970 100W Marshall Plexi", category: "amp", characteristics: "Vintage 1970 100W Super Lead. Slightly different character from earlier Plexis due to component drift and circuit changes. Raw, aggressive vintage British tone." },
  { id: "plexi-100w-high", label: "PLEXI 100W HIGH", basedOn: "1969 100W Marshall Plexi", category: "amp", characteristics: "High-treble input of a 1969 100W Plexi. Brighter, more present tone with classic late-60s Marshall character. Iconic rock tone." },
  { id: "plexi-100w-jumped", label: "PLEXI 100W JUMPED", basedOn: "1969 100W Marshall Plexi", category: "amp", characteristics: "Jumped channels on the 1969 100W Plexi. Full-spectrum vintage Plexi tone with both channels combined for maximum harmonic richness." },
  { id: "plexi-100w-normal", label: "PLEXI 100W NORMAL", basedOn: "1969 100W Marshall Plexi", category: "amp", characteristics: "Normal channel of the 1969 100W Plexi. Darker, warmer voicing. Smooth, round breakup with less treble bite than the High input." },
  { id: "plexi-2204", label: "PLEXI 2204", basedOn: "1981 50W Marshall JMP 2204", category: "amp", characteristics: "Early JMP 2204 with master volume. Transitional design between Plexi and JCM 800 eras. Has Plexi-like character with added master volume for more gain control." },
  { id: "plexi-50w-6550", label: "PLEXI 50W 6550", basedOn: "1972 50W Marshall Plexi", category: "amp", characteristics: "50W Plexi with 6550 power tubes. More headroom and tighter low-end than EL34 versions. Clean, punchy tone with American-flavored power section." },
  { id: "plexi-50w-6ca7", label: "PLEXI 50W 6CA7", basedOn: "50W Marshall Plexi", category: "amp", characteristics: "50W Plexi with 6CA7 (fat-bottle EL34) power tubes. Slightly different character from standard EL34s with more low-end punch and smoother midrange." },
  { id: "plexi-50w-6ca7-jumped", label: "PLEXI 50W 6CA7 JUMPED", basedOn: "50W Marshall Plexi", category: "amp", characteristics: "Jumped channels on the 50W Plexi with 6CA7 tubes. Full, rich tone combining both channels with the unique 6CA7 power tube character." },
  { id: "plexi-50w-high-1", label: "PLEXI 50W HIGH 1", basedOn: "1967 50W Marshall Plexi", category: "amp", characteristics: "High input of a 1967 50W Plexi. Classic early Plexi tone with bright, cutting character. Lower wattage breaks up earlier for classic rock crunch." },
  { id: "plexi-50w-high-2", label: "PLEXI 50W HIGH 2", basedOn: "1967 50W Marshall Plexi", category: "amp", characteristics: "Alternate high input voicing of the 1967 50W Plexi. Slightly different gain structure providing a variation on the classic 50W Plexi sound." },
  { id: "plexi-50w-jumped", label: "PLEXI 50W JUMPED", basedOn: "50W Marshall Plexi 1987", category: "amp", characteristics: "Jumped channels on the 50W Plexi. Full-range vintage Marshall tone. Earlier breakup than 100W models. Classic British rock crunch." },
  { id: "plexi-50w-normal", label: "PLEXI 50W NORMAL", basedOn: "50W Marshall Plexi 1987", category: "amp", characteristics: "Normal channel of the 50W Plexi. Warm, dark, smooth breakup. Great for blues and classic rock rhythm tones." },
  { id: "plexi-studio-20", label: "PLEXI STUDIO 20", basedOn: "Marshall Studio Vintage SV20H (20W 1959 Plexi reissue)", category: "amp", characteristics: "20W version of the Plexi Super Lead. All the classic Plexi character in a lower-wattage format. Cranked Plexi tones at manageable volumes with EL34 power tubes." },

  // ═══════════════════════════════════════════
  // MARSHALL JTM / JCM 800
  // ═══════════════════════════════════════════

  { id: "brit-jm45", label: "BRIT JM45", basedOn: "Marshall JTM 45", category: "amp", characteristics: "The original Marshall. Based on the Fender Bassman circuit with British voicing. Warm, fat crunch. Predecessor to all Marshall designs." },
  { id: "brit-jm45-jumped", label: "BRIT JM45 JUMPED", basedOn: "Marshall JTM 45", category: "amp", characteristics: "Jumped channels on the JTM 45. Both channels linked for fuller frequency response. Rich, complex crunch with the warmth of the original Marshall circuit." },
  { id: "brit-800-2204-high", label: "BRIT 800 2204 HIGH", basedOn: "50W Marshall JCM 800 2204", category: "amp", characteristics: "High input of the 50W JCM 800 2204. Brighter, more aggressive voicing with more gain on tap. Tight, punchy, iconic 80s rock/metal tone." },
  { id: "brit-800-2204-low", label: "BRIT 800 2204 LOW", basedOn: "50W Marshall JCM 800 2204", category: "amp", characteristics: "Low input of the 50W JCM 800 2204. Reduced gain for cleaner tones. Darker voicing, great for crunch and classic rock rhythm." },
  { id: "brit-800-2203-high", label: "BRIT 800 2203 HIGH", basedOn: "100W Marshall JCM 800 2203 JMP", category: "amp", characteristics: "High input of the 100W JCM 800. More headroom than 2204, same aggressive character. The NWOBHM and early thrash standard." },
  { id: "brit-800-2203-low", label: "BRIT 800 2203 LOW", basedOn: "100W Marshall JCM 800 2203 JMP", category: "amp", characteristics: "Low input of the 100W JCM 800. Cleaner, more headroom. Good for crunchy rhythm tones and as a pedal platform." },
  { id: "brit-800-34", label: "BRIT 800 #34", basedOn: "50W Marshall JCM 800 with virtual Santiago #34 modifications", category: "amp", characteristics: "JCM 800 with virtual Santiago #34 modifications. Enhanced gain staging with tighter low-end. More modern voicing while retaining 800 character." },
  { id: "brit-800-mod", label: "BRIT 800 MOD", basedOn: "50W Marshall JCM 800 with virtual modifications", category: "amp", characteristics: "JCM 800 with virtual modifications for more gain and tighter response. Hot-rodded 800 character with extended gain range." },
  { id: "brit-800-studio-20", label: "BRIT 800 STUDIO 20", basedOn: "Marshall Studio Classic SC20H (20W JCM 800 2203)", category: "amp", characteristics: "20W version of the JCM 800 2203. All the aggressive JCM 800 character in a lower-wattage format. Same preamp topology as the full-size 2203 with a 20W power section using EL34 tubes." },

  // ═══════════════════════════════════════════
  // MARSHALL MODERN & OTHER
  // ═══════════════════════════════════════════

  { id: "brit-jvm-od1-green", label: "BRIT JVM OD1 GREEN", basedOn: "Marshall JVM410H", category: "amp", characteristics: "JVM OD1 channel Green mode. Low-gain crunch, the most Plexi-like JVM voicing. Clean to mild breakup with classic Marshall character." },
  { id: "brit-jvm-od1-orange", label: "BRIT JVM OD1 ORANGE", basedOn: "Marshall JVM410H", category: "amp", characteristics: "JVM OD1 channel Orange mode. Medium gain crunch. Classic 800-style gain with more modern refinement." },
  { id: "brit-jvm-od1-red", label: "BRIT JVM OD1 RED", basedOn: "Marshall JVM410H", category: "amp", characteristics: "JVM OD1 channel Red mode. Higher gain crunch. Hot-rodded Marshall tone with more saturation and compression." },
  { id: "brit-jvm-od2-green", label: "BRIT JVM OD2 GREEN", basedOn: "Marshall JVM410H", category: "amp", characteristics: "JVM OD2 channel Green mode. Medium-high gain. More aggressive than OD1 with tighter bass response." },
  { id: "brit-jvm-od2-orange", label: "BRIT JVM OD2 ORANGE", basedOn: "Marshall JVM410H", category: "amp", characteristics: "JVM OD2 channel Orange mode. High gain with modern Marshall voicing. Saturated, aggressive, great for modern rock and metal." },
  { id: "brit-jvm-od2-red", label: "BRIT JVM OD2 RED", basedOn: "Marshall JVM410H", category: "amp", characteristics: "JVM OD2 channel Red mode. Maximum gain JVM voicing. Extreme saturation with tight, focused response. Modern metal territory." },
  { id: "brit-silver", label: "BRIT SILVER", basedOn: "Marshall Silver Jubilee 2555", category: "amp", characteristics: "Marshall's 25th anniversary amp. Diode clipping option, switchable pentode/triode. Slash, Alex Lifeson tones. Distinctive compressed, singing character." },
  { id: "brit-brown", label: "BRIT BROWN", basedOn: "Custom model producing the Plexi 'Brown Sound'", category: "amp", characteristics: "Custom Fractal model capturing the 'Brown Sound' character. Hot-rodded Plexi voicing with extra gain and saturation. Eddie Van Halen-inspired tone." },
  { id: "brit-afs100-1", label: "BRIT AFS100 1", basedOn: "Marshall AFD100SCE", category: "amp", characteristics: "Slash's signature Marshall channel 1. Based on the modified Super Lead circuit. The Appetite For Destruction tone with singing sustain and harmonics." },
  { id: "brit-afs100-2", label: "BRIT AFS100 2", basedOn: "Marshall AFD100SCE", category: "amp", characteristics: "Slash's signature Marshall channel 2. Higher gain voicing with more saturation. Modern Slash lead tones with thick, vocal midrange." },
  { id: "brit-super", label: "BRIT SUPER", basedOn: "Marshall AFD100 schematics", category: "amp", characteristics: "Based on Marshall AFD100 schematics. Related to the Slash circuit but with different voicing and component values." },
  { id: "brit-pre", label: "BRIT PRE", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "Marshall's MIDI-controlled tube preamp. Dual-channel (Clean/OD), versatile studio workhorse. Used by many 90s rock players." },
  { id: "js410-crunch-orange", label: "JS410 CRUNCH ORANGE", basedOn: "Marshall JVM410HJS", category: "amp", characteristics: "Joe Satriani signature JVM Crunch channel Orange mode. Medium gain with vocal midrange. Tuned for Satriani's expressive lead style." },
  { id: "js410-crunch-red", label: "JS410 CRUNCH RED", basedOn: "Marshall JVM410HJS", category: "amp", characteristics: "Joe Satriani signature JVM Crunch channel Red mode. Higher gain crunch with more saturation. Aggressive, singing lead tones." },
  { id: "js410-lead-green", label: "JS410 LEAD GREEN", basedOn: "Marshall JVM410HJS", category: "amp", characteristics: "Joe Satriani signature JVM Lead channel Green mode. Medium-high gain lead voicing. Smooth, articulate with excellent note definition." },
  { id: "js410-lead-orange", label: "JS410 LEAD ORANGE", basedOn: "Marshall JVM410HJS", category: "amp", characteristics: "Joe Satriani signature JVM Lead channel Orange mode. High gain with liquid sustain. Rich, complex harmonics for expressive soloing." },
  { id: "js410-lead-red", label: "JS410 LEAD RED", basedOn: "Marshall JVM410HJS", category: "amp", characteristics: "Joe Satriani signature JVM Lead channel Red mode. Maximum gain with extreme sustain and compression. Soaring, singing lead tone." },
  { id: "jmpre-1-clean-1", label: "JMPRE-1 CLEAN 1", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Clean 1 setting. Bright, chimey clean tone. The cleaner side of Marshall's MIDI rack preamp." },
  { id: "jmpre-1-clean-1-bass-shift", label: "JMPRE-1 CLEAN 1 BASS SHIFT", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Clean 1 with Bass Shift engaged. Adds low-end depth and warmth to the clean channel for a fuller, rounder tone." },
  { id: "jmpre-1-clean-2", label: "JMPRE-1 CLEAN 2", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Clean 2 setting. Slightly different voicing from Clean 1 with more warmth and body." },
  { id: "jmpre-1-clean-2-bass-shift", label: "JMPRE-1 CLEAN 2 BASS SHIFT", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Clean 2 with Bass Shift engaged. Fuller low-end for a thicker, warmer clean tone." },
  { id: "jmpre-1-od1", label: "JMPRE-1 OD1", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Overdrive 1 setting. Medium gain Marshall crunch. Classic rock tones from the rack preamp era." },
  { id: "jmpre-1-od1-bass-shift", label: "JMPRE-1 OD1 BASS SHIFT", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Overdrive 1 with Bass Shift. Adds low-end body to the overdrive channel for heavier crunch tones." },
  { id: "jmpre-1-od2", label: "JMPRE-1 OD2", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Overdrive 2 setting. Higher gain with more saturation. The hot-rodded Marshall rack preamp tone." },
  { id: "jmpre-1-od2-bass-shift", label: "JMPRE-1 OD2 BASS SHIFT", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Overdrive 2 with Bass Shift. Maximum gain JMP-1 tone with added low-end depth for heavier applications." },

  // ═══════════════════════════════════════════
  // EVH / 5150
  // ═══════════════════════════════════════════

  { id: "5153-100w-blue", label: "5153 100W BLUE", basedOn: "EVH 5150-III", category: "amp", characteristics: "Clean/crunch channel. Fender-ish cleans with hot-rod capabilities. Very versatile from sparkling clean to edge-of-breakup." },
  { id: "5153-100w-green", label: "5153 100W GREEN", basedOn: "EVH 5150-III", category: "amp", characteristics: "Medium gain crunch channel. Great for classic rock tones. Bridge between clean and high gain with rich harmonics." },
  { id: "5153-100w-red", label: "5153 100W RED", basedOn: "EVH 5150-III", category: "amp", characteristics: "Eddie Van Halen's modern high-gain. Tight, aggressive, very defined palm mutes. Modern rock/metal standard with singing lead tones." },
  { id: "5153-100w-stealth-blue", label: "5153 100W STEALTH BLUE", basedOn: "EVH 5150III 100S 100W", category: "amp", characteristics: "Stealth edition Blue channel. Slightly different voicing from standard 5153 with refined high-frequency response and improved clarity." },
  { id: "5153-100w-stealth-green", label: "5153 100W STEALTH GREEN", basedOn: "EVH 5150III 100S 100W", category: "amp", characteristics: "Stealth edition Green channel. Tighter crunch with more modern voicing than standard. Enhanced midrange articulation." },
  { id: "5153-100w-stealth-red", label: "5153 100W STEALTH RED", basedOn: "EVH 5150III 100S 100W", category: "amp", characteristics: "Stealth edition Red channel. Tighter, more focused high-gain than standard Red. Modern metal favorite with surgical precision." },
  { id: "5153-50w-blue", label: "5153 50W BLUE", basedOn: "EVH 5150-III 50W", category: "amp", characteristics: "50W version Blue channel. Same character as 100W, slightly earlier breakup due to lower wattage. Great for cranked clean and crunch tones." },
  { id: "pvh-6160-block", label: "PVH 6160 BLOCK", basedOn: "Peavey 'Block Letter' EVH 5150", category: "amp", characteristics: "The original Peavey 5150. Legendary high-gain amp co-designed with Eddie Van Halen. Aggressive, raw, saturated tone. The 90s metal/rock standard." },
  { id: "pvh-6160-block-crunch", label: "PVH 6160 BLOCK CRUNCH", basedOn: "Peavey 'Block Letter' EVH 5150", category: "amp", characteristics: "Crunch channel of the original block-letter 5150. Medium gain with raw, aggressive character. Great for rhythm tones and classic rock." },
  { id: "pvh-6160-plus-clean", label: "PVH 6160+ CLEAN", basedOn: "Peavey 6505+ / EVH 5150-II", category: "amp", characteristics: "Clean channel of the 6505+/5150 II. Improved clean channel over the original. Warm, usable cleans with decent headroom." },
  { id: "pvh-6160-plus-clean-bright", label: "PVH 6160+ CLEAN BRIGHT", basedOn: "Peavey 6505+ / EVH 5150-II", category: "amp", characteristics: "Clean channel with Bright switch on the 6505+. Added treble presence and sparkle for more cutting clean tones." },
  { id: "pvh-6160-plus-crunch", label: "PVH 6160+ CRUNCH", basedOn: "Peavey 6505+ / EVH 5150-II", category: "amp", characteristics: "Crunch channel of the 6505+. Medium-high gain with the signature 5150 aggression. Tighter than the original block letter." },
  { id: "pvh-6160-plus-crunch-bright", label: "PVH 6160+ CRUNCH BRIGHT", basedOn: "Peavey 6505+ / EVH 5150-II", category: "amp", characteristics: "Crunch channel with Bright switch on the 6505+. More top-end cut and presence for a more aggressive crunch tone." },
  { id: "pvh-6160-plus-lead", label: "PVH 6160+ LEAD", basedOn: "Peavey 6505+ / EVH 5150-II", category: "amp", characteristics: "Lead channel of the 6505+. Maximum gain with tight, aggressive voicing. Modern metal and hard rock standard with crushing palm mutes." },

  // ═══════════════════════════════════════════
  // MESA BOOGIE
  // ═══════════════════════════════════════════

  { id: "usa-mk-iic-plus", label: "USA MK IIC+", basedOn: "MESA/Boogie Mark IIC+", category: "amp", characteristics: "The most sought-after Mesa. Tight, aggressive lead channel. The Metallica Master of Puppets tone. Heavy low-end, searing highs, legendary sustain." },
  { id: "usa-mk-iic-plus-bright", label: "USA MK IIC+ BRIGHT", basedOn: "MESA/Boogie Mark IIC+", category: "amp", characteristics: "Mark IIC+ with Bright switch engaged. More treble presence and cut. Enhanced high-frequency detail for more articulate lead tones." },
  { id: "usa-mk-iic-plus-deep", label: "USA MK IIC+ DEEP", basedOn: "MESA/Boogie Mark IIC+", category: "amp", characteristics: "Mark IIC+ with Deep switch engaged. Extended low-end response for a bigger, fuller sound. More bass depth while retaining the IIC+ character." },
  { id: "usa-mk-iic-plus-deep-bright", label: "USA MK IIC+ DEEP BRIGHT", basedOn: "MESA/Boogie Mark IIC+", category: "amp", characteristics: "Mark IIC+ with both Deep and Bright switches engaged. Full-range enhancement with extended bass and treble. Maximum frequency range from the IIC+." },
  { id: "usa-jp-iic-plus-green", label: "USA JP IIC+ GREEN", basedOn: "MESA/Boogie JP-2C", category: "amp", characteristics: "John Petrucci's signature JP-2C Green mode. Clean to low gain. Warm, articulate cleans with the IIC+ topology. Dream Theater clean tones." },
  { id: "usa-jp-iic-plus-red", label: "USA JP IIC+ RED", basedOn: "MESA/Boogie JP-2C", category: "amp", characteristics: "JP-2C Red mode. High-gain lead channel with tighter, more modern voicing than the original IIC+. Extended gain range for modern progressive metal." },
  { id: "usa-jp-iic-plus-red-shred", label: "USA JP IIC+ RED SHRED", basedOn: "MESA/Boogie JP-2C", category: "amp", characteristics: "JP-2C Red mode with Shred engaged. Maximum gain and compression. Ultra-saturated lead tone for extreme sustain and liquid feel." },
  { id: "usa-jp-iic-plus-yellow", label: "USA JP IIC+ YELLOW", basedOn: "MESA/Boogie JP-2C", category: "amp", characteristics: "JP-2C Yellow mode. Medium-gain crunch channel. Vintage-inspired voicing within the IIC+ framework. Great for crunchy rhythm tones." },
  { id: "usa-jp-iic-plus-yellow-shred", label: "USA JP IIC+ YELLOW SHRED", basedOn: "MESA/Boogie JP-2C", category: "amp", characteristics: "JP-2C Yellow mode with Shred engaged. Enhanced gain on the crunch channel. More saturated vintage-style tones with added sustain." },
  { id: "usa-metro-blues", label: "USA METRO BLUES", basedOn: "MESA Subway Blues", category: "amp", characteristics: "Mesa Subway Blues combo. Compact, EL84-powered Mesa with warm, bluesy crunch. Great for smaller venues with classic American tone." },
  { id: "usa-bass-400-1", label: "USA BASS 400 1", basedOn: "MESA Bass 400 bass amp", category: "amp", characteristics: "Mesa Bass 400 channel 1. Massive tube bass amp with huge low-end. Warm, punchy, with natural tube compression. Bass player's dream." },
  { id: "usa-bass-400-2", label: "USA BASS 400 2", basedOn: "MESA Bass 400 bass amp", category: "amp", characteristics: "Mesa Bass 400 channel 2. Different voicing from channel 1 with more midrange presence. Great for cutting through a mix with authority." },
  { id: "recto1-orange-modern", label: "RECTO1 ORANGE MODERN", basedOn: "MESA Dual Rectifier (2-channel)", category: "amp", characteristics: "2-channel Dual Rectifier Orange channel Modern mode. Classic Recto crunch with modern voicing. Tight, aggressive, mid-scooped character." },
  { id: "recto1-orange-normal", label: "RECTO1 ORANGE NORMAL", basedOn: "MESA Dual Rectifier (2-channel)", category: "amp", characteristics: "2-channel Dual Rectifier Orange channel Normal mode. More open and dynamic Recto voicing. Earlier breakup with vintage-leaning character." },
  { id: "recto1-red", label: "RECTO1 RED", basedOn: "MESA Dual Rectifier (2-channel)", category: "amp", characteristics: "2-channel Dual Rectifier Red channel. High-gain Recto tone from the original 2-channel version. Massive, saturated, the original nu-metal tone." },
  { id: "recto2-orange-modern", label: "RECTO2 ORANGE MODERN", basedOn: "MESA Dual Rectifier (3-channel)", category: "amp", characteristics: "3-channel Dual Rectifier Orange channel Modern mode. Medium-high gain with Recto character. Updated voicing from the 3-channel revision." },
  { id: "recto2-orange-vintage", label: "RECTO2 ORANGE VINTAGE", basedOn: "MESA Dual Rectifier (3-channel)", category: "amp", characteristics: "3-channel Dual Rectifier Orange channel Vintage mode. Classic rock feel with Recto character. More midrange and note definition." },
  { id: "recto2-red-modern", label: "RECTO2 RED MODERN", basedOn: "MESA Dual Rectifier (3-channel)", category: "amp", characteristics: "3-channel Dual Rectifier Red channel Modern mode. Maximum gain Recto voicing. Massive, saturated, scooped. The modern metal standard." },
  { id: "recto2-red-vintage", label: "RECTO2 RED VINTAGE", basedOn: "MESA Dual Rectifier (3-channel)", category: "amp", characteristics: "3-channel Dual Rectifier Red channel Vintage mode. Less saturated, more midrange than Modern. Tighter feel with better note definition." },
  { id: "texas-star-clean", label: "TEXAS STAR CLEAN", basedOn: "MESA Lone Star Classic", category: "amp", characteristics: "Mesa Lone Star Classic clean channel. Lush, warm, Fender-influenced clean tones. EL84 or 6L6 power tube options. Beautiful reverb and shimmer." },
  { id: "texas-star-lead", label: "TEXAS STAR LEAD", basedOn: "MESA Lone Star Classic", category: "amp", characteristics: "Mesa Lone Star Classic lead channel. Smooth, singing overdrive with Fender-influenced voicing. Great for blues, country, and classic rock lead work." },
  { id: "triple-crest-2", label: "TRIPLE CREST 2", basedOn: "MESA Triple Crown TC-100", category: "amp", characteristics: "Triple Crown channel 2. Medium-high gain with British-inspired voicing. Versatile crunch to hard rock territory with Mesa refinement." },
  { id: "triple-crest-3", label: "TRIPLE CREST 3", basedOn: "MESA Triple Crown TC-100", category: "amp", characteristics: "Triple Crown channel 3. High-gain channel with tight, modern voicing. Aggressive, focused tone for metal and modern rock." },
  { id: "thordendal-modern", label: "THORDENDAL MODERN", basedOn: "Custom model based on MESA Dual Rectifier", category: "amp", characteristics: "Fredrik Thordendal's custom Recto-based model with Modern voicing. Extreme tight bass, massive gain. Designed for djent and progressive metal with 8-string guitars." },
  { id: "thordendal-vintage", label: "THORDENDAL VINTAGE", basedOn: "Custom model based on MESA Dual Rectifier", category: "amp", characteristics: "Thordendal's custom model with Vintage voicing. More open and dynamic than Modern mode. Still heavy but with more vintage Recto character." },
  { id: "legend-100", label: "LEGEND 100", basedOn: "Carvin Legacy VL100", category: "amp", characteristics: "Steve Vai's signature Carvin Legacy 100W. Versatile 3-channel design with clean, medium, and high gain. Balanced EQ with smooth, articulate character." },
  { id: "legend-100-ii", label: "LEGEND 100 II", basedOn: "Carvin Legacy VL300", category: "amp", characteristics: "Updated Steve Vai signature Legacy. More refined tone shaping with improved gain stages. Versatile from sparkling cleans to saturated leads." },

  // ═══════════════════════════════════════════
  // SOLDANO
  // ═══════════════════════════════════════════

  { id: "solo-100-clean", label: "SOLO 100 CLEAN", basedOn: "Soldano SLO-100", category: "amp", characteristics: "SLO-100 Clean channel. Bright, chimey, Fender-like cleans from a high-gain amp. Surprisingly versatile clean tones with sparkle and definition." },
  { id: "solo-100-lead", label: "SOLO 100 LEAD", basedOn: "Soldano SLO-100", category: "amp", characteristics: "SLO-100 Lead channel. Legendary smooth, liquid lead tone with singing sustain. Defined low-end, vocal midrange. The quintessential 80s/90s high-gain lead." },
  { id: "solo-100-rhythm", label: "SOLO 100 RHYTHM", basedOn: "Soldano SLO-100", category: "amp", characteristics: "SLO-100 Crunch/Rhythm channel. Medium gain with the SLO character. Great for tight, punchy rhythm work and classic rock tones." },
  { id: "solo-88-clean", label: "SOLO 88 CLEAN", basedOn: "Soldano X88R preamp", category: "amp", characteristics: "Soldano X88R Clean channel. Studio-quality clean tones from Soldano's rack preamp. Warm, articulate, with excellent definition." },
  { id: "solo-88-lead", label: "SOLO 88 LEAD", basedOn: "Soldano X88R preamp", category: "amp", characteristics: "Soldano X88R Lead channel. Smooth, singing lead tones from the rack preamp. Soldano's liquid sustain in a studio-friendly format." },
  { id: "solo-88-rhythm", label: "SOLO 88 RHYTHM", basedOn: "Soldano X88R preamp", category: "amp", characteristics: "Soldano X88R Rhythm channel. Medium gain crunch with Soldano character. Tight, punchy rhythm tones from the rack preamp." },
  { id: "solo-99-clean", label: "SOLO 99 CLEAN", basedOn: "Soldano/Caswell X99 preamp", category: "amp", characteristics: "Soldano X99 Clean channel. Versatile clean tones from the multi-channel preamp. Warm and articulate." },
  { id: "solo-99-lead", label: "SOLO 99 LEAD", basedOn: "Soldano/Caswell X99 preamp", category: "amp", characteristics: "Soldano X99 Lead channel. High-gain lead tones with more gain options than the SLO. Smooth, saturated sustain." },
  { id: "solo-99-lead-bright", label: "SOLO 99 LEAD BRIGHT", basedOn: "Soldano/Caswell X99 preamp", category: "amp", characteristics: "Soldano X99 Lead channel with Bright mode. Enhanced treble presence for more cutting lead tones with added definition and clarity." },

  // ═══════════════════════════════════════════
  // FRIEDMAN
  // ═══════════════════════════════════════════

  { id: "friedman-be-2010", label: "FRIEDMAN BE 2010", basedOn: "Friedman BE-100", category: "amp", characteristics: "2010 revision of the Friedman BE-100. Very high gain, tight low-end, aggressive midrange. Modern high-gain rock/metal with hot-rodded Marshall DNA." },
  { id: "friedman-be-c45", label: "FRIEDMAN BE C45", basedOn: "Friedman BE-100", category: "amp", characteristics: "BE-100 with C45 voicing. Modified frequency response for a different tonal balance. Tighter, more focused than standard BE voicing." },
  { id: "friedman-be-v1", label: "FRIEDMAN BE V1", basedOn: "Friedman BE-100", category: "amp", characteristics: "BE-100 V1 (version 1). Original Friedman BE voicing. Classic hot-rodded Marshall on steroids with massive gain and tight response." },
  { id: "friedman-be-v1-fat", label: "FRIEDMAN BE V1 FAT", basedOn: "Friedman BE-100", category: "amp", characteristics: "BE-100 V1 with Fat mode. Added low-end depth and midrange body. Thicker, heavier sound for denser rhythm tones." },
  { id: "friedman-be-v2", label: "FRIEDMAN BE V2", basedOn: "Friedman BE-100", category: "amp", characteristics: "BE-100 V2 revision. Refined gain structure with improved clarity. Updated component values for a more modern feel." },
  { id: "friedman-be-v3", label: "FRIEDMAN BE V3", basedOn: "Friedman BE-100", category: "amp", characteristics: "BE-100 V3 revision. Latest evolution of the BE circuit. Most refined version with improved dynamic response and tonal balance." },
  { id: "friedman-hbe-2010", label: "FRIEDMAN HBE 2010", basedOn: "Friedman HBE", category: "amp", characteristics: "2010 revision of the HBE (Hairy Brown Eye). Even more saturation and compression than BE. Extended gain range for extreme applications." },
  { id: "friedman-hbe-c45", label: "FRIEDMAN HBE C45", basedOn: "Friedman HBE", category: "amp", characteristics: "HBE with C45 voicing. Modified frequency response for a different tonal balance. Tighter and more focused than standard HBE." },
  { id: "friedman-hbe-v1", label: "FRIEDMAN HBE V1", basedOn: "Friedman HBE", category: "amp", characteristics: "HBE V1, the original high-gain Friedman. Maximum saturation with thick, compressed character. Wall of gain for heavy music." },
  { id: "friedman-hbe-v1-fat", label: "FRIEDMAN HBE V1 FAT", basedOn: "Friedman HBE", category: "amp", characteristics: "HBE V1 with Fat mode engaged. Massive low-end and midrange. Extremely thick, heavy tone for the heaviest applications." },
  { id: "friedman-hbe-v2", label: "FRIEDMAN HBE V2", basedOn: "Friedman HBE", category: "amp", characteristics: "HBE V2 revision. Updated gain staging with improved clarity at high gain settings. More articulate than V1." },
  { id: "friedman-hbe-v3", label: "FRIEDMAN HBE V3", basedOn: "Friedman HBE", category: "amp", characteristics: "HBE V3, the latest revision. Most refined version with the best dynamic response. Clearer note articulation even at extreme gain." },
  { id: "friedman-small-box", label: "FRIEDMAN SMALL BOX", basedOn: "Friedman Smallbox", category: "amp", characteristics: "50W EL34 Friedman. More Marshall-like than BE, with a tighter, more focused sound. Great for classic rock to hard rock with vintage-inspired character." },
  { id: "dirty-shirley-1", label: "DIRTY SHIRLEY 1", basedOn: "40W Friedman Dirty Shirley", category: "amp", characteristics: "Friedman's Plexi/JTM-45 inspired design. Lower gain than BE but with rich, fat tone. Cleans up beautifully with guitar volume. Vintage classic rock character." },
  { id: "dirty-shirley-2", label: "DIRTY SHIRLEY 2", basedOn: "40W Friedman Dirty Shirley", category: "amp", characteristics: "Alternate voicing of the Dirty Shirley with different component values. Slightly more aggressive than model 1 with different gain structure." },

  // ═══════════════════════════════════════════
  // CAMERON
  // ═══════════════════════════════════════════

  { id: "cameron-ccv-1a", label: "CAMERON CCV 1A", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Cameron CCV Channel 1A. Clean to mild crunch. Mark Cameron's hot-rodded Marshall with Plexi heritage. Open, dynamic, touch-sensitive." },
  { id: "cameron-ccv-1b", label: "CAMERON CCV 1B", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Cameron CCV Channel 1B. Slightly different voicing from 1A. More gain on tap with varied frequency response." },
  { id: "cameron-ccv-2a", label: "CAMERON CCV 2A", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Cameron CCV Channel 2A. Higher gain setting. Tight, aggressive crunch with refined Marshall character. Great for hard rock." },
  { id: "cameron-ccv-2b", label: "CAMERON CCV 2B", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Cameron CCV Channel 2B. High gain with different voicing than 2A. More saturated, singing lead character." },
  { id: "cameron-ccv-2c", label: "CAMERON CCV 2C", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Cameron CCV Channel 2C. Higher gain variant with more compression. Thick, saturated tone for heavy rhythm and leads." },
  { id: "cameron-ccv-2d", label: "CAMERON CCV 2D", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Cameron CCV Channel 2D. Maximum gain setting. Crushing high-gain with tight, focused response. Cameron's heaviest voicing." },
  { id: "atomica-high", label: "ATOMICA HIGH", basedOn: "Cameron Atomica", category: "amp", characteristics: "Cameron Atomica high gain channel. Tight, aggressive, modern voicing. High-gain metal tones with extreme precision." },
  { id: "atomica-low", label: "ATOMICA LOW", basedOn: "Cameron Atomica", category: "amp", characteristics: "Cameron Atomica low gain channel. More crunch-oriented, dynamic response. Great for rhythm work and classic rock tones." },

  // ═══════════════════════════════════════════
  // BOGNER
  // ═══════════════════════════════════════════

  { id: "euro-blue", label: "EURO BLUE", basedOn: "Bogner Ecstasy 20th Anniversary", category: "amp", characteristics: "Bogner Ecstasy Blue channel. Beautiful crunch, very dynamic. Excellent clean-to-crunch range with refined European voicing." },
  { id: "euro-blue-modern", label: "EURO BLUE MODERN", basedOn: "Bogner Ecstasy 20th Anniversary", category: "amp", characteristics: "Ecstasy Blue channel Modern mode. Tighter bass, more aggressive midrange. Modern rock voicing from the Blue channel." },
  { id: "euro-red", label: "EURO RED", basedOn: "Bogner Ecstasy 20th Anniversary", category: "amp", characteristics: "Bogner Ecstasy Red channel. Refined high-gain with smooth, articulate character. Complex harmonics and singing sustain." },
  { id: "euro-red-modern", label: "EURO RED MODERN", basedOn: "Bogner Ecstasy 20th Anniversary", category: "amp", characteristics: "Ecstasy Red channel Modern mode. Tighter, more aggressive high-gain. Modern metal and hard rock with Bogner refinement." },
  { id: "euro-uber", label: "EURO UBER", basedOn: "Bogner Uberschall", category: "amp", characteristics: "Bogner's high-gain monster. Extremely tight bass response, aggressive midrange. Designed for modern heavy tones with EL34 power tubes." },
  { id: "shiver-clean", label: "SHIVER CLEAN", basedOn: "Bogner Shiva 20th Anniversary", category: "amp", characteristics: "Bogner Shiva clean channel. Crystalline, bell-like cleans with EL34 warmth. Beautiful, shimmering clean tones with British character." },
  { id: "shiver-lead", label: "SHIVER LEAD", basedOn: "Bogner Shiva 20th Anniversary", category: "amp", characteristics: "Bogner Shiva lead channel. Smooth, creamy gain with excellent note articulation. Classic rock to hard rock with refined European voicing." },
  { id: "bogfish-brown", label: "BOGFISH BROWN", basedOn: "Bogner Fish preamp", category: "amp", characteristics: "Bogner Fish preamp Brown channel. Rich, complex harmonic content with warm, saturated overdrive. Boutique preamp character." },
  { id: "bogfish-strato", label: "BOGFISH STRATO", basedOn: "Bogner Fish preamp", category: "amp", characteristics: "Bogner Fish preamp Strato channel. Brighter, more Fender-inspired voicing from the Bogner preamp. Clean to moderate gain with articulate response." },

  // ═══════════════════════════════════════════
  // DIEZEL
  // ═══════════════════════════════════════════

  { id: "dizzy-v4-blue-2", label: "DIZZY V4 BLUE 2", basedOn: "Diezel VH4", category: "amp", characteristics: "VH4 Blue (clean) channel, position 2. Warm, clean Diezel tone with German precision. Excellent clean headroom and definition." },
  { id: "dizzy-v4-blue-3", label: "DIZZY V4 BLUE 3", basedOn: "Diezel VH4", category: "amp", characteristics: "VH4 Blue channel, position 3. Slightly more gain than position 2. Edge-of-breakup clean with touch sensitivity." },
  { id: "dizzy-v4-blue-4", label: "DIZZY V4 BLUE 4", basedOn: "Diezel VH4", category: "amp", characteristics: "VH4 Blue channel, position 4. Most gain from the clean channel. Warm crunch that retains the clean channel's character." },
  { id: "dizzy-v4-silver-2", label: "DIZZY V4 SILVER 2", basedOn: "Diezel VH4", category: "amp", characteristics: "VH4 Silver (gain) channel, position 2. Medium gain with tight, focused Diezel character. Aggressive midrange with surgical precision." },
  { id: "dizzy-v4-silver-3", label: "DIZZY V4 SILVER 3", basedOn: "Diezel VH4", category: "amp", characteristics: "VH4 Silver channel, position 3. High gain with crushing, tight response. Modern metal monster with extreme note definition." },
  { id: "dizzy-v4-silver-4", label: "DIZZY V4 SILVER 4", basedOn: "Diezel VH4", category: "amp", characteristics: "VH4 Silver channel, position 4. Maximum gain from the VH4. Massive, saturated, ultra-tight. The ultimate modern metal tone." },
  { id: "herbie-ch2-plus", label: "HERBIE CH2+", basedOn: "Diezel Herbert", category: "amp", characteristics: "Diezel Herbert Channel 2+. Medium-high gain with more midrange flexibility than VH4. Versatile crunch to high-gain range." },
  { id: "herbie-ch2-minus", label: "HERBIE CH2-", basedOn: "Diezel Herbert", category: "amp", characteristics: "Diezel Herbert Channel 2-. Reduced gain version of Ch2. Great for crunch and classic rock with Diezel precision." },
  { id: "herbie-ch3", label: "HERBIE CH3", basedOn: "Diezel Herbert", category: "amp", characteristics: "Diezel Herbert Channel 3. High-gain lead channel. Smooth, saturated, with the Herbert's distinctive midrange character." },
  { id: "herbie-mk3", label: "HERBIE MK3", basedOn: "Diezel Herbert MKIII", category: "amp", characteristics: "Herbert MKIII revision. Updated circuit with refined gain structure. More modern voicing with improved clarity and dynamic response." },
  { id: "das-metall", label: "DAS METALL", basedOn: "Diezel VH4 schematics", category: "amp", characteristics: "Modeled from VH4 schematics. Fan-favorite for modern metal. Tighter and bassier than a Recto with massive low-end and surgical highs." },

  // ═══════════════════════════════════════════
  // ENGL
  // ═══════════════════════════════════════════

  { id: "angle-severe-1", label: "ANGLE SEVERE 1", basedOn: "Engl Savage 120", category: "amp", characteristics: "Engl Savage 120 channel 1. German high-gain precision. Tight, articulate with multiple gain stages. Well-suited for technical metal." },
  { id: "angle-severe-2", label: "ANGLE SEVERE 2", basedOn: "Engl Savage 120", category: "amp", characteristics: "Engl Savage 120 channel 2. Higher gain with more saturation. Crushing, precise, tight response for extreme metal and progressive styles." },
  { id: "energyball", label: "ENERGYBALL", basedOn: "Engl Powerball", category: "amp", characteristics: "Four-channel German high-gain amp. Extremely tight bass, massive gain on tap. Modern metal machine with versatile clean channel." },

  // ═══════════════════════════════════════════
  // VOX / CLASS A
  // ═══════════════════════════════════════════

  { id: "class-a-15w-tb", label: "CLASS-A 15W TB", basedOn: "Vox AC15 Top Boost", category: "amp", characteristics: "15W Class A Vox with Top Boost. Warmer, more compressed than AC30. Earlier breakup with chimey, jangly character. Great for blues and indie." },
  { id: "class-a-30w", label: "CLASS-A 30W", basedOn: "Vox AC30", category: "amp", characteristics: "Classic 30W Class A Vox. Chimey cleans, complex breakup with rich harmonics. The Beatles, Brian May, The Edge tone." },
  { id: "class-a-30w-bright", label: "CLASS-A 30W BRIGHT", basedOn: "Vox AC30", category: "amp", characteristics: "AC30 Bright channel. Enhanced treble and presence. Jangly, chimey, with more top-end sparkle for cutting through a mix." },
  { id: "class-a-30w-brilliant", label: "CLASS-A 30W BRILLIANT", basedOn: "Vox AC30", category: "amp", characteristics: "AC30 Brilliant channel. Maximum brightness and treble emphasis. Sparkling, glassy cleans with pronounced high-frequency content." },
  { id: "class-a-30w-hot", label: "CLASS-A 30W HOT", basedOn: "Vox AC30", category: "amp", characteristics: "AC30 with hotter biased tubes. More gain, earlier breakup, increased compression. Drives into rich, complex overdrive sooner." },
  { id: "class-a-30w-tb", label: "CLASS-A 30W TB", basedOn: "Vox AC30", category: "amp", characteristics: "AC30 Top Boost channel. The most popular AC30 voicing. Added treble and bass controls with extra gain stage. Rich, harmonically complex crunch." },
  { id: "ac-20-12ax7-bass", label: "AC-20 12AX7 BASS", basedOn: "Morgan AC20 Deluxe", category: "amp", characteristics: "Morgan AC20 with 12AX7 preamp tube, Bass channel. Warmer, rounder voicing. Vox-inspired boutique with its own refined character." },
  { id: "ac-20-12ax7-treble", label: "AC-20 12AX7 TREBLE", basedOn: "Morgan AC20 Deluxe", category: "amp", characteristics: "Morgan AC20 with 12AX7 preamp tube, Treble channel. Brighter, more chimey voicing. Articulate cleans and sparkling breakup." },
  { id: "ac-20-ef86-bass", label: "AC-20 EF86 BASS", basedOn: "Morgan AC20 Deluxe", category: "amp", characteristics: "Morgan AC20 with EF86 preamp tube, Bass channel. The EF86 adds unique harmonic richness. Warm, fat tone with vintage character." },
  { id: "ac-20-ef86-treble", label: "AC-20 EF86 TREBLE", basedOn: "Morgan AC20 Deluxe", category: "amp", characteristics: "Morgan AC20 with EF86 preamp tube, Treble channel. EF86 harmonic complexity with brighter voicing. Chimey, detailed, uniquely responsive." },

  // ═══════════════════════════════════════════
  // ORANGE
  // ═══════════════════════════════════════════

  { id: "citrus-a30-clean", label: "CITRUS A30 CLEAN", basedOn: "Orange AD30HTC", category: "amp", characteristics: "Orange AD30 Clean channel. Rich, warm British tone with Class A character. Warm cleans with harmonic complexity." },
  { id: "citrus-a30-dirty", label: "CITRUS A30 DIRTY", basedOn: "Orange AD30HTC", category: "amp", characteristics: "Orange AD30 Dirty channel. Crunchy, aggressive British overdrive. More gain than typical Class A designs with thick, gritty character." },
  { id: "citrus-bass-200", label: "CITRUS BASS 200", basedOn: "Orange AD200B bass amp", category: "amp", characteristics: "200W all-tube bass amp. Huge, round, warm bass tone. Class A/B with 4x 6550 power tubes. Massive low-end authority." },
  { id: "citrus-rv50", label: "CITRUS RV50", basedOn: "Orange Rockerverb 50 MK II", category: "amp", characteristics: "Orange Rockerverb 50W. Two channels from clean to high gain. Distinctive Orange voicing with thick midrange and aggressive crunch. Built-in reverb." },
  { id: "citrus-terrier", label: "CITRUS TERRIER", basedOn: "Orange Tiny Terror", category: "amp", characteristics: "Simple British tone machine. 7/15W switchable. Great crunch at low volumes. Responsive to pick dynamics with that distinctive Orange midrange." },

  // ═══════════════════════════════════════════
  // HIWATT
  // ═══════════════════════════════════════════

  { id: "hipower-brilliant", label: "HIPOWER BRILLIANT", basedOn: "Hiwatt DR103", category: "amp", characteristics: "Hiwatt DR103 Brilliant channel. Massive clean headroom with crystalline highs. The Pete Townshend and David Gilmour foundation tone. Stays clean very loud." },
  { id: "hipower-jumped", label: "HIPOWER JUMPED", basedOn: "Hiwatt DR103", category: "amp", characteristics: "Hiwatt DR103 with jumped channels. Both channels combined for fuller frequency response. Adds warmth and complexity to the Hiwatt's pristine character." },
  { id: "hipower-normal", label: "HIPOWER NORMAL", basedOn: "Hiwatt DR103", category: "amp", characteristics: "Hiwatt DR103 Normal channel. Warmer, darker voicing than Brilliant. Smooth, round character with the Hiwatt's legendary headroom and clarity." },

  // ═══════════════════════════════════════════
  // PRS
  // ═══════════════════════════════════════════

  { id: "archean", label: "ARCHEAN", basedOn: "100W PRS Archon", category: "amp", characteristics: "PRS Archon 100W. Versatile from clean to crushing. Balanced EQ with tight low-end. Modern high-gain design with refined voicing." },
  { id: "archean-bright", label: "ARCHEAN BRIGHT", basedOn: "100W PRS Archon", category: "amp", characteristics: "PRS Archon with Bright switch. Enhanced treble presence for more cut and definition. Adds sparkle and clarity to the Archon's balanced tone." },
  { id: "archean-clean", label: "ARCHEAN CLEAN", basedOn: "100W PRS Archon", category: "amp", characteristics: "PRS Archon clean channel. Warm, clear cleans with excellent headroom. Surprisingly versatile clean tones from a high-gain amp." },

  // ═══════════════════════════════════════════
  // REVV
  // ═══════════════════════════════════════════

  { id: "revv-gen-green-1", label: "REVV GEN GREEN 1", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Green channel, position 1. Clean to low crunch. Modern, tight, with excellent clarity. The foundation clean tone." },
  { id: "revv-gen-green-2", label: "REVV GEN GREEN 2", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Green channel, position 2. Light crunch with dynamic response. Edge-of-breakup tones with modern refinement." },
  { id: "revv-gen-green-3", label: "REVV GEN GREEN 3", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Green channel, position 3. Medium crunch with more gain. Great for classic rock and blues with a modern feel." },
  { id: "revv-gen-purple-1", label: "REVV GEN PURPLE 1", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Purple channel, position 1. Medium gain with aggressive character. Modern high-gain voicing with tight response." },
  { id: "revv-gen-purple-2", label: "REVV GEN PURPLE 2", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Purple channel, position 2. High gain with crushing, tight response. Aggressive modern metal tone with articulate note definition." },
  { id: "revv-gen-purple-3", label: "REVV GEN PURPLE 3", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Purple channel, position 3. Maximum gain from the Purple channel. Extreme saturation with tight, focused low-end." },
  { id: "revv-gen-red-1", label: "REVV GEN RED 1", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Red channel, position 1. High gain lead voicing. Smooth, singing sustain with aggressive attack. Modern metal leads." },
  { id: "revv-gen-red-2", label: "REVV GEN RED 2", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Red channel, position 2. Very high gain with extreme saturation. Massive, crushing tone for the heaviest applications." },
  { id: "revv-gen-red-3", label: "REVV GEN RED 3", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Red channel, position 3. Maximum gain and saturation. Ultra-high-gain for extreme metal with tight, defined response." },

  // ═══════════════════════════════════════════
  // DUMBLE / ODS
  // ═══════════════════════════════════════════

  { id: "ods-100-clean", label: "ODS-100 CLEAN", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS Clean channel. Legendary boutique clean tone. Warm, round, incredibly touch-sensitive. The holy grail of clean tones." },
  { id: "ods-100-ford", label: "ODS-100 FORD", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS voiced for Robben Ford. Smooth, liquid overdrive with vocal midrange. The quintessential jazz-blues fusion tone." },
  { id: "ods-100-ford-pab", label: "ODS-100 FORD PAB", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS Ford voicing with Pre-Amp Boost. Added gain and saturation while retaining the liquid Dumble character. Richer, more driven." },
  { id: "ods-100-ford-pab-mid", label: "ODS-100 FORD PAB MID", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS Ford voicing with Pre-Amp Boost and Mid boost. Enhanced midrange emphasis with added gain. Vocal, singing lead tone." },
  { id: "ods-100-hrm", label: "ODS-100 HRM", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS HRM (Hot Rubber Monkey) voicing. Rock-oriented Dumble tone with more gain and midrange push. Used by many blues-rock players." },
  { id: "ods-100-hrm-mid", label: "ODS-100 HRM MID", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS HRM with Mid boost. Enhanced midrange for more cutting lead tones. The singing Dumble lead character with extra midrange emphasis." },

  // ═══════════════════════════════════════════
  // BOUTIQUE & OTHER
  // ═══════════════════════════════════════════

  { id: "big-hair", label: "BIG HAIR", basedOn: "Custom model", category: "amp", characteristics: "Fractal's custom model designed for quintessential 80s rock tones. Think big hair bands with hot-rodded Marshall character and singing sustain." },
  { id: "blankenship-leeds", label: "BLANKENSHIP LEEDS", basedOn: "Dweezil Zappa's Blankenship Leeds 21", category: "amp", characteristics: "Roy Blankenship's boutique design owned by Dweezil Zappa. 21W with unique circuit topology. Open, dynamic, harmonically rich with vintage-inspired character." },
  { id: "bludojai-clean", label: "BLUDOJAI CLEAN", basedOn: "Bludotone Ojai", category: "amp", characteristics: "Bludotone Ojai Clean channel. 100W 6L6 boutique amp. Same schematic as the famous 'Tan' amp. Warm, pristine cleans with incredible touch sensitivity." },
  { id: "bludojai-lead", label: "BLUDOJAI LEAD", basedOn: "Bludotone Ojai", category: "amp", characteristics: "Bludotone Ojai Lead channel. Dumble-inspired overdrive. Smooth, vocal-like saturation. Extremely touch-sensitive, great for blues and jazz." },
  { id: "bludojai-lead-pab", label: "BLUDOJAI LEAD PAB", basedOn: "Bludotone Ojai", category: "amp", characteristics: "Bludotone Ojai Lead channel with Pre-Amp Boost. Extra gain and saturation while retaining the liquid Dumble-inspired character." },
  { id: "buddah-duomaster", label: "BUDDAH DUOMASTER", basedOn: "Budda Twinmaster", category: "amp", characteristics: "Simple, pure tube tone. Class A, single-ended. Extremely touch-sensitive with pure, uncolored amplification." },
  { id: "ca3-plus-clean", label: "CA3+ CLEAN", basedOn: "Custom Audio Amplifiers 3+ SE preamp", category: "amp", characteristics: "CA3+ SE Clean channel. Bob Bradshaw's high-end preamp. Studio-quality clean tone with excellent definition and headroom." },
  { id: "ca3-plus-lead", label: "CA3+ LEAD", basedOn: "Custom Audio Amplifiers 3+ SE preamp", category: "amp", characteristics: "CA3+ SE Lead channel. Smooth, singing lead tones. High-gain with excellent articulation. Used by many session players and touring professionals." },
  { id: "ca3-plus-rhythm", label: "CA3+ RHYTHM", basedOn: "Custom Audio Amplifiers 3+ SE preamp", category: "amp", characteristics: "CA3+ SE Rhythm channel. Medium gain crunch. Tight, punchy rhythm tones from the boutique rack preamp." },
  { id: "capt-hook-1a", label: "CAPT HOOK 1A", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 1A. 100W boutique with unique mu-follower circuit. Open, smooth distortion without typical cathode follower compression." },
  { id: "capt-hook-1b", label: "CAPT HOOK 1B", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 1B. Alternate voicing with different gain and EQ characteristics. Richard Hallebeek's signature amp." },
  { id: "capt-hook-2a", label: "CAPT HOOK 2A", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 2A. Medium gain with the unique mu-follower character. Smooth, dynamic overdrive." },
  { id: "capt-hook-2b", label: "CAPT HOOK 2B", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 2B. Higher gain variant. More saturation while retaining the open, uncompressed character." },
  { id: "capt-hook-3a", label: "CAPT HOOK 3A", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 3A. High gain with the Captain's unique tonal character. Smooth, fluid distortion." },
  { id: "capt-hook-3b", label: "CAPT HOOK 3B", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 3B. Maximum gain setting. Thick, saturated tone with excellent note definition and the mu-follower's unique feel." },
  { id: "car-ambler", label: "CAR AMBLER", basedOn: "Carr Rambler", category: "amp", characteristics: "Boutique American combo. Beautiful cleans with warm, musical breakup. Built-in reverb and tremolo. Very responsive to pick dynamics." },
  { id: "carol-ann-od2", label: "CAROL-ANN OD-2", basedOn: "Carol-Ann OD-2", category: "amp", characteristics: "Boutique hand-wired amp. Smooth, creamy overdrive with excellent note separation. Responds beautifully to pick dynamics." },
  { id: "carol-ann-triptik-classic", label: "CAROL-ANN TRIPTIK CLASSIC", basedOn: "Carol-Ann Triptik", category: "amp", characteristics: "Carol-Ann Triptik Classic mode. Vintage-inspired voicing with rich harmonics. Medium gain with warm, complex character." },
  { id: "carol-ann-triptik-clean", label: "CAROL-ANN TRIPTIK CLEAN", basedOn: "Carol-Ann Triptik", category: "amp", characteristics: "Carol-Ann Triptik Clean mode. Pristine, bell-like cleans from this three-channel boutique amp. Excellent headroom and clarity." },
  { id: "carol-ann-triptik-modern", label: "CAROL-ANN TRIPTIK MODERN", basedOn: "Carol-Ann Triptik", category: "amp", characteristics: "Carol-Ann Triptik Modern mode. Higher gain with tighter response. Extremely refined high-gain with complex harmonics." },
  { id: "carol-ann-tucana-clean", label: "CAROL-ANN TUCANA CLEAN", basedOn: "Carol-Ann Tucana 3", category: "amp", characteristics: "Carol-Ann Tucana Clean channel. Beautiful, warm cleans from this flagship boutique amp. Excellent dynamic range and touch sensitivity." },
  { id: "carol-ann-tucana-lead", label: "CAROL-ANN TUCANA LEAD", basedOn: "Carol-Ann Tucana 3", category: "amp", characteristics: "Carol-Ann Tucana Lead channel. Refined high-gain with singing sustain. Beautiful, liquid lead tones with excellent note articulation." },
  { id: "comet-60", label: "COMET 60", basedOn: "Komet 60", category: "amp", characteristics: "Boutique amp inspired by early German Telefunken and Marshall designs. Rich, complex harmonic content. Ken Fischer design philosophy." },
  { id: "comet-concourse", label: "COMET CONCOURSE", basedOn: "Komet Concorde", category: "amp", characteristics: "Komet Concorde boutique amp. EL84-powered with Vox-inspired character. Rich harmonics with boutique refinement and dynamic response." },
  { id: "cornfed-m50", label: "CORNFED M50", basedOn: "Cornford MK50 II", category: "amp", characteristics: "British boutique high-gain. Cornford's 50W EL34-powered design. Tight, aggressive British voicing with modern gain capabilities." },
  { id: "diamante-fire", label: "DIAMANTE FIRE", basedOn: "22W Diamond Del Fuego", category: "amp", characteristics: "22W boutique combo. Class A with EL84 power tubes. Sparkling cleans to medium crunch. Warm, dynamic, great for blues and roots." },
  { id: "div-13-cj", label: "DIV/13 CJ", basedOn: "Divided By 13 CJ 11", category: "amp", characteristics: "Boutique American design. Sparkling cleans and rich, complex overdrive. Extremely touch-sensitive and dynamic with beautiful harmonic content." },
  { id: "div-13-cj-boost", label: "DIV/13 CJ BOOST", basedOn: "Divided By 13 CJ 11", category: "amp", characteristics: "Divided By 13 CJ 11 with Boost engaged. Added gain and fullness for more driven tones while retaining the amp's dynamic character." },
  { id: "div-13-ft37-high", label: "DIV/13 FT37 HIGH", basedOn: "Divided By 13 FTR 37", category: "amp", characteristics: "Divided By 13 FTR 37 High power mode. Boutique American amp with more headroom. Sparkling cleans to rich crunch." },
  { id: "div-13-ft37-low", label: "DIV/13 FT37 LOW", basedOn: "Divided By 13 FTR 37", category: "amp", characteristics: "Divided By 13 FTR 37 Low power mode. Reduced wattage for earlier breakup. More compressed, singing character at lower volumes." },
  { id: "fox-ods", label: "FOX ODS", basedOn: "Fuchs Overdrive Supreme 50", category: "amp", characteristics: "Dumble-inspired boutique design. Sweet, vocal overdrive with bell-like cleans. Warm, touch-sensitive, great for blues and fusion." },
  { id: "fox-ods-deep", label: "FOX ODS DEEP", basedOn: "Fuchs Overdrive Supreme 50", category: "amp", characteristics: "Fuchs ODS with Deep switch engaged. Extended low-end response for fuller, warmer tone. Added bass depth while retaining the Dumble-inspired character." },
  { id: "fryette-d60-less", label: "FRYETTE D60 LESS", basedOn: "Fryette Deliverance 60 Series II", category: "amp", characteristics: "Fryette Deliverance 60 Less gain mode. Medium-high gain with the Fryette's signature tight, aggressive character. Great for hard rock." },
  { id: "fryette-d60-more", label: "FRYETTE D60 MORE", basedOn: "Fryette Deliverance 60 Series II", category: "amp", characteristics: "Fryette Deliverance 60 More gain mode. High gain with crushing, tight response. Modern metal and hard rock with Fryette's precision." },
  { id: "gibtone-scout", label: "GIBTONE SCOUT", basedOn: "Gibson GA17RVT Scout", category: "amp", characteristics: "Vintage Gibson Scout combo. Warm, vintage American tone with built-in reverb and tremolo. Unique voicing distinct from Fender. Great for roots and blues." },
  { id: "hot-kitty", label: "HOT KITTY", basedOn: "Bad Cat Hot Cat 30", category: "amp", characteristics: "Bad Cat Hot Cat 30W. Class A with EL34 power tubes. Versatile from chimey cleans to thick crunch. Touch-sensitive with rich harmonics." },
  { id: "jazz-120", label: "JAZZ 120", basedOn: "Roland Jazz Chorus 120", category: "amp", characteristics: "Legendary solid-state clean amp. Pristine, crystal-clear cleans with built-in chorus. The standard for ultra-clean, stereo guitar tones. Jazz and new wave staple." },
  { id: "matchbox-chieftain-1", label: "MATCHBOX CHIEFTAIN 1", basedOn: "Matchless Chieftain", category: "amp", characteristics: "Matchless Chieftain Channel 1. Class A boutique with EF86 preamp tube. Rich, complex harmonics with stunning touch response." },
  { id: "matchbox-chieftain-2", label: "MATCHBOX CHIEFTAIN 2", basedOn: "Matchless Chieftain", category: "amp", characteristics: "Matchless Chieftain Channel 2. Different voicing from Channel 1. More gain with the same Class A character and harmonic complexity." },
  { id: "matchbox-d-30", label: "MATCHBOX D-30", basedOn: "Matchless DC-30", category: "amp", characteristics: "Matchless DC-30. Dual-channel Class A boutique. Vox-inspired but with its own refined character. Chimey cleans and rich, complex overdrive." },
  { id: "matchbox-d-30-ef86", label: "MATCHBOX D-30 EF86", basedOn: "Matchless DC-30", category: "amp", characteristics: "Matchless DC-30 with EF86 preamp tube. The EF86 adds unique harmonic richness and earlier breakup. Warm, fat tone with vintage Class A character." },
  { id: "mr-z-hwy-66", label: "MR Z HWY 66", basedOn: "Dr. Z Route 66", category: "amp", characteristics: "Dr. Z Route 66. EL84-powered boutique with American voicing and British power section. Warm, dynamic, responsive to pick dynamics." },
  { id: "mr-z-mz-38", label: "MR Z MZ-38", basedOn: "Dr. Z Maz 38 SR", category: "amp", characteristics: "Dr. Z Maz 38 Senior. Warm, dynamic, incredibly responsive. EL84 power tubes. Great for blues, roots, and classic rock." },
  { id: "mr-z-mz-8", label: "MR Z MZ-8", basedOn: "Dr. Z Maz 8", category: "amp", characteristics: "Dr. Z Maz 8. Small, low-wattage boutique. Single EL84 power tube for beautiful breakup at low volumes. Perfect for studio recording." },
  { id: "nuclear-tone", label: "NUCLEAR-TONE", basedOn: "Swart Atomic Space Tone", category: "amp", characteristics: "Boutique Class A amp with unique tremolo and reverb. Warm, lush cleans. EL84 powered. Great for indie, ambient, and vintage tones." },
  { id: "ruby-rocket", label: "RUBY ROCKET", basedOn: "Paul Ruby Rocket", category: "amp", characteristics: "Paul Ruby boutique amp. EL84-powered with unique voicing. Dynamic, responsive, with warm, musical breakup." },
  { id: "ruby-rocket-bright", label: "RUBY ROCKET BRIGHT", basedOn: "Paul Ruby Rocket", category: "amp", characteristics: "Paul Ruby Rocket with Bright switch. Enhanced treble and presence for a more cutting, articulate tone." },
  { id: "spawn-nitrous-1", label: "SPAWN NITROUS 1", basedOn: "Splawn Nitro", category: "amp", characteristics: "Splawn Nitro channel 1. Hot-rodded Marshall-inspired high-gain. Tight, aggressive, with massive gain on tap. Modern American metal." },
  { id: "spawn-nitrous-2", label: "SPAWN NITROUS 2", basedOn: "Splawn Nitro", category: "amp", characteristics: "Splawn Nitro channel 2. Higher gain voicing. Even more saturated and aggressive than channel 1. Crushing rhythm and lead tones." },
  { id: "spawn-q-rod-od1-1", label: "SPAWN Q-ROD OD1-1", basedOn: "Splawn Quickrod", category: "amp", characteristics: "Splawn Quickrod OD1 channel, position 1. Lower gain hot-rodded Marshall character. Tight, punchy crunch with American aggressiveness." },
  { id: "spawn-q-rod-od1-2", label: "SPAWN Q-ROD OD1-2", basedOn: "Splawn Quickrod", category: "amp", characteristics: "Splawn Quickrod OD1 channel, position 2. Medium gain with the Quickrod's tight, aggressive voicing. Great for hard rock rhythm." },
  { id: "spawn-q-rod-od1-3", label: "SPAWN Q-ROD OD1-3", basedOn: "Splawn Quickrod", category: "amp", characteristics: "Splawn Quickrod OD1 channel, position 3. Higher gain from OD1. More saturation while retaining the Quickrod's tight character." },
  { id: "spawn-q-rod-od2-1", label: "SPAWN Q-ROD OD2-1", basedOn: "Splawn Quickrod", category: "amp", characteristics: "Splawn Quickrod OD2 channel, position 1. High-gain channel with more saturation than OD1. Aggressive, tight modern rock tones." },
  { id: "spawn-q-rod-od2-2", label: "SPAWN Q-ROD OD2-2", basedOn: "Splawn Quickrod", category: "amp", characteristics: "Splawn Quickrod OD2 channel, position 2. Very high gain with crushing palm mutes. Modern metal rhythm standard." },
  { id: "spawn-q-rod-od2-3", label: "SPAWN Q-ROD OD2-3", basedOn: "Splawn Quickrod", category: "amp", characteristics: "Splawn Quickrod OD2 channel, position 3. Maximum gain setting. Ultra-saturated for extreme metal applications with tight, focused response." },
  { id: "suhr-badger-18", label: "SUHR BADGER 18", basedOn: "Suhr Badger 18", category: "amp", characteristics: "18W EL84-powered boutique. Marshall-inspired with refined voicing. Great crunch at manageable volumes with smooth, musical breakup." },
  { id: "suhr-badger-30", label: "SUHR BADGER 30", basedOn: "Suhr Badger 30", category: "amp", characteristics: "30W Suhr Badger. More headroom than the 18W with the same refined character. Versatile from clean to crunch with excellent dynamics." },
  { id: "supremo-trem", label: "SUPREMO TREM", basedOn: "Supro 1964T", category: "amp", characteristics: "Vintage Supro 1964T. Raw, gritty, lo-fi character. Famous as one of Jimmy Page's secret weapons. Unique, compressed breakup at low volumes." },
  { id: "supro-black-magick", label: "SUPRO BLACK MAGICK", basedOn: "Supro 1695T Black Magick", category: "amp", characteristics: "Supro Black Magick. Modern reissue with vintage Supro character. Raw, aggressive, with thick midrange. Single-channel simplicity with built-in reverb." },
  { id: "two-stone-j35", label: "TWO STONE J35", basedOn: "Two-Rock Jet 35", category: "amp", characteristics: "Two-Rock Jet 35 boutique. Refined, Fender-influenced design. Sparkling cleans with sweet overdrive. Touch-sensitive with complex harmonics." },
  { id: "two-stone-j35-pab", label: "TWO STONE J35 PAB", basedOn: "Two-Rock Jet 35", category: "amp", characteristics: "Two-Rock Jet 35 with Pre-Amp Boost. Added gain and saturation. Richer, more driven tones while retaining the Two-Rock's refined character." },

  // ═══════════════════════════════════════════
  // BASS AMPS
  // ═══════════════════════════════════════════

  { id: "sv-bass-1", label: "SV BASS 1", basedOn: "Ampeg SVT bass amp", category: "amp", characteristics: "Ampeg SVT channel 1. The industry-standard bass amp. Massive, warm, with authoritative low-end. Tube-driven bass tone for rock and beyond." },
  { id: "sv-bass-2", label: "SV BASS 2", basedOn: "Ampeg SVT bass amp", category: "amp", characteristics: "Ampeg SVT channel 2. Different voicing from channel 1. More midrange presence for cutting through dense mixes." },
  { id: "porta-bass", label: "PORTA-BASS", basedOn: "Ampeg Portaflex bass amp", category: "amp", characteristics: "Ampeg Portaflex (B-15). Classic studio bass amp. Warm, round, pillowy bass tone. The Motown and studio standard for decades." },

  // ═══════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════

  { id: "tube-pre", label: "TUBE PRE", basedOn: "Generic tube preamp model", category: "amp", characteristics: "Generic tube preamp. Clean, transparent tube amplification. Useful as a building block for custom tones or as a clean boost stage." },

  // ═══════════════════════════════════════════
  // FAS CUSTOM MODELS (Fractal Audio Systems)
  // ═══════════════════════════════════════════

  { id: "fas-6160", label: "FAS 6160", basedOn: "Fractal Audio custom model (5150-inspired)", category: "amp", characteristics: "Less fizzy variant of the EVH 5150 character. Tighter, more focused. Great for modern rock/metal without the harshness." },
  { id: "fas-bass", label: "FAS BASS", basedOn: "Fractal Audio custom bass model", category: "amp", characteristics: "Fractal's idealized bass amp. No real-world equivalent. Clean, punchy bass tone with excellent definition. Great for any bass style." },
  { id: "fas-brootalz", label: "FAS BROOTALZ", basedOn: "Fractal Audio custom brutal high-gain model", category: "amp", characteristics: "Fractal's custom ultra-high-gain design. Extremely tight, aggressive, and brutal. Purpose-built for the heaviest of metal genres." },
  { id: "fas-brown", label: "FAS BROWN", basedOn: "Fractal Audio custom 'Brown Sound' model", category: "amp", characteristics: "Fractal's take on the EVH 'Brown Sound'. More refined than the Brit Brown model. Singing sustain with harmonic richness." },
  { id: "fas-buttery", label: "FAS BUTTERY", basedOn: "Fractal Audio custom smooth overdrive model", category: "amp", characteristics: "Fractal's custom smooth, creamy overdrive. Warm, buttery saturation with excellent touch sensitivity. Great for blues and expressive lead work." },
  { id: "fas-class-a", label: "FAS CLASS-A", basedOn: "Fractal Audio custom Class A model", category: "amp", characteristics: "Idealized Class A amplifier. Chimey, complex harmonics, beautiful breakup characteristics. No real-world limitations." },
  { id: "fas-crunch", label: "FAS CRUNCH", basedOn: "Fractal Audio custom British crunch model", category: "amp", characteristics: "Idealized Plexi/Marshall crunch tone. The ultimate British crunch sound without the limitations of any single real amp." },
  { id: "fas-express", label: "FAS EXPRESS", basedOn: "Fractal Audio custom Trainwreck Express-inspired model", category: "amp", characteristics: "Idealized Trainwreck Express-style amp. Dynamic, touch-sensitive, harmonically complex. All the magic without the price tag." },
  { id: "fas-hot-rod", label: "FAS HOT ROD", basedOn: "Fractal Audio custom hot-rodded Marshall model", category: "amp", characteristics: "Idealized version of a hot-rodded Marshall. All the gain and aggression of a modded Plexi without the downsides." },
  { id: "fas-lead-1", label: "FAS LEAD 1", basedOn: "Fractal Audio custom lead model", category: "amp", characteristics: "Fractal's idealized lead amp, version 1. Smooth, singing sustain with perfect note definition. Great for expressive solo work." },
  { id: "fas-lead-2", label: "FAS LEAD 2", basedOn: "Fractal Audio custom lead model", category: "amp", characteristics: "Fractal's idealized lead amp, version 2. Different gain staging from Lead 1. More saturation with slightly different harmonic content." },
  { id: "fas-modern", label: "FAS MODERN", basedOn: "Fractal Audio custom modern high-gain model", category: "amp", characteristics: "Fractal's idealized modern metal amp. Tight, surgical, massive gain. Removes undesirable characteristics of real amps. Community favorite for metal." },
  { id: "fas-modern-ii", label: "FAS MODERN II", basedOn: "Fractal Audio custom modern high-gain model", category: "amp", characteristics: "Second version of FAS Modern. Different gain staging and voicing. Evolved take on the idealized modern high-gain concept." },
  { id: "fas-modern-iii", label: "FAS MODERN III", basedOn: "Fractal Audio custom modern high-gain model", category: "amp", characteristics: "Third version of FAS Modern. Further refined voicing and response. The latest evolution of Fractal's custom modern metal tone." },
  { id: "fas-rhythm", label: "FAS RHYTHM", basedOn: "Fractal Audio custom rhythm model", category: "amp", characteristics: "Fractal's idealized rhythm amp. Tight, punchy, with perfect palm mute response. Designed for heavy rhythm playing." },
  { id: "fas-skull-crusher", label: "FAS SKULL CRUSHER", basedOn: "Fractal Audio custom extreme high-gain model", category: "amp", characteristics: "Fractal's most extreme high-gain design. Ultra-tight, ultra-heavy, maximum brutality. Purpose-built for the heaviest music imaginable." },
  { id: "fas-stealth-blue", label: "FAS STEALTH BLUE", basedOn: "Fractal Audio custom clean/crunch model", category: "amp", characteristics: "Fractal's custom clean-to-crunch design inspired by the 5150 Stealth concept. Versatile from pristine cleans to medium gain crunch." },
  { id: "fas-wreck", label: "FAS WRECK", basedOn: "Fractal Audio custom Trainwreck-inspired model", category: "amp", characteristics: "Idealized Trainwreck-style amp. All the harmonic complexity and touch sensitivity. Dynamic, responsive, and harmonically rich." },
];

export const FRACTAL_DRIVE_MODELS: DriveModel[] = [
  { id: "ts808", label: "TS808 / Tube Screamer", basedOn: "Ibanez TS808 / TS9", category: "drive", characteristics: "Mid-hump overdrive. Rolls off bass, boosts mids, soft clipping. The standard for tightening amps." },
  { id: "klon", label: "Klon", basedOn: "Klon Centaur", category: "drive", characteristics: "Transparent overdrive with subtle compression. Adds harmonics without changing core tone. Clean blend circuit." },
  { id: "rat", label: "RAT", basedOn: "ProCo RAT", category: "drive", characteristics: "Op-amp distortion with hard clipping. Can go from light drive to heavy distortion. Unique filter control." },
  { id: "sd-1", label: "Super OD", basedOn: "Boss SD-1 Super Overdrive", category: "drive", characteristics: "Asymmetric clipping TS variant. Slightly different harmonic content than TS, more open top end." },
  { id: "ocd", label: "OCD", basedOn: "Fulltone OCD", category: "drive", characteristics: "Versatile overdrive with HP/LP switch. MOSFET clipping. Can go from clean boost to heavy distortion." },
  { id: "blues-driver", label: "Blues Driver", basedOn: "Boss BD-2 Blues Driver", category: "drive", characteristics: "FET-based overdrive. More open, less mid-humped than TS. Responds well to pick dynamics." },
  { id: "king-of-tone", label: "King of Tone", basedOn: "Analogman King of Tone", category: "drive", characteristics: "Dual-stage overdrive. Marshall-in-a-box character. Stacks well with itself. Subtle, musical clipping." },
  { id: "bb-preamp", label: "BB Preamp", basedOn: "Xotic BB Preamp", category: "drive", characteristics: "Wide-range preamp/overdrive. Huge gain range, transparent to saturated. Two-band EQ for tone shaping." },
  { id: "fuzz-face-g", label: "Fuzz Face (Germanium)", basedOn: "Dallas Arbiter Fuzz Face (germanium transistors)", category: "drive", characteristics: "Warm, woolly, vintage fuzz. Temperature-sensitive. Cleans up beautifully with guitar volume. Hendrix tone." },
  { id: "fuzz-face-s", label: "Fuzz Face (Silicon)", basedOn: "Dallas Arbiter Fuzz Face (silicon transistors)", category: "drive", characteristics: "Brighter, more aggressive than germanium. More consistent. Buzzier, tighter fuzz. Gilmour-era tones." },
  { id: "big-muff", label: "Big Muff", basedOn: "Electro-Harmonix Big Muff Pi", category: "drive", characteristics: "Massive sustaining fuzz. Scooped mids, huge sustain. Wall of fuzz. Smashing Pumpkins, Dinosaur Jr." },
  { id: "tone-bender", label: "Tone Bender", basedOn: "Sola Sound Tone Bender MkII", category: "drive", characteristics: "Aggressive germanium fuzz. More biting and raspy than Fuzz Face. Jimmy Page, Jeff Beck early tones." },
  { id: "octavia", label: "Octavia", basedOn: "Roger Mayer Octavia / Tycobrahe Octavia", category: "drive", characteristics: "Octave-up fuzz. Ring modulator-like harmonics when played above 12th fret. Purple Haze solo tone." },
  { id: "ds-1", label: "DS-1", basedOn: "Boss DS-1 Distortion", category: "drive", characteristics: "Op-amp based hard clipping distortion. Bright, aggressive, defined. Can be smooth or gritty." },
  { id: "mxr-dist-plus", label: "MXR Dist+", basedOn: "MXR Distortion+", category: "drive", characteristics: "Simple, raw distortion. Op-amp clipping with germanium diodes. Bright, aggressive, cuts through." },
  { id: "timmy", label: "Timmy", basedOn: "Paul Cochrane Timmy", category: "drive", characteristics: "Transparent overdrive with treble and bass cut controls. Very open, dynamic, doesn't color the tone much. Stacking favorite." },
  { id: "zendrive", label: "Zendrive", basedOn: "Hermida Zendrive", category: "drive", characteristics: "Dumble-inspired overdrive. Warm, smooth, vocal-like midrange. Great for blues and fusion." },
  { id: "tape-dist", label: "Tape Dist", basedOn: "Tape saturation / preamp distortion", category: "drive", characteristics: "Emulates the saturation characteristics of overdriven tape machines. Warm, compressed, with soft clipping." },
  { id: "fe-fuzz", label: "FET Fuzz", basedOn: "ZVEX Fuzz Factory style FET fuzz", category: "drive", characteristics: "Unstable, wild, oscillating fuzz. FET-based for more extreme textures. Self-oscillation possible." },
  { id: "treble-boost", label: "Treble Boost", basedOn: "Dallas Rangemaster Treble Booster", category: "drive", characteristics: "Germanium treble booster. Cuts bass, boosts upper mids and treble. Brian May, Tony Iommi's secret weapon into cranked amps." },
];

export const KNOWN_MODS: KnownMod[] = [
  {
    id: "jose-arredondo",
    label: "Jose Arredondo Mod",
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-jm45", "brit-jm45-jumped"],
    category: "amp",
    description: "Jose Arredondo's legendary Plexi modification as done for Eddie Van Halen, Steve Lukather, and others.",
    circuitChanges: "Added post-phase-inverter master volume (PPIMV). Cascaded gain stages by jumping channels internally. Removed bright cap on channel 2. Changed cathode follower plate resistor for more drive. Added clipping diodes in some versions. Changed coupling caps for tighter bass response. Modified negative feedback loop for more gain and midrange push."
  },
  {
    id: "snorkler",
    label: "Snorkler Mod",
    appliesTo: ["brit-800-2204-high", "brit-800-2204-low", "brit-800-2203-high", "brit-800-2203-low", "1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble"],
    category: "amp",
    description: "Cascaded gain stages mod for more distortion while retaining the amp's core character.",
    circuitChanges: "Routes signal from V1a to V1b (cascading the preamp stages) instead of running them in parallel. Adds a coupling cap and grid leak resistor between stages. Effectively doubles the preamp gain. Similar concept to the Jose mod but simpler. May include cathode bypass cap changes for more gain on the second stage."
  },
  {
    id: "cameron-mod",
    label: "Mark Cameron Mod",
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-800-2204-high", "brit-800-2204-low", "brit-800-2203-high", "brit-800-2203-low"],
    category: "amp",
    description: "Mark Cameron's hot-rod Marshall modification, known for tight high-gain with Plexi feel.",
    circuitChanges: "Complete preamp redesign with cascaded stages and additional clipping. Modified tone stack for tighter bass. Added extra gain stage. Modified cathode follower. Reduced negative feedback for more gain. Added series/parallel effects loop. Clipping diode network for controlled saturation. Often includes channel switching."
  },
  {
    id: "plexi-to-jcm800",
    label: "Plexi-to-JCM800 Conversion",
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-jm45", "brit-jm45-jumped"],
    category: "amp",
    description: "Convert a Plexi circuit to JCM 800 specs by adding a master volume and preamp gain.",
    circuitChanges: "Add master volume after the phase inverter. Change the first preamp stage cathode bypass cap from 0.68uF to 0.82uF for more low-end gain. Add a 470pF bright cap across the master volume. Change coupling caps to 0.022uF for tighter bass. Reduce plate resistors on V1 for hotter signal. May change negative feedback resistor."
  },
  {
    id: "jcm800-gain-mod",
    label: "JCM 800 Extra Gain Mod",
    appliesTo: ["brit-800-2204-high", "brit-800-2204-low", "brit-800-2203-high", "brit-800-2203-low", "brit-800-mod", "brit-800-studio-20"],
    category: "amp",
    description: "Increase gain in a JCM 800 beyond stock levels for heavier tones.",
    circuitChanges: "Add or increase cathode bypass cap on second preamp stage (from 0.68uF to 1uF or higher). Change coupling cap between stages for more bass into the clipping stages. Reduce the bright cap value to tame ice-pick highs at higher gain. Some versions add a clipping diode pair to ground after the second gain stage."
  },
  {
    id: "vox-top-boost",
    label: "Top Boost Mod",
    appliesTo: ["class-a-30w", "class-a-30w-bright", "class-a-30w-brilliant", "class-a-30w-hot", "class-a-30w-tb", "class-a-15w-tb", "ac-20-12ax7-bass", "ac-20-12ax7-treble", "ac-20-ef86-bass", "ac-20-ef86-treble"],
    category: "amp",
    description: "Add the classic Top Boost circuit to a normal-channel Vox for more treble and gain.",
    circuitChanges: "Add an extra triode gain stage with treble and bass cut controls after the first preamp stage. The Top Boost circuit adds a 12AX7 stage with adjustable high-frequency emphasis. This became standard on later AC30s but early models lacked it."
  },
  {
    id: "mesa-gain-mod",
    label: "Mesa Gain Structure Mod",
    appliesTo: ["usa-mk-iic-plus", "usa-mk-iic-plus-bright", "usa-mk-iic-plus-deep", "usa-mk-iic-plus-deep-bright", "usa-jp-iic-plus-green", "usa-jp-iic-plus-red", "usa-jp-iic-plus-red-shred", "usa-jp-iic-plus-yellow", "usa-jp-iic-plus-yellow-shred", "recto1-orange-modern", "recto1-orange-normal", "recto1-red", "recto2-orange-modern", "recto2-orange-vintage", "recto2-red-modern", "recto2-red-vintage"],
    category: "amp",
    description: "Modify Mesa gain staging for tighter or looser feel.",
    circuitChanges: "Adjust cascaded gain stage coupling caps to control bass entering each stage. Modify cathode bypass caps to change gain character at each stage. Change plate load resistors to alter headroom per stage. In Rectos, changing the rectifier tube type (silicon vs tube) dramatically changes feel and sag."
  },
  {
    id: "recto-tube-rectifier",
    label: "Tube Rectifier Swap",
    appliesTo: ["recto1-orange-modern", "recto1-orange-normal", "recto1-red", "recto2-orange-modern", "recto2-orange-vintage", "recto2-red-modern", "recto2-red-vintage"],
    category: "amp",
    description: "Switch between silicon and tube rectifiers for dramatically different feel and sag.",
    circuitChanges: "Silicon rectifiers provide tight, immediate response with no voltage sag. Tube rectifiers (5U4 or 5AR4/GZ34) introduce voltage sag under load, creating compression, bloom, and a bouncy feel. 5U4 has more sag than GZ34. This is the single biggest feel change in a Recto. On Fractal, the Power Tube Sag parameter directly controls this."
  },
  {
    id: "silver-jubilee-diode",
    label: "Jubilee Diode Clipping Mod",
    appliesTo: ["brit-silver"],
    category: "amp",
    description: "Engage or modify the Silver Jubilee's diode clipping circuit for more gain and compression.",
    circuitChanges: "The Jubilee has a built-in diode clipping switch. The diodes add gain and compression before the phase inverter. Modding involves changing diode types (stock silicon to germanium for softer clip, or LEDs for more headroom). The diode circuit is what gives the Jubilee its distinctive compressed, saturated character vs. a standard Plexi."
  },
  {
    id: "friedman-sat-voice",
    label: "Friedman SAT/Voice Mod",
    appliesTo: ["friedman-be-2010", "friedman-be-c45", "friedman-be-v1", "friedman-be-v1-fat", "friedman-be-v2", "friedman-be-v3", "friedman-hbe-2010", "friedman-hbe-c45", "friedman-hbe-v1", "friedman-hbe-v1-fat", "friedman-hbe-v2", "friedman-hbe-v3"],
    category: "amp",
    description: "Explore the Friedman's SAT switch and Voice switch combinations for different gain characters.",
    circuitChanges: "SAT switch adds a clipping network in the preamp that compresses and saturates the signal. Without SAT, the amp is more open and dynamic. Voice switch changes the high-frequency roll-off and bass response: one position is brighter with bigger bass, the other is darker with more midrange focus. These interact with each other significantly."
  },
  {
    id: "5153-bias-shift",
    label: "5150 Bias / Tube Swap",
    appliesTo: ["5153-100w-blue", "5153-100w-green", "5153-100w-red", "5153-100w-stealth-blue", "5153-100w-stealth-green", "5153-100w-stealth-red", "5153-50w-blue"],
    category: "amp",
    description: "Change power tube bias or swap tube types in the 5150 for different feel.",
    circuitChanges: "Stock 5150III uses 6L6 power tubes. Swapping to EL34s changes the character dramatically: more aggressive midrange, less clean headroom, more British-voiced. Biasing hotter gives smoother class-A-like response, colder gives more crossover distortion and grit. Some players run the 5150 with KT77s (EL34 variant) for a tighter, more focused sound."
  },
  {
    id: "soldano-gain-mod",
    label: "SLO Gain Mod",
    appliesTo: ["solo-100-clean", "solo-100-lead", "solo-100-rhythm", "solo-88-clean", "solo-88-lead", "solo-88-rhythm", "solo-99-clean", "solo-99-lead", "solo-99-lead-bright"],
    category: "amp",
    description: "Modify the SLO-100's gain structure for tighter or more saturated response.",
    circuitChanges: "The SLO uses cascaded gain stages with specific coupling cap values. Reducing the coupling caps tightens the bass entering each stage. The SLO's cathode follower is key to its character - increasing the cathode resistor changes compression behavior. Modifying the negative feedback amount changes the overall feel from loose and dynamic to tight and controlled."
  },
  {
    id: "ts-diode-swap",
    label: "Clipping Diode Swap",
    appliesTo: ["ts808", "sd-1"],
    category: "drive",
    description: "Replace the stock silicon clipping diodes with alternatives for different saturation character.",
    circuitChanges: "Stock TS uses two 1N914/1N4148 silicon diodes in symmetric soft clipping. Swaps: Germanium diodes (1N34A) = lower clipping threshold, warmer, earlier breakup. LEDs = higher clipping threshold, more headroom, cleaner. Asymmetric (one silicon + one germanium) = more complex harmonics, tube-like. MOSFET clipping = very open, less compressed."
  },
  {
    id: "ts-bass-mod",
    label: "Bass Boost / Fat Mod",
    appliesTo: ["ts808", "sd-1"],
    category: "drive",
    description: "Increase bass response in a Tube Screamer circuit which normally rolls off low end.",
    circuitChanges: "Increase the input cap (C1) from 0.047uF to 0.1uF or higher to allow more bass into the circuit. Can also modify the feedback network cap to change how much bass is in the clipping stage. Some versions add a bass boost switch with selectable cap values."
  },
  {
    id: "rat-opamp-swap",
    label: "Op-Amp Swap",
    appliesTo: ["rat"],
    category: "drive",
    description: "Replace the RAT's op-amp for different gain and frequency response characteristics.",
    circuitChanges: "Stock vintage RAT uses LM308 (slow slew rate = natural compression and filtering of harsh harmonics). Modern RATs use OP07 (faster, brighter, more gain). Alternative: TL071 (very clean, bright, less compressed). LM308 vs OP07 is the most significant tonal difference in RATs. The slow slew rate of LM308 acts as a natural filter."
  },
  {
    id: "rat-clipping-mod",
    label: "Clipping Diode Mod",
    appliesTo: ["rat"],
    category: "drive",
    description: "Modify the RAT's hard clipping diodes for different distortion flavors.",
    circuitChanges: "Stock: 1N914 silicon diodes (hard, bright clipping). Germanium (1N34A): softer, warmer, earlier clipping. LEDs: much higher headroom, almost clean boost with grit. MOSFET: very open and dynamic. Turbo RAT mod: LEDs instead of silicon for more headroom and less compression. Remove diodes entirely for massive fuzzy overdrive."
  },
  {
    id: "fuzz-bias-mod",
    label: "Bias Adjustment",
    appliesTo: ["fuzz-face-g", "fuzz-face-s", "tone-bender"],
    category: "drive",
    description: "Adjust transistor bias point for different fuzz character.",
    circuitChanges: "Adjust the collector voltage of Q2 (typically via the bias resistor from collector to V+). Stock Fuzz Face biases Q2 collector at about -4.5V (germanium). Starved bias (lower voltage) = sputtery, gated, velcro-like fuzz. Hot bias (higher voltage) = smoother, more sustain, less gated. Temperature affects germanium bias significantly."
  },
  {
    id: "fuzz-input-cap",
    label: "Input Cap / Bass Mod",
    appliesTo: ["fuzz-face-g", "fuzz-face-s"],
    category: "drive",
    description: "Modify the Fuzz Face input cap to change low-end response.",
    circuitChanges: "Stock Fuzz Face uses a 2.2uF input cap. Increasing to 10uF or higher allows more bass through, creating a fatter, heavier fuzz. Decreasing tightens the bass for a more focused, less flubby sound. This is critical for bass-heavy rigs or downtuned guitars where stock Fuzz Face gets muddy."
  },
  {
    id: "muff-tone-mod",
    label: "Tone Stack Mod",
    appliesTo: ["big-muff"],
    category: "drive",
    description: "Modify the Big Muff's tone circuit to reduce the mid-scoop.",
    circuitChanges: "Stock Big Muff has a severe mid-scoop from its passive tone stack. Adding a mid-boost pot (often called the 'mids' knob) by adding a variable resistor across the tone caps. Alternatively, reduce the tone cap values to narrow the scoop. The 'flat mids' mod bypasses part of the tone stack for more midrange presence, helping the Muff cut through a band mix."
  },
  {
    id: "muff-gain-mod",
    label: "Gain Stage Mod",
    appliesTo: ["big-muff"],
    category: "drive",
    description: "Modify Big Muff clipping stages for different saturation levels.",
    circuitChanges: "Stock Big Muff has 4 clipping stages (2 pairs of diodes). Changing diodes in each stage affects overall saturation. First pair affects initial breakup character, second pair affects sustain and compression. Germanium in first stage + silicon in second = complex, layered distortion. Reducing gain in first stage and increasing in second = tighter, more defined."
  },
  {
    id: "klon-gain-mod",
    label: "Klon Gain Structure Mod",
    appliesTo: ["klon"],
    category: "drive",
    description: "Modify the Klon's unique clean blend and gain structure.",
    circuitChanges: "The Klon's secret is its clean blend circuit: as gain increases, the clean signal fades and the clipped signal increases. Modifying the blend ratio changes the transparency. Increasing the gain stage feedback resistor adds more saturation. Changing the germanium clipping diodes to silicon or LEDs changes the clipping character. The charge pump doubles the internal voltage for more headroom."
  },
  {
    id: "rangemaster-mod",
    label: "Rangemaster Cap Mod",
    appliesTo: ["treble-boost"],
    category: "drive",
    description: "Change the Rangemaster input cap to make it a full-range or mid-range booster.",
    circuitChanges: "Stock Rangemaster uses a small input cap (0.005uF) that rolls off bass, making it a treble booster. Increasing to 0.01uF = mid-boost character. Increasing to 0.1uF or higher = full-range boost. Adding a switchable cap selection gives multiple voicings. This single cap change transforms the pedal's character completely."
  },
];

export const EXPERT_PARAMETERS: ExpertParameter[] = [
  { name: "Input Trim", category: "amp", range: "0.0 - 10.0", defaultValue: "Varies", circuitEquivalent: "Input signal level hitting the first preamp tube", description: "Controls how hard the input signal drives the first gain stage. Higher values simulate hotter pickups or a boost pedal pushing the front end." },
  { name: "Preamp Tube Type", category: "amp", range: "12AX7, 12AT7, 12AY7, etc.", defaultValue: "12AX7", circuitEquivalent: "Preamp tube selection", description: "Different tube types have different gain factors. 12AX7 is highest gain (100), 12AT7 is medium (60), 12AY7 is lower (45). Changing tubes changes headroom and breakup character." },
  { name: "Preamp Sag", category: "amp", range: "0.0 - 10.0", defaultValue: "Varies", circuitEquivalent: "Power supply stiffness to preamp stages", description: "Simulates the voltage drop in the preamp power supply under load. Higher values = more compression and dynamic response. Lower = tighter, more immediate response." },
  { name: "Negative Feedback", category: "amp", range: "0.0 - 10.0", defaultValue: "Varies", circuitEquivalent: "Negative feedback loop from output transformer to phase inverter", description: "Controls how much output signal is fed back to reduce gain and tighten response. Lower NFB = more gain, looser feel, more harmonics (Plexi-like). Higher NFB = tighter, cleaner, more controlled (Fender-like)." },
  { name: "Transformer Match", category: "amp", range: "0.0 - 10.0", defaultValue: "5.0", circuitEquivalent: "Output transformer impedance matching", description: "Simulates impedance mismatch between output transformer and speaker. Affects power transfer efficiency, harmonic content, and feel. Mismatched = more harmonics, less clean power." },
  { name: "Transformer Drive", category: "amp", range: "0.0 - 10.0", defaultValue: "Varies", circuitEquivalent: "How hard the power tubes drive the output transformer", description: "Higher values simulate pushing the output transformer harder, adding saturation and compression at the power stage level. Important for power-amp distortion tones." },
  { name: "Speaker Compliance", category: "amp", range: "0.0 - 10.0", defaultValue: "5.0", circuitEquivalent: "Speaker cone stiffness / mechanical compliance", description: "Affects the interaction between the power amp and speaker. Higher compliance = looser, more dynamic feel. Lower = tighter, more controlled response." },
  { name: "Cathode Follower Comp", category: "amp", range: "0.0 - 10.0", defaultValue: "Varies", circuitEquivalent: "Cathode follower tube compression", description: "The cathode follower sits between the preamp and tone stack. Higher values add more compression and harmonic saturation at this critical point. Key to Marshall-style sag and bloom." },
  { name: "Master Volume Trim", category: "amp", range: "0.0 - 10.0", defaultValue: "5.0", circuitEquivalent: "Post-phase-inverter master volume behavior", description: "Affects how the master volume interacts with the power amp. In a mod context, this simulates adding a PPIMV (post-phase-inverter master volume) which was a key mod for cranked tones at lower volumes." },
  { name: "Power Tube Type", category: "amp", range: "EL34, 6L6, EL84, 6V6, KT88, etc.", defaultValue: "Varies", circuitEquivalent: "Power tube selection", description: "EL34 = aggressive mids, classic British. 6L6 = scooped, clean headroom, American. EL84 = chimey, compressed, Vox-like. 6V6 = warm, early breakup, Deluxe-like. KT88 = huge clean headroom." },
  { name: "Power Tube Bias", category: "amp", range: "0.0 - 10.0", defaultValue: "5.0", circuitEquivalent: "Power tube bias point (cold to hot)", description: "Cold bias = more crossover distortion, grittier, class-AB-ish. Hot bias = smoother, more class-A-like, warmer but shorter tube life. Dramatically affects feel and harmonic content." },
  { name: "Power Tube Sag", category: "amp", range: "0.0 - 10.0", defaultValue: "Varies", circuitEquivalent: "Power supply rectifier type and stiffness", description: "Simulates the voltage sag from the rectifier. Tube rectifiers (higher sag) = more compression, bloom, and 'bounce'. Silicon rectifiers (lower sag) = tight, immediate, no sag. Key parameter for feel." },
  { name: "Output Comp", category: "amp", range: "0.0 - 10.0", defaultValue: "Varies", circuitEquivalent: "Power amp compression behavior", description: "Controls the overall compression characteristic of the power amp section. Higher values = more compression, smoother dynamics. Lower = more open, dynamic, raw." },
  { name: "Bright Cap", category: "amp", range: "0 - varies", defaultValue: "Varies", circuitEquivalent: "Bright capacitor across the volume pot", description: "A small cap that lets high frequencies bypass the volume pot at lower settings. Removing or reducing = warmer at lower volumes. Many mods involve removing this cap." },
  { name: "Clipping Type", category: "drive", range: "Various", defaultValue: "Varies", circuitEquivalent: "Clipping diode type and configuration", description: "Determines the waveshaping behavior. Silicon = hard clip, bright. Germanium = soft clip, warm. LED = high headroom, open. MOSFET = very dynamic. Asymmetric = complex harmonics." },
  { name: "Bias", category: "drive", range: "0.0 - 10.0", defaultValue: "5.0", circuitEquivalent: "Operating point of transistors/op-amps", description: "In fuzz circuits, controls the transistor bias point. Starved = gated, sputtery, dying-battery sound. Full = smooth sustain. In drive circuits, affects clipping symmetry." },
  { name: "Slew Rate", category: "drive", range: "0.0 - 10.0", defaultValue: "Varies", circuitEquivalent: "Op-amp slew rate (how fast it can respond)", description: "Slow slew rate (like LM308 in RAT) naturally filters harsh harmonics and adds compression. Fast slew rate = brighter, more open, less compressed. Key to vintage vs modern voicing." },
  { name: "Input Impedance", category: "drive", range: "Low / Medium / High", defaultValue: "Varies", circuitEquivalent: "Input impedance of the pedal circuit", description: "High impedance = transparent, doesn't load pickups. Low impedance = rolls off highs, changes pickup resonance. Fuzz Face has notoriously low input impedance which is why buffer pedals before it cause problems." },
  { name: "Tone", category: "drive", range: "0.0 - 10.0", defaultValue: "5.0", circuitEquivalent: "Tone control / low-pass filter", description: "In most drives, this is a simple low-pass filter. In RAT, it's a unique variable filter. In Big Muff, it's a mid-scoop circuit. The implementation varies dramatically between pedals." },
  { name: "Drive / Gain", category: "drive", range: "0.0 - 10.0", defaultValue: "5.0", circuitEquivalent: "Gain/feedback amount in clipping stage", description: "Controls how much gain is applied before clipping. Higher = more distortion and compression. In TS-type circuits, this changes the feedback resistor ratio." },
];

export function getModsForModel(modelId: string): KnownMod[] {
  return KNOWN_MODS.filter(mod => 
    mod.appliesTo.includes(modelId) || mod.appliesTo.length === 0
  );
}

export function getParametersByCategory(category: 'amp' | 'drive'): ExpertParameter[] {
  return EXPERT_PARAMETERS.filter(p => p.category === category);
}

export function formatParameterGlossary(category: 'amp' | 'drive'): string {
  const params = getParametersByCategory(category);
  return params.map(p => 
    `- ${p.name}: ${p.description} (Circuit equivalent: ${p.circuitEquivalent}. Range: ${p.range}, Default: ${p.defaultValue})`
  ).join('\n');
}

export function formatKnownModContext(mod: KnownMod): string {
  return `Known Mod: "${mod.label}"
Description: ${mod.description}
Circuit Changes: ${mod.circuitChanges}`;
}

export function formatModelContext(model: AmpModel | DriveModel): string {
  return `Base Model: ${model.label} (based on ${model.basedOn})
Characteristics: ${model.characteristics}`;
}
