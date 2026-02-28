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
  { id: "59-bassguy-ri", label: "59 BASSGUY RI", basedOn: "Fender 59 Bassman LTD Vintage Reissue", category: "amp", characteristics: "Fender 59 Bassman LTD Vintage Reissue. Modern build quality with vintage Tweed Bassman character. Warm, fat crunch with full frequency response." },
  { id: "supertweed", label: "SUPERTWEED", basedOn: "Custom Fractal model inspired by Fender '57 Tweed Super 5E4", category: "amp", characteristics: "Fender Super Tweed-inspired custom model. Raw, gritty, louder than Deluxe Tweed. Beautiful harmonic distortion at volume." },
  { id: "princetone-5f2", label: "PRINCETONE 5F2", basedOn: "Fender Tweed Princeton, 5F2-A", category: "amp", characteristics: "Small Tweed-era Fender Princeton. Simple, pure tone with early breakup. Single-ended design with warm, compressed character. Great practice and recording amp." },

  // ═══════════════════════════════════════════
  // FENDER BROWNFACE ERA
  // ═══════════════════════════════════════════

  { id: "6g4-super", label: "6G4 SUPER", basedOn: "1960 Brownface Fender Super, 6G4", category: "amp", characteristics: "Transitional brownface Fender. Warmer than blackface, more harmonically rich. Unique, lush tremolo circuit with a smooth, organic character." },
  { id: "6g12-concert", label: "6G12 CONCERT", basedOn: "1960 Brownface Fender Concert, 6G12", category: "amp", characteristics: "Brownface-era Fender Concert. 40W with 4x10 speakers. Warm, complex tone with the signature brownface harmonic richness. Great for blues and roots." },

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
  { id: "vibrato-verb-ab", label: "VIBRATO VERB AB", basedOn: "Fender Vibro Verb, AB763 circuit", category: "amp", characteristics: "Blackface-era Fender Vibro Verb. Single-speaker reverb combo with warm, three-dimensional clean tones. Vibrato circuit adds lush modulation. Sought-after vintage Fender voice." },
  { id: "vibrato-lux", label: "VIBRATO LUX", basedOn: "Fender Vibrolux, blackface era", category: "amp", characteristics: "Blackface Fender Vibrolux. 35W with 2x10 speakers. Sweet, chimey cleans with built-in vibrato and reverb. Warm, dimensional clean tones with earlier breakup than the Twin." },
  { id: "vibrato-verb-aa", label: "VIBRATO VERB AA", basedOn: "Fender Vibro Verb, AA763 circuit", category: "amp", characteristics: "Fender Vibro Verb with AA763 circuit. Earlier circuit variant with different voicing from the AB763 version. Warm, lush, three-dimensional clean tones with vintage character." },
  { id: "vibra-king", label: "VIBRA-KING", basedOn: "Fender Vibro-King", category: "amp", characteristics: "Modern Fender classic with 3x10 speaker config. Rich, warm cleans with lush onboard reverb and vibrato. Fat, dimensional sound with beautiful touch sensitivity. Favored by blues and country players." },
  { id: "tremolo-lux", label: "TREMOLO LUX", basedOn: "Blackface Fender Tremolux, AA763", category: "amp", characteristics: "Blackface Fender Tremolux head. Clean, chimey Fender tone with built-in tremolo. Similar to Deluxe Reverb but as a head unit without reverb." },
  { id: "65-bassguy-bass", label: "65 BASSGUY BASS", basedOn: "1965 Blackface Fender Bassman head, AB165", category: "amp", characteristics: "Blackface-era Bassman bass channel. Cleaner than Tweed version. More headroom, tighter bass response with solid low-end foundation." },
  { id: "65-bassguy-normal", label: "65 BASSGUY NORMAL", basedOn: "1965 Blackface Fender Bassman head, AB165", category: "amp", characteristics: "Blackface Bassman normal channel. Bright, clean, punchy. Good pedal platform with Fender sparkle and clarity." },
  { id: "dweezils-bassguy", label: "DWEEZIL'S BASSGUY", basedOn: "Dweezil Zappa's 1965 blackface Fender Bassman, AB165", category: "amp", characteristics: "Dweezil Zappa's personal blackface Bassman. Unique character from aged components and specific tube complement. Warm, articulate, and responsive." },
  { id: "jr-blues", label: "JR BLUES", basedOn: "Fender Blues Junior", category: "amp", characteristics: "Small, affordable Fender combo. EL84 power tubes give it a more British flavor. Warm cleans to moderate crunch. Popular gigging and practice amp." },

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

  { id: "brit-jvm-od1", label: "BRIT JVM OD1", basedOn: "Marshall JVM410H", category: "amp", characteristics: "Marshall JVM410H OD1 channel. Three gain modes via switch: Green is low-gain Plexi-like crunch, Orange is medium-gain classic 800-style, Red is higher-gain hot-rodded Marshall. The most versatile JVM channel, covering clean to heavy crunch." },
  { id: "brit-jvm-od2", label: "BRIT JVM OD2", basedOn: "Marshall JVM410H", category: "amp", characteristics: "Marshall JVM410H OD2 channel. Three gain modes via switch: Green is medium-high gain with tight bass, Orange is high gain modern Marshall voicing for modern rock, Red is maximum saturation with tight focused response for metal. More aggressive than OD1 across all modes." },
  { id: "brit-silver", label: "BRIT SILVER", basedOn: "Marshall Silver Jubilee 2555", category: "amp", characteristics: "Marshall's 25th anniversary amp. Diode clipping option, switchable pentode/triode. Slash, Alex Lifeson tones. Distinctive compressed, singing character." },
  { id: "brit-brown", label: "BRIT BROWN", basedOn: "Custom model producing the Plexi 'Brown Sound'", category: "amp", characteristics: "Custom Fractal model capturing the 'Brown Sound' character. Hot-rodded Plexi voicing with extra gain and saturation. Eddie Van Halen-inspired tone." },
  { id: "brit-afs100-1", label: "BRIT AFS100 1", basedOn: "Marshall AFD100SCE", category: "amp", characteristics: "Slash's signature Marshall channel 1. Based on the modified Super Lead circuit. The Appetite For Destruction tone with singing sustain and harmonics." },
  { id: "brit-afs100-2", label: "BRIT AFS100 2", basedOn: "Marshall AFD100SCE", category: "amp", characteristics: "Slash's signature Marshall channel 2. Higher gain voicing with more saturation. Modern Slash lead tones with thick, vocal midrange." },
  { id: "brit-super", label: "BRIT SUPER", basedOn: "Marshall AFD100 schematics", category: "amp", characteristics: "Based on Marshall AFD100 schematics. Related to the Slash circuit but with different voicing and component values." },
  { id: "js410-crunch", label: "JS410 CRUNCH", basedOn: "Marshall JVM410HJS", category: "amp", characteristics: "Joe Satriani signature JVM Crunch channel. Medium gain with vocal midrange. Tuned for Satriani's expressive lead style with dynamic touch response." },
  { id: "js410-lead", label: "JS410 LEAD", basedOn: "Marshall JVM410HJS", category: "amp", characteristics: "Joe Satriani signature JVM Lead channel. Maximum gain with extreme sustain and compression. Soaring, singing lead tone with liquid feel." },
  { id: "jmpre-1-clean-1", label: "JMPRE-1 CLEAN 1", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Clean 1 setting. Bright, chimey clean tone. The cleaner side of Marshall's MIDI rack preamp." },
  { id: "jmpre-1-clean-2", label: "JMPRE-1 CLEAN 2", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Clean 2 setting. Slightly different voicing from Clean 1 with more warmth and body." },
  { id: "jmpre-1-od1", label: "JMPRE-1 OD1", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Overdrive 1 setting. Medium gain Marshall crunch. Classic rock tones from the rack preamp era." },
  { id: "jmpre-1-od2", label: "JMPRE-1 OD2", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "JMP-1 Overdrive 2 setting. Higher gain with more saturation. The hot-rodded Marshall rack preamp tone." },

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
  { id: "pvh-6160-block-lead", label: "PVH 6160 BLOCK LEAD", basedOn: "Peavey 'Block Letter' EVH 5150", category: "amp", characteristics: "The original Peavey 5150 lead channel. Legendary high-gain amp co-designed with Eddie Van Halen. Aggressive, raw, saturated tone. The 90s metal/rock standard." },
  { id: "pvh-6160-block-crunch", label: "PVH 6160 BLOCK CRUNCH", basedOn: "Peavey 'Block Letter' EVH 5150", category: "amp", characteristics: "Crunch channel of the original block-letter 5150. Medium gain with raw, aggressive character. Great for rhythm tones and classic rock." },
  { id: "pvh-6160-plus-clean", label: "PVH 6160+ CLEAN", basedOn: "Peavey 6505+ / EVH 5150-II", category: "amp", characteristics: "Clean channel of the 6505+/5150 II. Improved clean channel over the original. Warm, usable cleans with decent headroom." },
  { id: "pvh-6160-plus-crunch", label: "PVH 6160+ CRUNCH", basedOn: "Peavey 6505+ / EVH 5150-II", category: "amp", characteristics: "Crunch channel of the 6505+. Medium-high gain with the signature 5150 aggression. Tighter than the original block letter." },
  { id: "pvh-6160-plus-lead", label: "PVH 6160+ LEAD", basedOn: "Peavey 6505+ / EVH 5150-II", category: "amp", characteristics: "Lead channel of the 6505+. Maximum gain with tight, aggressive voicing. Modern metal and hard rock standard with crushing palm mutes." },

  // ═══════════════════════════════════════════
  // MESA BOOGIE
  // ═══════════════════════════════════════════

  { id: "usa-mk-iic-plus", label: "USA MK IIC+", basedOn: "MESA/Boogie Mark IIC+", category: "amp", characteristics: "The most sought-after Mesa. Tight, aggressive lead channel. The Metallica Master of Puppets tone. Heavy low-end, searing highs, legendary sustain." },
  { id: "usa-mk-iic-plus-plus", label: "USA MK IIC++", basedOn: "MESA/Boogie Mark IIC++ (enhanced IIC+)", category: "amp", characteristics: "Enhanced Mark IIC+ with additional gain stage modifications. Even more aggressive and tighter than the standard IIC+. Extended gain range for modern metal applications." },
  { id: "usa-jp-iic-plus-green", label: "USA JP IIC+ GREEN", basedOn: "MESA/Boogie JP-2C", category: "amp", characteristics: "John Petrucci's signature JP-2C Green mode. Clean to low gain. Warm, articulate cleans with the IIC+ topology. Dream Theater clean tones." },
  { id: "usa-jp-iic-plus-red", label: "USA JP IIC+ RED", basedOn: "MESA/Boogie JP-2C", category: "amp", characteristics: "JP-2C Red mode. High-gain lead channel with tighter, more modern voicing than the original IIC+. Extended gain range for modern progressive metal." },
  { id: "usa-jp-iic-plus-yellow", label: "USA JP IIC+ YELLOW", basedOn: "MESA/Boogie JP-2C", category: "amp", characteristics: "JP-2C Yellow mode. Medium-gain crunch channel. Vintage-inspired voicing within the IIC+ framework. Great for crunchy rhythm tones." },
  { id: "usa-metro-blues", label: "USA METRO BLUES", basedOn: "MESA Subway Blues", category: "amp", characteristics: "Mesa Subway Blues combo. Compact, EL84-powered Mesa with warm, bluesy crunch. Great for smaller venues with classic American tone." },
  { id: "usa-bass-400-1", label: "USA BASS 400 1", basedOn: "MESA Bass 400 bass amp", category: "amp", characteristics: "Mesa Bass 400 channel 1. Massive tube bass amp with huge low-end. Warm, punchy, with natural tube compression. Bass player's dream." },
  { id: "usa-mk-iv-lead", label: "USA MK IV LEAD", basedOn: "MESA/Boogie Mark IV Lead channel", category: "amp", characteristics: "Mark IV Lead channel. Aggressive, tight high-gain tone with the Mark series signature midrange. Versatile EQ shaping with 5-band graphic EQ. Great for modern metal and progressive rock." },
  { id: "usa-mk-iv-rhythm-1", label: "USA MK IV RHYTHM 1", basedOn: "MESA/Boogie Mark IV Rhythm 1 channel", category: "amp", characteristics: "Mark IV Rhythm 1 channel. Clean to low-gain crunch. Warm, articulate cleans that transition smoothly into mild overdrive. Excellent pedal platform." },
  { id: "usa-mk-iv-rhythm-2", label: "USA MK IV RHYTHM 2", basedOn: "MESA/Boogie Mark IV Rhythm 2 channel", category: "amp", characteristics: "Mark IV Rhythm 2 channel. Higher gain rhythm voicing than Rhythm 1. Crunchier, more aggressive rhythm tones with the Mark series character and 5-band graphic EQ." },
  { id: "usa-mk-v-green", label: "USA MK V GREEN", basedOn: "MESA/Boogie Mark V Green mode", category: "amp", characteristics: "Mark V Green mode. Clean to edge-of-breakup tones. The most versatile clean channel in the Mark V with Fender-like sparkle and Mesa warmth." },
  { id: "usa-mk-v-red-mkv", label: "USA MK V RED MKV", basedOn: "MESA/Boogie Mark V Red MkV mode", category: "amp", characteristics: "Mark V Red channel in MkV voicing. High-gain modern Mesa lead tone. Combines Mark IIC+ heritage with updated circuit design for tighter, more refined high-gain." },
  { id: "usa-mk-v-red-iic-plus", label: "USA MK V RED IIC+", basedOn: "MESA/Boogie Mark V Red IIC+ mode", category: "amp", characteristics: "Mark V Red channel in IIC+ voicing. Classic Mark IIC+ high-gain character within the Mark V platform. Legendary Metallica-style tone with modern refinements." },
  { id: "usa-mk-v-red-mkiv", label: "USA MK V RED MKIV", basedOn: "MESA/Boogie Mark V Red Mark IV mode", category: "amp", characteristics: "Mark V Red channel in Mark IV voicing. Aggressive, tight high-gain with the Mark IV's distinctive midrange scoop and presence. Great for modern progressive and thrash metal." },
  { id: "usa-mk-v-red-xt", label: "USA MK V RED XT", basedOn: "MESA/Boogie Mark V Red Xtreme mode", category: "amp", characteristics: "Mark V Red channel in Xtreme mode. Maximum gain from the Mark V platform. Ultra-saturated, tight, modern high-gain for the heaviest applications." },
  { id: "usa-pre-clean", label: "USA PRE CLEAN", basedOn: "MESA/Boogie Studio Preamp Clean", category: "amp", characteristics: "Mesa Studio Preamp clean channel. Rackmount preamp with warm, articulate clean tones. Popular in the late 80s and 90s studio and rack rigs." },
  { id: "usa-pre-lo1-red", label: "USA PRE LO1 RED", basedOn: "MESA/Boogie Studio Preamp Lead OD1 Red", category: "amp", characteristics: "Mesa Studio Preamp Lead channel OD1 Red mode. Medium-high gain with classic Mesa crunch character. Saturated, singing lead tone with smooth midrange." },
  { id: "usa-pre-lo2-green", label: "USA PRE LO2 GREEN", basedOn: "MESA/Boogie Studio Preamp Lead OD2 Green", category: "amp", characteristics: "Mesa Studio Preamp Lead channel OD2 Green mode. Lower gain option on the OD2 circuit. Vintage-inspired overdrive with Mesa character. Great for classic rock." },
  { id: "usa-pre-lo2-yellow", label: "USA PRE LO2 YELLOW", basedOn: "MESA/Boogie Studio Preamp Lead OD2 Yellow", category: "amp", characteristics: "Mesa Studio Preamp Lead channel OD2 Yellow mode. Medium gain on the OD2 circuit. Balanced crunch-to-lead tone with articulate note definition." },
  { id: "usa-pre-ld2-red", label: "USA PRE LD2 RED", basedOn: "MESA/Boogie Studio Preamp Lead LD2 Red", category: "amp", characteristics: "Mesa Studio Preamp LD2 Red mode. Higher gain lead voicing from the rack preamp. Saturated, singing lead tone with classic Mesa character and rich harmonics." },
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
  { id: "legend-100", label: "LEGEND 100", basedOn: "Carvin Legacy VL100", category: "amp", characteristics: "Steve Vai's signature Carvin Legacy 100W. Versatile 3-channel design with clean, medium, and high gain. Balanced EQ with smooth, articulate character." },

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

  { id: "friedman-be", label: "FRIEDMAN BE", basedOn: "Friedman BE-100", category: "amp", characteristics: "Friedman BE-100. Hot-rodded Marshall on steroids with massive gain and tight response. Voicing switch (V1/V2/V3) selects different circuit voicings within the model — V1 is the original, V2 is refined with improved clarity, V3 is the latest evolution with the best dynamic response. Fat switch adds low-end depth and midrange body. SAT switch adds clipping for more compression and sustain." },
  { id: "friedman-hbe", label: "FRIEDMAN HBE", basedOn: "Friedman HBE", category: "amp", characteristics: "Friedman HBE (Hairy Brown Eye). Even more saturation and compression than the BE. Extended gain range for extreme applications. Voicing switch (V1/V2/V3) selects different circuit voicings within the model. Fat switch adds massive low-end. Wall of gain for heavy music." },
  { id: "friedman-small-box", label: "FRIEDMAN SMALL BOX", basedOn: "Friedman Smallbox", category: "amp", characteristics: "50W EL34 Friedman. More Marshall-like than BE, with a tighter, more focused sound. Great for classic rock to hard rock with vintage-inspired character." },
  { id: "dirty-shirley-1", label: "DIRTY SHIRLEY 1", basedOn: "40W Friedman Dirty Shirley", category: "amp", characteristics: "Friedman's Plexi/JTM-45 inspired design. Lower gain than BE but with rich, fat tone. Cleans up beautifully with guitar volume. Vintage classic rock character." },
  { id: "dirty-shirley-2", label: "DIRTY SHIRLEY 2", basedOn: "40W Friedman Dirty Shirley", category: "amp", characteristics: "Alternate voicing of the Dirty Shirley with different component values. Slightly more aggressive than model 1 with different gain structure." },

  // ═══════════════════════════════════════════
  // CAMERON
  // ═══════════════════════════════════════════

  { id: "cameron-ccv-1", label: "CAMERON CCV 1", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Cameron CCV Channel 1. Clean to mild crunch. Mark Cameron's hot-rodded Marshall with Plexi heritage. Open, dynamic, touch-sensitive." },
  { id: "cameron-ccv-2", label: "CAMERON CCV 2", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Cameron CCV Channel 2. Higher gain setting. Tight, aggressive crunch with refined Marshall character. Great for hard rock and lead work." },
  { id: "atomica-high", label: "ATOMICA HIGH", basedOn: "Cameron Atomica", category: "amp", characteristics: "Cameron Atomica high gain channel. Tight, aggressive, modern voicing. High-gain metal tones with extreme precision." },
  { id: "atomica-low", label: "ATOMICA LOW", basedOn: "Cameron Atomica", category: "amp", characteristics: "Cameron Atomica low gain channel. More crunch-oriented, dynamic response. Great for rhythm work and classic rock tones." },

  // ═══════════════════════════════════════════
  // BOGNER
  // ═══════════════════════════════════════════

  { id: "euro-blue", label: "EURO BLUE", basedOn: "Bogner Ecstasy 20th Anniversary", category: "amp", characteristics: "Bogner Ecstasy Blue channel. Beautiful crunch, very dynamic. Excellent clean-to-crunch range with refined European voicing." },
  { id: "euro-red", label: "EURO RED", basedOn: "Bogner Ecstasy 20th Anniversary", category: "amp", characteristics: "Bogner Ecstasy Red channel. Refined high-gain with smooth, articulate character. Complex harmonics and singing sustain." },
  { id: "euro-uber", label: "EURO UBER", basedOn: "Bogner Uberschall", category: "amp", characteristics: "Bogner's high-gain monster. Extremely tight bass response, aggressive midrange. Designed for modern heavy tones with EL34 power tubes." },
  { id: "shiver-clean", label: "SHIVER CLEAN", basedOn: "Bogner Shiva 20th Anniversary", category: "amp", characteristics: "Bogner Shiva clean channel. Crystalline, bell-like cleans with EL34 warmth. Beautiful, shimmering clean tones with British character." },
  { id: "shiver-lead", label: "SHIVER LEAD", basedOn: "Bogner Shiva 20th Anniversary", category: "amp", characteristics: "Bogner Shiva lead channel. Smooth, creamy gain with excellent note articulation. Classic rock to hard rock with refined European voicing." },
  { id: "bogfish-brown", label: "BOGFISH BROWN", basedOn: "Bogner Fish preamp", category: "amp", characteristics: "Bogner Fish preamp Brown channel. Rich, complex harmonic content with warm, saturated overdrive. Boutique preamp character." },
  { id: "bogfish-strato", label: "BOGFISH STRATO", basedOn: "Bogner Fish preamp", category: "amp", characteristics: "Bogner Fish preamp Strato channel. Brighter, more Fender-inspired voicing from the Bogner preamp. Clean to moderate gain with articulate response." },

  // ═══════════════════════════════════════════
  // DIEZEL
  // ═══════════════════════════════════════════

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

  { id: "angle-severe", label: "ANGLE SEVERE", basedOn: "Engl Savage 120", category: "amp", characteristics: "Engl Savage 120. German high-gain precision. Tight, articulate with multiple gain stages. Well-suited for technical metal and progressive styles." },
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
  { id: "ac-20", label: "AC-20", basedOn: "Morgan AC20 Deluxe", category: "amp", characteristics: "Morgan AC20 Deluxe. Vox-inspired boutique with refined character. Chimey, detailed, uniquely responsive with EF86 or 12AX7 preamp tube options." },

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
  { id: "archean-clean", label: "ARCHEAN CLEAN", basedOn: "100W PRS Archon", category: "amp", characteristics: "PRS Archon clean channel. Warm, clear cleans with excellent headroom. Surprisingly versatile clean tones from a high-gain amp." },

  // ═══════════════════════════════════════════
  // REVV
  // ═══════════════════════════════════════════

  { id: "revv-gen-green", label: "REVV GEN GREEN", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Green channel. Clean to medium crunch. Aggression switch (1/2/3) increases gain and saturation progressively — 1 is clean/low crunch foundation, 2 is light crunch with dynamic response, 3 is medium crunch for classic rock. Modern, tight, with excellent clarity." },
  { id: "revv-gen-purple", label: "REVV GEN PURPLE", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Purple channel. Medium to extreme high gain. Aggression switch (1/2/3) increases gain and saturation — 1 is medium gain with aggressive character, 2 is high gain with crushing tight response, 3 is maximum saturation with tight focused low-end. The high-gain monster of the Generator." },
  { id: "revv-gen-red", label: "REVV GEN RED", basedOn: "REVV GENERATOR 120 MKIII", category: "amp", characteristics: "REVV Generator Red channel. High gain lead voicing. Aggression switch (1/2/3) increases gain — 1 is high gain with smooth singing sustain, 2 is very high gain with extreme saturation, 3 is maximum gain for ultra-heavy extreme metal. Tight, defined response at all settings." },

  // ═══════════════════════════════════════════
  // DUMBLE / ODS
  // ═══════════════════════════════════════════

  { id: "ods-100-clean", label: "ODS-100 CLEAN", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS Clean channel. Legendary boutique clean tone. Warm, round, incredibly touch-sensitive. The holy grail of clean tones." },
  { id: "ods-100-ford", label: "ODS-100 FORD", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS voiced for Robben Ford. Smooth, liquid overdrive with vocal midrange. The quintessential jazz-blues fusion tone." },
  { id: "ods-100-hrm", label: "ODS-100 HRM", basedOn: "Dumble Overdrive Special", category: "amp", characteristics: "Dumble ODS HRM (Hot Rubber Monkey) voicing. Rock-oriented Dumble tone with more gain and midrange push. Used by many blues-rock players." },

  // ═══════════════════════════════════════════
  // BOUTIQUE & OTHER
  // ═══════════════════════════════════════════

  { id: "big-hair", label: "BIG HAIR", basedOn: "Custom model", category: "amp", characteristics: "Fractal's custom model designed for quintessential 80s rock tones. Think big hair bands with hot-rodded Marshall character and singing sustain." },
  { id: "blankenship-leeds", label: "BLANKENSHIP LEEDS", basedOn: "Dweezil Zappa's Blankenship Leeds 21", category: "amp", characteristics: "Roy Blankenship's boutique design owned by Dweezil Zappa. 21W with unique circuit topology. Open, dynamic, harmonically rich with vintage-inspired character." },
  { id: "bludojai-clean", label: "BLUDOJAI CLEAN", basedOn: "Bludotone Ojai", category: "amp", characteristics: "Bludotone Ojai Clean channel. 100W 6L6 boutique amp. Same schematic as the famous 'Tan' amp. Warm, pristine cleans with incredible touch sensitivity." },
  { id: "bludojai-lead", label: "BLUDOJAI LEAD", basedOn: "Bludotone Ojai", category: "amp", characteristics: "Bludotone Ojai Lead channel. Dumble-inspired overdrive. Smooth, vocal-like saturation. Extremely touch-sensitive, great for blues and jazz." },
  { id: "buddah-duomaster", label: "BUDDAH DUOMASTER", basedOn: "Budda Twinmaster", category: "amp", characteristics: "Simple, pure tube tone. Class A, single-ended. Extremely touch-sensitive with pure, uncolored amplification." },
  { id: "ca3-plus-clean", label: "CA3+ CLEAN", basedOn: "Custom Audio Amplifiers 3+ SE preamp", category: "amp", characteristics: "CA3+ SE Clean channel. Bob Bradshaw's high-end preamp. Studio-quality clean tone with excellent definition and headroom." },
  { id: "ca3-plus-lead", label: "CA3+ LEAD", basedOn: "Custom Audio Amplifiers 3+ SE preamp", category: "amp", characteristics: "CA3+ SE Lead channel. Smooth, singing lead tones. High-gain with excellent articulation. Used by many session players and touring professionals." },
  { id: "ca3-plus-rhythm", label: "CA3+ RHYTHM", basedOn: "Custom Audio Amplifiers 3+ SE preamp", category: "amp", characteristics: "CA3+ SE Rhythm channel. Medium gain crunch. Tight, punchy rhythm tones from the boutique rack preamp." },
  { id: "captain-hook-1", label: "CAPTAIN HOOK 1", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 1. 100W boutique with unique mu-follower circuit. Open, smooth distortion without typical cathode follower compression." },
  { id: "captain-hook-2", label: "CAPTAIN HOOK 2", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 2. Medium gain with the unique mu-follower character. Smooth, dynamic overdrive. Richard Hallebeek's signature amp." },
  { id: "captain-hook-3", label: "CAPTAIN HOOK 3", basedOn: "Hook Captain 34", category: "amp", characteristics: "Hook Captain 34 Channel 3. High gain with the Captain's unique tonal character. Smooth, fluid distortion with excellent note definition." },
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
  { id: "fox-ods", label: "FOX ODS", basedOn: "Fuchs Overdrive Supreme 50", category: "amp", characteristics: "Dumble-inspired boutique design. Sweet, vocal overdrive with bell-like cleans. Warm, touch-sensitive, great for blues and fusion." },
  { id: "fryette-d60", label: "FRYETTE D60", basedOn: "Fryette Deliverance 60 Series II", category: "amp", characteristics: "Fryette Deliverance 60 Series II. Tight, aggressive character with versatile gain range. Great for hard rock to modern metal with Fryette's signature precision." },
  { id: "gibtone-scout", label: "GIBTONE SCOUT", basedOn: "Gibson GA17RVT Scout", category: "amp", characteristics: "Vintage Gibson Scout combo. Warm, vintage American tone with built-in reverb and tremolo. Unique voicing distinct from Fender. Great for roots and blues." },
  { id: "hot-kitty", label: "HOT KITTY", basedOn: "Bad Cat Hot Cat 30", category: "amp", characteristics: "Bad Cat Hot Cat 30W. Class A with EL34 power tubes. Versatile from chimey cleans to thick crunch. Touch-sensitive with rich harmonics." },
  { id: "jazz-120", label: "JAZZ 120", basedOn: "Roland Jazz Chorus 120", category: "amp", characteristics: "Legendary solid-state clean amp. Pristine, crystal-clear cleans with built-in chorus. The standard for ultra-clean, stereo guitar tones. Jazz and new wave staple." },
  { id: "chiefman", label: "CHIEFMAN", basedOn: "Matchless Chieftain", category: "amp", characteristics: "Matchless Chieftain. Class A boutique with EF86 preamp tube. Rich, complex harmonics with stunning touch response and dynamic character." },
  { id: "matchbox-d-30", label: "MATCHBOX D-30", basedOn: "Matchless DC-30", category: "amp", characteristics: "Matchless DC-30. Dual-channel Class A boutique. Vox-inspired but with its own refined character. Chimey cleans and rich, complex overdrive." },
  { id: "matchbox-d-30-ef86", label: "MATCHBOX D-30 EF86", basedOn: "Matchless DC-30", category: "amp", characteristics: "Matchless DC-30 with EF86 preamp tube. The EF86 adds unique harmonic richness and earlier breakup. Warm, fat tone with vintage Class A character." },
  { id: "mr-z-highway-66", label: "MR Z HIGHWAY 66", basedOn: "Dr. Z Route 66", category: "amp", characteristics: "Dr. Z Route 66. EL84-powered boutique with American voicing and British power section. Warm, dynamic, responsive to pick dynamics." },
  { id: "mr-z-mz-38", label: "MR Z MZ-38", basedOn: "Dr. Z Maz 38 SR", category: "amp", characteristics: "Dr. Z Maz 38 Senior. Warm, dynamic, incredibly responsive. EL84 power tubes. Great for blues, roots, and classic rock." },
  { id: "mr-z-mz-8", label: "MR Z MZ-8", basedOn: "Dr. Z Maz 8", category: "amp", characteristics: "Dr. Z Maz 8. Small, low-wattage boutique. Single EL84 power tube for beautiful breakup at low volumes. Perfect for studio recording." },
  { id: "nuclear-tone", label: "NUCLEAR-TONE", basedOn: "Swart Atomic Space Tone", category: "amp", characteristics: "Boutique Class A amp with unique tremolo and reverb. Warm, lush cleans. EL84 powered. Great for indie, ambient, and vintage tones." },
  { id: "ruby-rocket", label: "RUBY ROCKET", basedOn: "Paul Ruby Rocket", category: "amp", characteristics: "Paul Ruby boutique amp. EL84-powered with unique voicing. Dynamic, responsive, with warm, musical breakup." },
  { id: "spawn-nitrous-1", label: "SPAWN NITROUS 1", basedOn: "Splawn Nitro", category: "amp", characteristics: "Splawn Nitro channel 1. Hot-rodded Marshall-inspired high-gain. Tight, aggressive, with massive gain on tap. Modern American metal." },
  { id: "spawn-nitrous-2", label: "SPAWN NITROUS 2", basedOn: "Splawn Nitro", category: "amp", characteristics: "Splawn Nitro channel 2. Higher gain voicing. Even more saturated and aggressive than channel 1. Crushing rhythm and lead tones." },
  { id: "spawn-q-rod-od1", label: "SPAWN Q-ROD OD1", basedOn: "Splawn Quickrod", category: "amp", characteristics: "Splawn Quickrod OD1 channel. Hot-rodded Marshall character with tight, punchy crunch. American aggressiveness with versatile gain range." },
  { id: "spawn-q-rod-od2", label: "SPAWN Q-ROD OD2", basedOn: "Splawn Quickrod", category: "amp", characteristics: "Splawn Quickrod OD2 channel. High-gain channel with more saturation than OD1. Aggressive, tight modern rock and metal tones." },
  { id: "suhr-badger-18", label: "SUHR BADGER 18", basedOn: "Suhr Badger 18", category: "amp", characteristics: "18W EL84-powered boutique. Marshall-inspired with refined voicing. Great crunch at manageable volumes with smooth, musical breakup." },
  { id: "suhr-badger-30", label: "SUHR BADGER 30", basedOn: "Suhr Badger 30", category: "amp", characteristics: "30W Suhr Badger. More headroom than the 18W with the same refined character. Versatile from clean to crunch with excellent dynamics." },
  { id: "supremo-trem", label: "SUPREMO TREM", basedOn: "Supro 1964T", category: "amp", characteristics: "Vintage Supro 1964T. Raw, gritty, lo-fi character. Famous as one of Jimmy Page's secret weapons. Unique, compressed breakup at low volumes." },
  { id: "supro-black-magick", label: "SUPRO BLACK MAGICK", basedOn: "Supro 1695T Black Magick", category: "amp", characteristics: "Supro Black Magick. Modern reissue with vintage Supro character. Raw, aggressive, with thick midrange. Single-channel simplicity with built-in reverb." },
  { id: "two-stone-j35", label: "TWO STONE J35", basedOn: "Two-Rock Jet 35", category: "amp", characteristics: "Two-Rock Jet 35 boutique. Refined, Fender-influenced design. Sparkling cleans with sweet overdrive. Touch-sensitive with complex harmonics." },

  // ═══════════════════════════════════════════
  // BASS AMPS
  // ═══════════════════════════════════════════

  { id: "sv-bass-1", label: "SV BASS 1", basedOn: "Ampeg SVT bass amp", category: "amp", characteristics: "Ampeg SVT channel 1. The industry-standard bass amp. Massive, warm, with authoritative low-end. Tube-driven bass tone for rock and beyond." },
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
  { id: "77-custom-od", label: "77 CUSTOM OD", basedOn: "MXR M77 Custom Badass Modified O.D.", category: "drive", characteristics: "Modified MXR OD circuit with 100Hz bass control. More gain and tonal flexibility than standard MXR drives." },
  { id: "angry-chuck", label: "ANGRY CHUCK", basedOn: "JHS Angry Charlie V3", category: "drive", characteristics: "Marshall-in-a-box distortion with huge gain range. JCM800-like voicing from clean boost to heavy distortion. Volume/Drive/Tone/Presence." },
  { id: "bb-pre", label: "BB PRE", basedOn: "Xotic BB Preamp", category: "drive", characteristics: "Wide-range preamp/overdrive. Huge gain range, transparent to saturated. Two-band EQ for tone shaping." },
  { id: "bb-pre-at", label: "BB PRE AT", basedOn: "Xotic BB Preamp AT", category: "drive", characteristics: "Andy Timmons signature BB Preamp. Refined gain structure, more focused midrange. Same circuit with different component values." },
  { id: "bender-fuzz", label: "BENDER FUZZ", basedOn: "Sola Sound / Vox Tone Bender MkII", category: "drive", characteristics: "Aggressive germanium fuzz. More biting and raspy than Fuzz Face. Jimmy Page, Jeff Beck early tones." },
  { id: "bit-crusher", label: "BIT CRUSHER", basedOn: "Fractal Audio custom model", category: "drive", characteristics: "Digital bit-reduction effect. Reduces bit depth for lo-fi, retro digital distortion textures." },
  { id: "blackglass-7k", label: "BLACKGLASS 7K", basedOn: "Darkglass Microtubes B7K", category: "drive", characteristics: "Modern bass preamp/distortion. Tight, aggressive, with blend and active EQ. Metal and modern bass standard." },
  { id: "blues-od", label: "BLUES OD", basedOn: "Marshall Bluesbreaker Mk1", category: "drive", characteristics: "The original Bluesbreaker overdrive. Transparent, amp-like breakup. Foundation circuit for JHS Morning Glory, King of Tone, and many others. Smooth, dynamic, great stacker." },
  { id: "bosom-boost", label: "BOSOM BOOST", basedOn: "Friedman Buxom Boost", category: "drive", characteristics: "Clean boost with tight low end and sparkly top. Great for pushing amps into natural breakup. Simple Volume + Tight controls." },
  { id: "box-o-crunch", label: "BOX O'CRUNCH", basedOn: "MI Audio Crunch Box V1", category: "drive", characteristics: "High-gain distortion with Marshall-like voicing. Thick, chunky, great for heavy rhythm. Based on the Shredmaster circuit." },
  { id: "colortone-booster", label: "COLORTONE BOOSTER", basedOn: "Colorsound Power Boost", category: "drive", characteristics: "Loud, colored boost. Adds harmonics and grit when pushed. Jeff Beck's secret weapon for aggressive lead tones into clean amps." },
  { id: "colortone-od", label: "COLORTONE OD", basedOn: "Colorsound Overdriver", category: "drive", characteristics: "Vintage British overdrive. Thick, woolly tone with lots of sustain. More gain than the Power Boost version." },
  { id: "compulsion-dist", label: "COMPULSION DIST", basedOn: "Fulltone OCD", category: "drive", characteristics: "Versatile MOSFET overdrive/distortion with HP/LP switch. HP (High Peak) mode is brighter and more cutting with wider frequency response. LP (Low Peak) mode is warmer, more compressed with rolled-off highs. Wide gain range from clean boost to heavy distortion." },
  { id: "ds1-distortion", label: "DS1 DISTORTION", basedOn: "Boss DS-1 Distortion", category: "drive", characteristics: "Op-amp based hard clipping distortion. Bright, aggressive, defined. Kurt Cobain, Steve Vai early tones." },
  { id: "ds1-distortion-mod", label: "DS1 DISTORTION MOD", basedOn: "Modified Boss DS-1 Distortion", category: "drive", characteristics: "Modded DS-1 with improved frequency response. Less fizzy highs, tighter bass, more usable gain range." },
  { id: "esoteric-acb", label: "ESOTERIC ACB", basedOn: "Xotic AC Booster", category: "drive", characteristics: "Full-range boost/overdrive. Rich harmonic content, flat EQ response. Stacks well with other drives." },
  { id: "esoteric-bass-rcb", label: "ESOTERIC BASS RCB", basedOn: "Xotic Bass RC Booster", category: "drive", characteristics: "Bass-optimized clean boost. Extended low frequency response, active EQ. Preserves low-end clarity." },
  { id: "esoteric-rcb", label: "ESOTERIC RCB", basedOn: "Xotic RC Booster v1", category: "drive", characteristics: "Clean boost with slight coloring. Adds sparkle and harmonic richness. Great always-on pedal." },
  { id: "eternal-love", label: "ETERNAL LOVE", basedOn: "Lovepedal Eternity", category: "drive", characteristics: "Transparent overdrive similar to Timmy/TS hybrid. Tight, focused, with adjustable bass and treble." },
  { id: "face-fuzz", label: "FACE FUZZ", basedOn: "Dallas-Arbiter Fuzz Face", category: "drive", characteristics: "Classic fuzz with Fuzz and Volume controls. Cleans up with guitar volume. Hendrix, Gilmour, SRV tones." },
  { id: "fas-boost", label: "FAS BOOST", basedOn: "Fractal Audio custom clean boost", category: "drive", characteristics: "Fractal's custom transparent boost. Pure volume increase with minimal coloration. Great utility drive." },
  { id: "fas-led-drive", label: "FAS LED-DRIVE", basedOn: "Fractal Audio custom LED clipping drive", category: "drive", characteristics: "Custom drive using LED clipping diodes. Higher headroom than silicon, smooth compression. Modern feel." },
  { id: "fat-rat", label: "FAT RAT", basedOn: "Modified Pro Co RAT with LED clipping", category: "drive", characteristics: "RAT variant with LED clipping instead of silicon. Fatter, smoother distortion with more headroom. Less fizzy." },
  { id: "fet-boost", label: "FET BOOST", basedOn: "Fractal Audio custom FET boost", category: "drive", characteristics: "FET-based clean boost. Slight warmth and compression at higher settings. Natural-sounding level increase." },
  { id: "fet-preamp", label: "FET PREAMP", basedOn: "Boss FA-1 FET Amplifier", category: "drive", characteristics: "FET preamp/boost with tone control. The Edge's secret weapon on early U2 recordings. Adds sparkle and presence." },
  { id: "full-od", label: "FULL OD", basedOn: "Fulltone Full-Drive 2", category: "drive", characteristics: "Dual-mode overdrive with boost. MOSFET clipping, mid-rich tone. CompCut and Flat/Vintage modes." },
  { id: "gauss-drive", label: "GAUSS DRIVE", basedOn: "Mesa Flux-Drive", category: "drive", characteristics: "Mesa's take on overdrive. Warm, thick, with Mesa's signature midrange. Good for stacking with Mesa amps." },
  { id: "griddle-cake", label: "GRIDDLE CAKE", basedOn: "Crowther Hot Cake", category: "drive", characteristics: "New Zealand-designed overdrive. Unique clipping, very touch-sensitive. Goes from clean boost to thick distortion." },
  { id: "guardian-photon-speed", label: "GUARDIAN PHOTON SPEED", basedOn: "Greer Lightspeed", category: "drive", characteristics: "Transparent amp-like overdrive. Very dynamic, responds to pick attack. Clean boost to medium gain." },
  { id: "hard-fuzz", label: "HARD FUZZ", basedOn: "Fractal Audio custom hard-clipping fuzz", category: "drive", characteristics: "Custom aggressive fuzz with hard clipping. More abrupt, gated fuzz texture. Modern, aggressive." },
  { id: "heartpedal-11", label: "HEARTPEDAL 11", basedOn: "Lovepedal OD11 / Amp Eleven", category: "drive", characteristics: "Amp-in-a-box overdrive. Recreates pushed amp tone at any volume. Warm, natural breakup." },
  { id: "hoodoo-drive", label: "HOODOO DRIVE", basedOn: "Voodoo Lab Overdrive", category: "drive", characteristics: "Warm overdrive with mid-focused voice. Smooth, bluesy character. Good for classic rock rhythm." },
  { id: "horizon-precision", label: "HORIZON PRECISION DRIVE", basedOn: "Horizon Devices Precision Drive", category: "drive", characteristics: "Modern metal tight boost with noise gate. Attack knob controls pick response. Designed for djent and modern metal. Misha Mansoor signature." },
  { id: "integral-pre", label: "INTEGRAL PRE", basedOn: "TC Electronic Integrated Preamp", category: "drive", characteristics: "Studio preamp/boost. Clean, hi-fi sound with slight warmth. Transparent signal conditioning." },
  { id: "jam-ray", label: "JAM RAY", basedOn: "Vemuram Jan Ray", category: "drive", characteristics: "Transparent low-gain overdrive. Very dynamic, amp-like. Favorite of many Nashville session players. Dumble-inspired voicing." },
  { id: "klone-chiron", label: "KLONE CHIRON", basedOn: "Klon Centaur / KTR", category: "drive", characteristics: "Transparent overdrive with clean blend. Adds subtle compression and harmonics without changing core tone. The gold standard." },
  { id: "m-zone-dist", label: "M-ZONE DISTORTION", basedOn: "Boss MT-2 Metal Zone", category: "drive", characteristics: "Parametric mid EQ distortion. Massive gain, scoopable mids. Widely used for extreme metal. Better than its reputation." },
  { id: "master-fuzz", label: "MASTER FUZZ", basedOn: "Gibson Maestro Fuzz-Tone FZ-1A", category: "drive", characteristics: "The original fuzz pedal. Harsh, buzzy, gated fuzz. Rolling Stones Satisfaction riff. Very different from Fuzz Face." },
  { id: "maxon-808", label: "MAXOFF 808", basedOn: "Maxon OD-808", category: "drive", characteristics: "Original Tube Screamer circuit by Maxon. Slightly different component values than Ibanez reissues. Tighter, more focused." },
  { id: "mcmlxxxi-drv", label: "MCMLXXXI DRV", basedOn: "1981 Inventions DRV", category: "drive", characteristics: "Modern high-headroom overdrive/distortion. Inspired by the Rat but refined. Huge dynamic range, can do clean boost to heavy saturation. Studio-quality tone." },
  { id: "micro-boost", label: "MICRO BOOST", basedOn: "MXR Micro Amp", category: "drive", characteristics: "Simple clean boost. Single Gain knob. Transparent volume increase. Classic always-on booster." },
  { id: "mid-boost", label: "MID BOOST", basedOn: "Fractal Audio custom mid boost", category: "drive", characteristics: "Custom midrange boost. Pushes mids for cutting through a mix. Good for lead work." },
  { id: "mosfet-dist", label: "MOSFET DISTORTION", basedOn: "Ibanez MT10 Mostortion", category: "drive", characteristics: "MOSFET-based distortion. Warm, thick, with lots of sustain. Unique clipping character distinct from silicon or germanium." },
  { id: "no-amp-bass-di", label: "NO-AMP BASS DI", basedOn: "Tech 21 SansAmp Bass Driver DI", category: "drive", characteristics: "Bass amp simulator/DI. Provides amp-like tone without an amp. Blend, Drive, and multi-band EQ. Studio bass standard." },
  { id: "no-amp-bass-pre", label: "NO-AMP BASS PRE", basedOn: "Tech 21 SansAmp Bass Driver DI (preamp mode)", category: "drive", characteristics: "SansAmp in preamp mode. More gain, different EQ voicing. For bass players wanting more drive." },
  { id: "nobellium-ovd1", label: "NOBELLIUM OVD-1", basedOn: "Nobels ODR-1 BC Natural Overdrive", category: "drive", characteristics: "Natural overdrive with unique Spectrum knob. Cuts bass going into clipping for clarity. Country/Nashville secret weapon." },
  { id: "octave-dist", label: "OCTAVE DISTORTION", basedOn: "Tycobrahe Octavia", category: "drive", characteristics: "Octave-up fuzz. Ring modulator-like harmonics above 12th fret. Jimi Hendrix Purple Haze solo tones." },
  { id: "od-250", label: "OD 250", basedOn: "DOD Overdrive Preamp 250 (reissue)", category: "drive", characteristics: "Simple 2-knob overdrive. Op-amp clipping with germanium diodes. Raw, unrefined drive character." },
  { id: "od-250-gray", label: "OD 250 GRAY", basedOn: "DOD Overdrive Preamp 250 (original gray)", category: "drive", characteristics: "Original DOD 250 with LM741 op-amp. Slightly different character than reissue. More compressed, darker." },
  { id: "od-one", label: "OD-ONE OVERDRIVE", basedOn: "Boss OD-1 Over Drive", category: "drive", characteristics: "Original Boss overdrive. Predecessor to SD-1. Symmetric clipping, smoother than SD-1. Vintage Japanese overdrive." },
  { id: "paradigm-shifter", label: "PARADIGM SHIFTER", basedOn: "Barber Electronics Gain Changer", category: "drive", characteristics: "Transparent overdrive with wide gain range. Very amp-like breakup. Internal voltage doubler for more headroom." },
  { id: "pi-fuzz", label: "PI FUZZ", basedOn: "Electro-Harmonix Big Muff Pi", category: "drive", characteristics: "Massive sustaining fuzz with 4 switchable modes. Classic: current production Big Muff with scooped mids and huge sustain. Triangle: 1971 era, smoother, more open, less scooped mids (David Gilmour). Ram's Head: mid-70s, tighter, more aggressive, brighter (J Mascis, Smashing Pumpkins). Russian: darker, thicker, more bass, less treble bite (Dan Auerbach / Black Keys). Wall of fuzz tone across all modes." },
  { id: "pi-fuzz-bass", label: "PI FUZZ - BASS", basedOn: "Electro-Harmonix Deluxe Bass Big Muff", category: "drive", characteristics: "Bass-optimized Big Muff with clean blend. Retains low-end clarity while adding fuzz. Crossover filter design." },
  { id: "plus-dist", label: "PLUS DISTORTION", basedOn: "MXR Distortion+ / DOD 250", category: "drive", characteristics: "Simple raw distortion. Op-amp clipping with germanium diodes. Bright, aggressive, cuts through. Randy Rhoads." },
  { id: "rat-dist", label: "RAT DISTORTION", basedOn: "Pro Co RAT", category: "drive", characteristics: "Op-amp distortion with Filter control (works backwards). Light drive to heavy distortion. Unique harmonic content. Jeff Beck, James Hetfield." },
  { id: "royal-bass-di", label: "ROYAL BASS DI", basedOn: "Noble Preamp DI", category: "drive", characteristics: "High-end bass DI/preamp. Clean, detailed, studio-quality bass tone shaping." },
  { id: "sdd-preamp", label: "SDD PREAMP", basedOn: "Korg SDD-3000 preamp section", category: "drive", characteristics: "Preamp from the legendary Korg SDD-3000 delay. Adds subtle warmth and compression. The Edge's clean tone foundation." },
  { id: "shimmer-drive", label: "SHIMMER DRIVE", basedOn: "Bogner Wessex", category: "drive", characteristics: "Amp-like overdrive with rugged construction. Warm, touch-sensitive, natural breakup. Works great with single coils." },
  { id: "sunrise-splendor", label: "SUNRISE SPLENDOR", basedOn: "JHS Morning Glory", category: "drive", characteristics: "Transparent Marshall-style overdrive with Hi Cut / Normal switch. Normal mode is full-range, open, and amp-like. Hi Cut rolls off treble for warmer, darker tones. Based on the Bluesbreaker circuit but refined. Dynamic, cleans up beautifully with guitar volume. Excellent stacking pedal." },
  { id: "super-od", label: "SUPER OD", basedOn: "Boss SD-1 Super Overdrive", category: "drive", characteristics: "Asymmetric clipping TS variant. Slightly different harmonic content than TS808, more open top end. Budget classic." },
  { id: "t808-od", label: "T808 OD", basedOn: "Ibanez TS808 Tube Screamer", category: "drive", characteristics: "The original Tube Screamer. Mid-hump overdrive with soft clipping. Rolls off bass, boosts mids. THE standard for tightening amps." },
  { id: "t808-mod", label: "T808 MOD", basedOn: "Modified Ibanez TS808 Tube Screamer", category: "drive", characteristics: "Modded TS808 with extended frequency range. Less mid-hump, tighter bass, more open highs than stock." },
  { id: "tape-dist", label: "TAPE DISTORTION", basedOn: "Tape saturation / preamp distortion", category: "drive", characteristics: "Emulates overdriven tape machine saturation. Warm, compressed, soft clipping. Vintage recording flavor." },
  { id: "timothy", label: "TIMOTHY", basedOn: "Paul Cochrane Timmy", category: "drive", characteristics: "Transparent overdrive with treble and bass CUT controls. Very open, dynamic, doesn't color tone. Stacking favorite." },
  { id: "treble-boost", label: "TREB BOOST", basedOn: "Dallas Rangemaster Treble Booster", category: "drive", characteristics: "Germanium treble booster. Cuts bass, boosts upper mids and treble. Brian May, Tony Iommi's secret weapon into cranked amps." },
  { id: "zenith-drive", label: "ZENITH DRIVE", basedOn: "Hermida Zendrive", category: "drive", characteristics: "Dumble-inspired overdrive. Warm, smooth, vocal-like midrange. Great for blues and fusion. Robben Ford tones." },
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
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-jm45", "brit-jm45-jumped"],
    category: "amp",
    description: "Cascaded gain stages mod for non-master-volume Marshalls. Adds significantly more preamp gain while retaining the amp's core Plexi/JTM character. NOT applicable to JCM800 2203/2204 which already have cascaded stages from the factory.",
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
    appliesTo: ["brit-800-2204-high", "brit-800-2204-low", "brit-800-2203-high", "brit-800-2203-low", "brit-800-studio-20"],
    category: "amp",
    description: "Increase gain in a stock JCM 800 beyond stock levels for heavier tones. NOT applicable to models already marked 'MOD' or '#34' — those already have enhanced gain from the factory.",
    circuitChanges: "Add or increase cathode bypass cap on second preamp stage (from 0.68uF to 1uF or higher). Change coupling cap between stages for more bass into the clipping stages. Reduce the bright cap value to tame ice-pick highs at higher gain. Some versions add a clipping diode pair to ground after the second gain stage."
  },
  {
    id: "vox-top-boost",
    label: "Top Boost Mod",
    appliesTo: ["class-a-30w", "class-a-30w-bright", "class-a-30w-brilliant", "class-a-30w-hot", "ac-20"],
    category: "amp",
    description: "Add the classic Top Boost circuit to a normal-channel Vox for more treble and gain. NOT applicable to models already marked 'TB' (Top Boost) — those already have this circuit from the factory.",
    circuitChanges: "Add an extra triode gain stage with treble and bass cut controls after the first preamp stage. The Top Boost circuit adds a 12AX7 stage with adjustable high-frequency emphasis. This became standard on later AC30s but early models lacked it."
  },
  {
    id: "mesa-gain-mod",
    label: "Mesa Gain Structure Mod",
    appliesTo: ["usa-mk-iic-plus", "usa-mk-iic-plus-plus", "usa-jp-iic-plus-green", "usa-jp-iic-plus-red", "usa-jp-iic-plus-yellow", "usa-mk-iv-lead", "usa-mk-iv-rhythm-1", "usa-mk-iv-rhythm-2", "usa-mk-v-green", "usa-mk-v-red-mkv", "usa-mk-v-red-iic-plus", "usa-mk-v-red-mkiv", "usa-mk-v-red-xt", "usa-pre-clean", "usa-pre-lo1-red", "usa-pre-lo2-green", "usa-pre-lo2-yellow", "usa-pre-ld2-red", "recto1-orange-modern", "recto1-orange-normal", "recto1-red", "recto2-orange-modern", "recto2-orange-vintage", "recto2-red-modern", "recto2-red-vintage"],
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
    label: "Friedman SAT/Voice Circuit Exploration",
    appliesTo: ["friedman-be", "friedman-hbe"],
    category: "amp",
    description: "Understanding the Friedman's built-in SAT and Voice switches — these are stock features, not aftermarket mods. Knowing their circuit behavior helps translate settings to Fractal's Expert parameters.",
    circuitChanges: "SAT switch adds a clipping network in the preamp that compresses and saturates the signal. Without SAT, the amp is more open and dynamic (simulate via Fractal's Preamp Compression and Input Trim). Voice switch changes the high-frequency roll-off and bass response: one position is brighter with bigger bass, the other is darker with more midrange focus (simulate via Bright Cap and Hi-Cut parameters). These interact with each other significantly."
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
    appliesTo: ["t808-od", "t808-mod", "maxon-808", "super-od"],
    category: "drive",
    description: "Replace the stock silicon clipping diodes with alternatives for different saturation character.",
    circuitChanges: "Stock TS uses two 1N914/1N4148 silicon diodes in symmetric soft clipping. Swaps: Germanium diodes (1N34A) = lower clipping threshold, warmer, earlier breakup. LEDs = higher clipping threshold, more headroom, cleaner. Asymmetric (one silicon + one germanium) = more complex harmonics, tube-like. MOSFET clipping = very open, less compressed."
  },
  {
    id: "ts-bass-mod",
    label: "Bass Boost / Fat Mod",
    appliesTo: ["t808-od", "t808-mod", "maxon-808", "super-od"],
    category: "drive",
    description: "Increase bass response in a Tube Screamer circuit which normally rolls off low end.",
    circuitChanges: "Increase the input cap (C1) from 0.047uF to 0.1uF or higher to allow more bass into the circuit. Can also modify the feedback network cap to change how much bass is in the clipping stage. Some versions add a bass boost switch with selectable cap values."
  },
  {
    id: "rat-opamp-swap",
    label: "Op-Amp Swap",
    appliesTo: ["rat-dist", "fat-rat"],
    category: "drive",
    description: "Replace the RAT's op-amp for different gain and frequency response characteristics.",
    circuitChanges: "Stock vintage RAT uses LM308 (slow slew rate = natural compression and filtering of harsh harmonics). Modern RATs use OP07 (faster, brighter, more gain). Alternative: TL071 (very clean, bright, less compressed). LM308 vs OP07 is the most significant tonal difference in RATs. The slow slew rate of LM308 acts as a natural filter."
  },
  {
    id: "rat-clipping-mod",
    label: "Clipping Diode Mod",
    appliesTo: ["rat-dist", "fat-rat"],
    category: "drive",
    description: "Modify the RAT's hard clipping diodes for different distortion flavors.",
    circuitChanges: "Stock: 1N914 silicon diodes (hard, bright clipping). Germanium (1N34A): softer, warmer, earlier clipping. LEDs: much higher headroom, almost clean boost with grit. MOSFET: very open and dynamic. Turbo RAT mod: LEDs instead of silicon for more headroom and less compression. Remove diodes entirely for massive fuzzy overdrive."
  },
  {
    id: "fuzz-bias-mod",
    label: "Bias Adjustment",
    appliesTo: ["face-fuzz", "bender-fuzz"],
    category: "drive",
    description: "Adjust transistor bias point for different fuzz character.",
    circuitChanges: "Adjust the collector voltage of Q2 (typically via the bias resistor from collector to V+). Stock Fuzz Face biases Q2 collector at about -4.5V (germanium). Starved bias (lower voltage) = sputtery, gated, velcro-like fuzz. Hot bias (higher voltage) = smoother, more sustain, less gated. Temperature affects germanium bias significantly."
  },
  {
    id: "fuzz-input-cap",
    label: "Input Cap / Bass Mod",
    appliesTo: ["face-fuzz"],
    category: "drive",
    description: "Modify the Fuzz Face input cap to change low-end response.",
    circuitChanges: "Stock Fuzz Face uses a 2.2uF input cap. Increasing to 10uF or higher allows more bass through, creating a fatter, heavier fuzz. Decreasing tightens the bass for a more focused, less flubby sound. This is critical for bass-heavy rigs or downtuned guitars where stock Fuzz Face gets muddy."
  },
  {
    id: "muff-tone-mod",
    label: "Tone Stack Mod",
    appliesTo: ["pi-fuzz", "pi-fuzz-bass"],
    category: "drive",
    description: "Modify the Big Muff's tone circuit to reduce the mid-scoop. IMPORTANT: The Big Muff's Tone knob does NOT work like a normal tone control — it sweeps between a bass cap and a treble cap, and mids are scooped at ALL Tone positions. Simply turning the Tone knob up does NOT reduce the mid-scoop; it just shifts from bassy to trebly while keeping the mid-scoop. The real mod involves adding a mid-boost pot or changing cap values in the tone stack circuit itself.",
    circuitChanges: "Stock Big Muff has a severe mid-scoop from its passive tone stack. The Tone pot is wired between two caps — one passes bass, one passes treble — and the midrange is always attenuated regardless of the Tone position. The mod adds a variable resistor (mid-boost pot) across the tone caps that allows midrange to pass through, effectively filling in the scoop. Alternatively, reducing the tone cap values narrows the bandwidth of the scoop. The 'flat mids' mod bypasses part of the tone stack for more midrange presence. On Fractal, the drive block's Tone parameter emulates the stock Big Muff tone circuit, so it CANNOT fix the mid-scoop on its own. To approximate this mod digitally, use a post-drive parametric EQ block to boost the 400-1000Hz midrange band. Do NOT suggest only changing the Tone knob — that does not address the fundamental mid-scoop topology."
  },
  {
    id: "muff-gain-mod",
    label: "Gain Stage Mod",
    appliesTo: ["pi-fuzz", "pi-fuzz-bass"],
    category: "drive",
    description: "Modify Big Muff clipping stages for different saturation levels.",
    circuitChanges: "Stock Big Muff has 4 clipping stages (2 pairs of diodes). Changing diodes in each stage affects overall saturation. First pair affects initial breakup character, second pair affects sustain and compression. Germanium in first stage + silicon in second = complex, layered distortion. Reducing gain in first stage and increasing in second = tighter, more defined."
  },
  {
    id: "klon-gain-mod",
    label: "Klon Gain Structure Mod",
    appliesTo: ["klone-chiron"],
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
  {
    id: "ppimv",
    label: "Post-Phase-Inverter Master Volume (PPIMV)",
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-jm45", "brit-jm45-jumped", "class-a-30w", "class-a-30w-bright", "class-a-30w-brilliant", "class-a-30w-hot", "class-a-30w-tb", "class-a-15w-tb", "59-bassguy-bright", "59-bassguy-jumped", "59-bassguy-normal", "deluxe-tweed", "deluxe-tweed-jumped"],
    category: "amp",
    description: "Add a master volume control after the phase inverter on non-master-volume amps. The single most popular amp mod in history — allows cranked preamp tone at manageable volumes. As featured on the 2025 Marshall 1959 Modified. NOT applicable to amps that already have a master volume (JCM800 2203/2204, JVM, 5150, Rectifier, etc.).",
    circuitChanges: "Insert a dual-ganged potentiometer between the phase inverter outputs and the power tube grids. This attenuates the signal after all preamp distortion has occurred, preserving preamp tone at lower power amp levels. The pot must be dual-ganged to maintain balanced drive to the push-pull power tubes. Some implementations use a single pot on one phase for intentional asymmetry. On Fractal, the Master Volume Trim Expert parameter simulates this behavior."
  },
  {
    id: "marshall-gain-boost",
    label: "Gain Boost Switch Mod",
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-800-2203-high", "brit-800-2203-low", "brit-800-2204-high", "brit-800-2204-low", "brit-800-studio-20", "brit-jm45", "brit-jm45-jumped"],
    category: "amp",
    description: "Switchable gain boost stage as featured on the 2025 Marshall 1959 Modified and JCM800 Modified. Adds an extra gain stage for heavier tones while retaining stock voicing when disengaged. Formerly a popular boutique mod by MetroAmp, Voodoo Amps, and others.",
    circuitChanges: "Adds an additional cascaded triode gain stage that can be switched in or out of the signal path. When engaged, the signal passes through an extra 12AX7 stage with its own coupling cap and bias resistor before hitting the tone stack. This effectively adds another ~30dB of gain. The coupling cap value between the boost stage and tone stack shapes how much bass enters the additional clipping — typically 0.022uF for tighter response. On Fractal, simulate by increasing Input Trim and adjusting the Preamp Sag parameter."
  },
  {
    id: "marshall-tight-mod",
    label: "Tight / Low-End Focus Mod",
    appliesTo: ["brit-800-2203-high", "brit-800-2203-low", "brit-800-2204-high", "brit-800-2204-low", "brit-800-studio-20", "1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "recto1-orange-modern", "recto1-orange-normal", "recto1-red", "recto2-orange-modern", "recto2-orange-vintage", "recto2-red-modern", "recto2-red-vintage"],
    category: "amp",
    description: "Switchable low-end tightening as featured on the 2025 Marshall JCM800 Modified. Cuts low-frequency content entering the gain stages for improved note definition on palm mutes and down-tuned guitars. A staple mod for metal and modern rock players.",
    circuitChanges: "Reduces the value of coupling capacitors between preamp stages (typically from 0.022uF down to 0.01uF or smaller) when the switch is engaged. This creates a high-pass filter that prevents low frequencies from entering the clipping stages, resulting in tighter, more defined distortion. Some implementations also reduce the cathode bypass cap value. On Fractal, the Low Cut parameter in the amp block and the Depth control achieve similar results."
  },
  {
    id: "marshall-mid-boost-mod",
    label: "Mid-Boost Switch Mod",
    appliesTo: ["brit-800-2203-high", "brit-800-2203-low", "brit-800-2204-high", "brit-800-2204-low", "brit-800-studio-20", "1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble"],
    category: "amp",
    description: "Switchable midrange emphasis as featured on the 2025 Marshall JCM800 Modified. Boosts midrange frequencies for better cut through a band mix and enhanced lead tones. Popular mod from the hot-rod Marshall era.",
    circuitChanges: "Modifies the tone stack values when engaged — typically by switching in a smaller mid-scoop capacitor or adding a parallel resistor across the midrange leg of the tone stack. This reduces the mid-scoop characteristic of the Marshall tone stack, pushing more midrange into the power amp. Some versions bypass part of the tone stack entirely. On Fractal, simulate by increasing the Mid control and adjusting the Tone Stack Topology parameter."
  },
  {
    id: "bright-cap-mod",
    label: "Bright Cap Remove / Switch Mod",
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-800-2203-high", "brit-800-2203-low", "brit-800-2204-high", "brit-800-2204-low", "brit-jm45", "brit-jm45-jumped", "deluxe-verb-normal", "deluxe-verb-vibrato", "double-verb-normal", "double-verb-vibrato", "double-verb-silverface", "vibrato-verb-ab", "vibra-king"],
    category: "amp",
    description: "Remove or make switchable the bright cap across the volume pot. As featured on the 2025 Marshall 1959 Modified (bright cap switch). The bright cap adds treble at lower volume settings — removing it warms the amp, making a switch gives versatility.",
    circuitChanges: "The bright cap is a small capacitor (typically 100-470pF) wired across the volume pot that allows high frequencies to bypass the pot at lower settings. At full volume the cap has minimal effect. Removing it = warmer tone at all volume positions, no ice-pick at lower settings. Adding a switch lets you choose. On Fractal, the Bright Cap Expert parameter directly controls this."
  },
  {
    id: "neg-feedback-mod",
    label: "Negative Feedback Reduction",
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-800-2203-high", "brit-800-2203-low", "brit-800-2204-high", "brit-800-2204-low", "brit-jm45", "brit-jm45-jumped", "deluxe-verb-normal", "deluxe-verb-vibrato", "double-verb-normal", "double-verb-vibrato", "vibrato-verb-ab", "vibra-king", "solo-100-clean", "solo-100-lead", "solo-100-rhythm"],
    category: "amp",
    description: "Reduce or remove the negative feedback loop for more gain, looser feel, and enhanced harmonics. One of the most common and impactful single-component amp mods. Removing NFB entirely makes the amp wilder and more touch-sensitive.",
    circuitChanges: "Increase the value of (or remove) the negative feedback resistor from the output transformer secondary to the phase inverter. Stock Fender amps typically have heavy NFB (~27k ohm resistor). Marshalls have less (~100k ohm). Reducing/removing NFB increases gain, widens frequency response, adds harmonic content, and makes the amp less 'controlled' — more dynamic and responsive to playing dynamics. On Fractal, the Negative Feedback Expert parameter directly controls this."
  },
  {
    id: "silverface-blackface",
    label: "Silverface-to-Blackface Conversion",
    appliesTo: ["double-verb-silverface"],
    category: "amp",
    description: "Convert a Silverface Fender back to Blackface-era specs. One of the most popular Fender mods — reverses CBS-era changes that many players consider inferior.",
    circuitChanges: "Key changes: Remove the extra feedback loop CBS added to the Silverface circuit (reduces the 'sterile' quality). Change the bias circuit back to the original Blackface fixed-bias design. Replace the Silverface tone stack cap values with Blackface values. Remove any added pull-boost switches. Change the phase inverter circuit from CBS-modified back to original Blackface spec. Result is a more dynamic, open, sweeter-sounding amp closer to the original 1965 designs."
  },
  {
    id: "fx-loop-mod",
    label: "Effects Loop Addition",
    appliesTo: ["1959slp-jumped", "1959slp-normal", "1959slp-treble", "1987x-jumped", "1987x-normal", "1987x-treble", "brit-jm45", "brit-jm45-jumped", "deluxe-verb-normal", "deluxe-verb-vibrato", "deluxe-tweed", "deluxe-tweed-jumped", "class-a-30w", "class-a-30w-tb"],
    category: "amp",
    description: "Add a series effects loop to amps that lack one. As featured on the 2025 Marshall JCM800 Modified (series FX loop). Essential for time-based effects (delay, reverb) that sound better after preamp distortion.",
    circuitChanges: "Insert send/return jacks between the preamp output and the phase inverter input. Series loop: the entire signal passes through the effects. Parallel loop: blends wet/dry. The send level and return level must be matched to avoid noise or signal loss. Some implementations buffer the send for driving long cables. On Fractal, effects loop placement is handled natively in the signal chain."
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

export interface DriveCircuitTopology {
  familyId: string;
  modelIds: string[];
  circuitType: string;
  signalFlow: string;
  toneCircuit: string;
  clippingTopology: string;
  gainStructure: string;
  keyComponents: string;
  knobBehavior: string;
  fractalLimitations: string;
}

export const DRIVE_CIRCUIT_TOPOLOGIES: DriveCircuitTopology[] = [
  {
    familyId: "tube-screamer",
    modelIds: ["t808-od", "t808-mod", "maxon-808", "super-od"],
    circuitType: "Op-amp soft-clipping overdrive with feedback loop",
    signalFlow: "Input buffer → clipping stage (op-amp with diodes in feedback loop) → tone circuit → output volume stage",
    toneCircuit: "Single-order low-pass filter AFTER the clipping stage. The Tone knob rolls off treble — fully clockwise is brightest, fully counter-clockwise is darkest. It is a simple high-cut filter, NOT a mid-scoop. Midrange is always present regardless of Tone setting.",
    clippingTopology: "SOFT clipping — two 1N914 silicon diodes in the FEEDBACK LOOP of the op-amp (not to ground). This means clipping happens within the gain stage itself, producing smoother, more compressed distortion. The Drive knob changes the feedback resistor ratio, which simultaneously changes gain AND clipping threshold. Stock TS808 uses symmetric soft clipping (both diodes identical). The SD-1 (Super OD) uses ASYMMETRIC soft clipping (one silicon diode + two silicon diodes in series) for slightly different harmonic content.",
    gainStructure: "The Drive knob controls a variable resistor in the op-amp feedback loop. Higher Drive = more gain AND lower clipping threshold simultaneously. The input cap (0.047uF stock) creates a HIGH-PASS filter before the clipping stage, which is WHY the TS cuts bass — this is by design, not a limitation. The famous 'mid-hump' comes from the interaction of the input high-pass filter and the tone circuit's low-pass filter, leaving the midrange emphasized.",
    keyComponents: "JRC4558 op-amp (stock TS808), 1N914/1N4148 silicon clipping diodes, 0.047uF input coupling cap (controls bass roll-off), 51pF cap in feedback loop (controls treble in gain stage), 4.7K/51K resistor ratio (sets minimum/maximum gain range)",
    knobBehavior: "DRIVE: Controls feedback resistor ratio. Low values = clean boost with mild clipping. High values = saturated, compressed overdrive. The mid-hump is present at ALL Drive settings. TONE: Simple low-pass filter. Does NOT affect midrange. Fully CW = bright, fully CCW = dark. LEVEL: Output volume after the clipping/tone stages. Does not affect the character of the distortion.",
    fractalLimitations: "Fractal's Drive block accurately models the TS circuit. The Tone parameter follows the real TS low-pass filter behavior. The Drive parameter controls gain/clipping threshold like the real circuit. The mid-hump is inherent to the model. To mod the bass response (input cap mod), there is no direct parameter — use a pre-drive EQ to simulate. Diode swap mod: use the Clipping Type parameter to change between silicon/germanium/LED/MOSFET."
  },
  {
    familyId: "big-muff",
    modelIds: ["pi-fuzz", "pi-fuzz-bass"],
    circuitType: "Four-stage cascaded hard-clipping fuzz with passive mid-scoop tone circuit",
    signalFlow: "Input → gain stage 1 (with clipping diodes to ground) → gain stage 2 (with clipping diodes to ground) → passive tone circuit (mid-scoop) → output recovery stage",
    toneCircuit: "CRITICAL — The Big Muff tone circuit is a PASSIVE MID-SCOOP network, NOT a simple tone control. It consists of two parallel signal paths: one passes LOW frequencies through a large cap, the other passes HIGH frequencies through a small cap. The Tone pot BLENDS between these two paths. At EVERY position of the Tone pot, the midrange frequencies (~400-1500Hz) are attenuated because neither path passes them efficiently. Turning the Tone knob fully clockwise emphasizes treble (but still scoops mids). Turning it fully counterclockwise emphasizes bass (but still scoops mids). The mid-scoop is a FIXED CHARACTERISTIC of the circuit topology — it CANNOT be removed or reduced by adjusting the Tone knob. The only way to reduce the mid-scoop is to physically modify the circuit (change cap values, add a mid-boost pot, or bypass part of the tone circuit). Different Big Muff variants have different cap values which change the depth and center frequency of the scoop: Triangle (1971) has a milder scoop, Ram's Head (mid-70s) has a tighter/brighter scoop, Russian has a darker/deeper scoop.",
    clippingTopology: "HARD clipping — diodes connected to GROUND (not in the feedback loop like a TS). Two cascaded clipping stages, each with a pair of silicon diodes. This produces harder, more aggressive, more sustained distortion than soft clipping. The four-stage cascade (2 gain stages × 2 clipping pairs) creates massive sustain and compression. Different Muff variants use different diode combinations: Triangle era used germanium in some stages, Ram's Head used all silicon, Russian used different silicon types.",
    gainStructure: "Each clipping stage is an independent common-emitter amplifier with its own coupling cap, bias resistor, and clipping diodes. The Sustain (Drive) knob controls the bias/gain of the clipping stages. Even at low Sustain settings, the cascaded stages produce significant distortion due to the four-stage topology. The enormous sustain comes from the cumulative compression of four clipping stages in series.",
    keyComponents: "4x 2N5088 (or 2N5089) transistors in common-emitter configuration, 4x silicon clipping diodes (1N914 or equivalent), passive tone circuit caps (values vary by era: Triangle ~3.9nF/10nF, Ram's Head ~3.3nF/10nF, Russian ~3.9nF/22nF), 100K Tone pot, 100K Sustain pot, 100K Volume pot",
    knobBehavior: "SUSTAIN (Drive): Controls gain/bias of clipping stages. Even at low settings, significant distortion. At high settings, massive wall-of-sound fuzz with infinite sustain. TONE: Sweeps between bass-heavy and treble-heavy voicing BUT ALWAYS SCOOPS MIDS. This is NOT a normal tone control — it cannot add mids, only choose between bass emphasis and treble emphasis. VOLUME: Output level from the recovery stage. Can be set very high for massive output boost.",
    fractalLimitations: "Fractal's PI FUZZ drive block models the Big Muff circuit accurately, INCLUDING the mid-scoop tone behavior. The Tone parameter in Fractal follows the real Big Muff's passive mid-scoop topology — it CANNOT reduce the mid-scoop. To approximate the popular 'mid-boost' or 'flat mids' mod, you MUST use a separate parametric EQ block AFTER the drive block, boosting 400-1000Hz by 3-6dB. This is the only way to fill in the mid-scoop on Fractal. Do NOT suggest simply changing the Tone parameter to fix the mid-scoop — that is incorrect and shows a fundamental misunderstanding of the Big Muff circuit."
  },
  {
    familyId: "rat",
    modelIds: ["rat-dist", "fat-rat"],
    circuitType: "Op-amp hard-clipping distortion with variable low-pass filter",
    signalFlow: "Input → op-amp gain stage → hard clipping diodes to ground → unique variable low-pass filter (Filter/Tone) → output volume",
    toneCircuit: "The RAT's Filter (Tone) control is UNIQUE among pedals — it works BACKWARDS from most tone controls. Fully CLOCKWISE = DARKEST (maximum filtering, bass-heavy). Fully COUNTERCLOCKWISE = BRIGHTEST (minimum filtering, full frequency response). This is because the Filter pot controls a variable low-pass filter: turning it up INCREASES the cutoff frequency attenuation, removing more treble. Many players find the sweet spot around 3-4 o'clock (moderately filtered). The filter does NOT scoop mids — it's a simple roll-off.",
    clippingTopology: "HARD clipping — diodes connected to GROUND after the op-amp gain stage (similar topology to Big Muff's individual stages, but only one stage). Stock uses 1N914 silicon diodes for bright, aggressive hard clipping. The 'Turbo RAT' variant uses LEDs instead for higher headroom and less compression. The Fat RAT adds a toggle for different clipping options. Hard clipping to ground produces a more aggressive, edgier distortion character than the TS's soft clipping in the feedback loop.",
    gainStructure: "Single op-amp gain stage with the Distortion pot controlling the feedback resistor. The op-amp type is CRITICAL to the RAT's character: the original LM308 has a very slow slew rate (~0.3V/µs) which naturally filters harsh high-frequency harmonics, creating a smoother, more compressed distortion. Modern RATs use the OP07 which has a faster slew rate and sounds brighter, more open, but harsher at high gain. This single component swap (LM308 vs OP07) is the most significant tonal variable in the RAT circuit.",
    keyComponents: "LM308 op-amp (vintage — slow slew rate, smooth, compressed) or OP07 (modern — fast slew rate, bright, open), 1N914 silicon clipping diodes (stock), 1M Distortion pot (log taper), 100K Filter pot, 100K Volume pot (actually labeled 'Volume' on the pedal)",
    knobBehavior: "DISTORTION: Controls op-amp feedback gain. Wide range from light overdrive to heavy distortion. At low settings with LM308, produces warm, tube-like drive. At high settings, saturated distortion with sustain. FILTER: Works BACKWARDS — clockwise = darker. Controls a variable low-pass filter. Does NOT affect mids specifically. At minimum (fully CCW), the full frequency spectrum passes through. VOLUME: Output level.",
    fractalLimitations: "Fractal's RAT DISTORTION model accurately emulates the circuit. The Tone parameter follows the RAT's backwards filter behavior. The Slew Rate parameter is KEY — it directly controls the op-amp slew rate, which is the primary difference between vintage (LM308) and modern (OP07) RATs. Lower Slew Rate = vintage LM308 character (smoother, darker, more compressed). Higher Slew Rate = modern OP07 character (brighter, more open). Use Clipping Type to change between silicon/germanium/LED for diode swap mods."
  },
  {
    familyId: "fuzz-face",
    modelIds: ["face-fuzz"],
    circuitType: "Two-transistor fuzz with PNP germanium or NPN silicon topology",
    signalFlow: "Input (NO input buffer — very low input impedance) → Q1 common-emitter gain stage → Q2 common-emitter gain/clipping stage → output (Volume pot as voltage divider)",
    toneCircuit: "The Fuzz Face has NO tone control. All tonal shaping comes from: (1) the transistor types and their bias points, (2) the input impedance interaction with pickups, (3) the guitar's volume knob (rolling back cleans up the fuzz beautifully due to the low input impedance loading the pickup). The frequency response is shaped entirely by component values and transistor characteristics.",
    clippingTopology: "The Fuzz Face achieves clipping through transistor saturation, not diodes. Q1 provides initial gain, Q2 provides the main clipping/fuzz. The distortion character depends heavily on transistor type: GERMANIUM (PNP, like AC128, NKT275) = warmer, smoother, more dynamic, voltage/temperature sensitive. SILICON (NPN, like BC108, 2N3904) = brighter, harsher, more aggressive, more consistent, higher gain. The clipping is inherently asymmetric due to the two-transistor topology.",
    gainStructure: "Two common-emitter stages in series. The Fuzz pot controls the amount of signal from Q1's collector that reaches Q2's base. At minimum Fuzz, Q2 still provides significant gain. At maximum Fuzz, Q2 is driven hard into saturation for full fuzz. The critical characteristic is the VERY LOW input impedance (~10K or less depending on Fuzz setting) which means: (1) it loads the guitar pickups, changing their frequency response, (2) buffer pedals BEFORE a Fuzz Face cause it to sound harsh and thin because they present a low-impedance source, (3) the guitar volume knob interacts beautifully — rolling back volume cleans up the tone due to impedance interaction.",
    keyComponents: "Q1 and Q2 transistors (AC128/NKT275 germanium or BC108/2N3904 silicon), bias resistor from Q2 collector to V+ (controls the operating point — THE most critical component for tone), 2.2µF input coupling cap (controls low-frequency response), 0.01µF cap at Q2 collector (filters harsh highs)",
    knobBehavior: "FUZZ: Controls how hard Q2 is driven. Even at low settings, there is significant fuzz due to the two-transistor cascade. At maximum, thick, sustaining fuzz with lots of compression. VOLUME: Simple voltage divider at the output. Controls output level only. The Fuzz Face's real 'tone control' is the guitar's volume knob — rolling it back from 10 to 7-8 gives a beautiful clean-up that no other fuzz achieves as well.",
    fractalLimitations: "Fractal's FACE FUZZ model captures the core Fuzz Face circuit. The Bias parameter is CRITICAL — it controls the Q2 collector voltage (transistor bias point). Center (5.0) = normal bias. Lower = starved, gated, sputtery, dying-battery sound. Higher = smoother, more sustain. The Input Impedance parameter matters more on this model than any other — it controls the pickup loading effect. The Clipping Type and Slew Rate parameters have less direct applicability since the Fuzz Face uses transistor saturation, not diode clipping."
  },
  {
    familyId: "tone-bender",
    modelIds: ["bender-fuzz"],
    circuitType: "Three-transistor germanium fuzz (Mk II topology)",
    signalFlow: "Input → Q1 PNP germanium gain stage → Q2 PNP germanium gain/clipping stage → Q3 emitter follower output buffer → output volume",
    toneCircuit: "Like the Fuzz Face, the Tone Bender has NO dedicated tone control. Tonal character comes from transistor selection, bias, and the circuit's inherent frequency response. The Mk II Tone Bender has more gain and a thicker, woolier character than the Fuzz Face due to its three-transistor design. The third transistor (Q3 emitter follower) provides a lower output impedance than the Fuzz Face, making it less sensitive to what follows it in the signal chain.",
    clippingTopology: "Transistor saturation clipping across two gain stages (Q1 and Q2), similar to Fuzz Face but with more cascaded gain. The third transistor (Q3) is an emitter follower that doesn't add gain but buffers the output. The Mk II topology produces a thicker, more aggressive fuzz than the two-transistor Fuzz Face, with more sustain and compression.",
    gainStructure: "Three-stage design with Q1 providing initial gain, Q2 providing main fuzz/saturation, Q3 providing output buffering. More gain on tap than a Fuzz Face. The Attack (Fuzz) pot controls the signal level hitting Q2. Bias is equally critical as on the Fuzz Face — germanium transistors are temperature-sensitive and the bias point dramatically affects the character.",
    keyComponents: "3x PNP germanium transistors (OC75, OC81D, or similar), bias resistors, 2.2µF input coupling cap, AC-coupled output via Q3 emitter follower",
    knobBehavior: "ATTACK (Fuzz): Controls drive level into Q2. Full range from moderate fuzz to thick, sustaining wall of fuzz. VOLUME: Output level from the emitter follower stage.",
    fractalLimitations: "Fractal's BENDER FUZZ model captures the Mk II topology. The Bias parameter is critical — controls germanium transistor operating point. Same temperature/bias sensitivity as Fuzz Face but with more gain on tap. Input Impedance matters but less than Fuzz Face since the three-transistor design is somewhat more forgiving of what's in front of it."
  },
  {
    familyId: "klon",
    modelIds: ["klone-chiron"],
    circuitType: "Dual-path overdrive with clean blend and germanium diode clipping",
    signalFlow: "Input buffer → signal splits into TWO paths: (1) clean path with volume control and (2) clipping path with gain stage, germanium diode clipping, and tone filter → both paths summed at output",
    toneCircuit: "The Klon's treble control is a simple high-frequency roll-off (low-pass filter) applied to the CLIPPED signal path only. The clean path is unaffected by the Treble knob. This means at low Gain settings (where the clean path dominates), the Treble knob has minimal effect. At high Gain settings (where the clipped path dominates), the Treble knob becomes more impactful. This interaction is key to the Klon's transparency.",
    clippingTopology: "Germanium diode clipping (1N34A or similar) — softer and warmer than silicon. The diodes are in the feedback loop of the gain op-amp (soft clipping, like a TS, but with germanium for softer knee). The key difference from a TS is the CLEAN BLEND: as the Gain pot increases, a dual-ganged pot simultaneously reduces the clean path volume and increases the clipped path volume. At low Gain, mostly clean signal with a hint of grit. At high Gain, mostly clipped signal. This crossfading is the 'secret sauce' of the Klon — it preserves the attack and dynamics of the clean signal while adding harmonics from the clipped path.",
    gainStructure: "Internal charge pump doubles the voltage from 9V to 18V, giving significantly more headroom than most pedals. The gain stage uses a TL072 op-amp. The Gain pot is DUAL-GANGED: one section controls the gain/clipping amount, the other section controls the clean/clipped signal blend ratio. This is why the Klon stays 'transparent' at low gain — you're mostly hearing your clean signal with subtle overtones mixed in.",
    keyComponents: "TL072 dual op-amp, charge pump voltage doubler (ICL7660 or equivalent), 1N34A germanium clipping diodes, dual-ganged Gain pot (simultaneously controls gain and clean blend), simple RC low-pass filter for Treble control",
    knobBehavior: "GAIN: Dual function — controls BOTH the amount of clipping AND the ratio of clean-to-clipped signal. Low Gain = mostly clean with subtle harmonics. Mid Gain = balanced clean/clipped blend. High Gain = mostly clipped signal with more distortion. TREBLE: High-frequency roll-off on the clipped path only. Effect is subtle at low Gain, more noticeable at high Gain. OUTPUT: Sets the overall output level. The Klon is often used as a 'clean boost' with Gain low and Output high.",
    fractalLimitations: "Fractal's KLONE CHIRON model captures the clean blend topology. The Drive parameter emulates the dual-ganged Gain pot behavior (gain + blend). The Tone parameter follows the treble roll-off on the clipped path. The key Klon characteristic — the clean blend — is inherent to the model and cannot be separated into individual parameters. To mod the clipping character, use the Clipping Type parameter (stock = germanium). Bias has minimal relevance since the Klon uses op-amp-based clipping, not transistor saturation."
  },
  {
    familyId: "rangemaster",
    modelIds: ["treble-boost"],
    circuitType: "Single-transistor germanium treble booster",
    signalFlow: "Input → small input coupling cap (high-pass filter) → single PNP germanium transistor gain stage → output",
    toneCircuit: "The Rangemaster has NO tone knob. Its tonal character is defined entirely by the small input coupling cap (0.005µF stock) which creates a high-pass filter, rolling off bass and low-mids before the transistor stage. This is what makes it a 'treble booster' — it's not boosting treble, it's CUTTING bass. The transistor then amplifies the treble-emphasized signal. The frequency response is fixed by the input cap value — changing this cap IS the mod.",
    clippingTopology: "At lower boost settings, the Rangemaster is a clean boost with treble emphasis. At higher boost settings or with hot pickups, the single transistor begins to soft-clip, adding warm germanium saturation. The clipping is subtle and musical — not a full fuzz sound, but a thickening of harmonics that drives the front end of a tube amp beautifully.",
    gainStructure: "Single common-emitter PNP germanium transistor (OC44, OC71, or similar). The Boost knob controls the output level via a voltage divider. The transistor provides roughly 20-25dB of gain. The key is that this gain is frequency-shaped by the input cap — the bass is cut before amplification, so the boost is concentrated in the upper frequencies.",
    keyComponents: "Single PNP germanium transistor (OC44 stock), 0.005µF input coupling cap (THE component that defines the voicing — this is what the mod changes), Boost pot (output level), simple bias network",
    knobBehavior: "BOOST: Output level. At low settings, subtle treble emphasis. At high settings, significant treble boost that can push a tube amp into singing overdrive. Brian May runs his Rangemaster (via the Fryer Treble Booster) nearly full to push his AC30s into their signature crunch. Tony Iommi used a Rangemaster to push his Laney amps for the first Black Sabbath albums — the treble boost cuts through the heavily detuned, bass-heavy signal.",
    fractalLimitations: "Fractal's TREB BOOST model captures the Rangemaster circuit. The Tone parameter may approximate the input cap voicing to some degree. However, the primary mod (changing the input cap for full-range or mid-boost character) cannot be precisely replicated with the Tone parameter alone since the input cap shapes the signal BEFORE the gain stage, not after. To simulate the input cap mod, use a pre-boost EQ block to shape the frequency content entering the treble boost, or adjust the Tone and Drive parameters together."
  },
];

export function getDriveCircuitTopology(modelId: string): DriveCircuitTopology | undefined {
  return DRIVE_CIRCUIT_TOPOLOGIES.find(t => t.modelIds.includes(modelId));
}

export function formatDriveCircuitContext(topology: DriveCircuitTopology): string {
  return `CIRCUIT TOPOLOGY — ${topology.circuitType}:
Signal Flow: ${topology.signalFlow}
Tone Circuit: ${topology.toneCircuit}
Clipping: ${topology.clippingTopology}
Gain Structure: ${topology.gainStructure}
Key Components: ${topology.keyComponents}
What Each Knob Actually Does: ${topology.knobBehavior}
Fractal Implementation Notes: ${topology.fractalLimitations}`;
}

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
