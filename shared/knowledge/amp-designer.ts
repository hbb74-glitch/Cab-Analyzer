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
  { id: "1959slp", label: "1959SLP (Plexi 100W)", basedOn: "Marshall Super Lead 100W 1959 reissue", category: "amp", characteristics: "Iconic 100W Plexi. Louder, tighter low-end. Classic rock tone from Led Zeppelin to EVH early tones. Needs to be cranked for breakup. Treble/Normal/Jumped channels." },
  { id: "1987x", label: "1987X (Plexi 50W)", basedOn: "Marshall 1987X reissue (50W)", category: "amp", characteristics: "50W Plexi reissue. Classic British crunch, mid-forward, no master volume. Clean to medium gain, very dynamic and touch-sensitive. Treble/Normal/Jumped channels." },
  { id: "brit-jm45", label: "Brit JM45", basedOn: "Marshall JTM 45", category: "amp", characteristics: "The original Marshall. Based on the Fender Bassman circuit with British voicing. Warm, fat crunch. Predecessor to all Marshall designs." },
  { id: "brit-800-2204", label: "Brit 800 2204", basedOn: "Marshall JCM 800 2204 (50W)", category: "amp", characteristics: "50W single-channel master volume Marshall. Tight, punchy, aggressive midrange. High/Low inputs. Iconic 80s rock/metal tone." },
  { id: "brit-800-2203", label: "Brit 800 2203", basedOn: "Marshall JCM 800 2203 (100W)", category: "amp", characteristics: "100W JCM 800. More headroom than 2204, same aggressive character. High/Low inputs. The NWOBHM and early thrash standard." },
  { id: "brit-800-mod", label: "Brit 800 Mod", basedOn: "Modified Marshall JCM 800", category: "amp", characteristics: "JCM 800 with virtual modifications for more gain and tighter response. Hot-rodded 800 character." },
  { id: "brit-800-34", label: "Brit 800 #34", basedOn: "Marshall JCM 800 with Santiago #34 mods", category: "amp", characteristics: "JCM 800 with virtual Santiago #34 modifications. Enhanced gain staging, tighter low-end." },
  { id: "brit-800-studio-20", label: "Brit 800 Studio 20", basedOn: "Marshall Studio Classic SC20H (20W JCM 800 2203)", category: "amp", characteristics: "20W version of the JCM 800 2203. All the aggressive JCM 800 character in a lower-wattage format. Same preamp topology as the full-size 2203 with a 20W power section using EL34 tubes. Great for cranked 800 tones at manageable volumes." },
  { id: "brit-jvm", label: "Brit JVM", basedOn: "Marshall JVM410H", category: "amp", characteristics: "Modern Marshall with multiple channels and gain stages. OD1/OD2 channels with Green/Orange/Red modes. Very versatile from clean to extreme gain." },
  { id: "brit-silver", label: "Brit Silver", basedOn: "Marshall Silver Jubilee 2555", category: "amp", characteristics: "Marshall's 25th anniversary amp. Diode clipping option, switchable pentode/triode. Slash, Alex Lifeson tones." },
  { id: "brit-brown", label: "Brit Brown", basedOn: "Custom Plexi 'Brown Sound' model", category: "amp", characteristics: "Custom Fractal model capturing the 'Brown Sound' character. Hot-rodded Plexi voicing with extra gain and saturation." },
  { id: "brit-afs100", label: "Brit AFS100", basedOn: "Marshall AFD100 Slash signature", category: "amp", characteristics: "Slash's signature Marshall. Based on modified Super Lead circuit. The Appetite For Destruction tone." },
  { id: "brit-super", label: "Brit Super", basedOn: "Marshall AFD100 schematic variant", category: "amp", characteristics: "Based on Marshall AFD100 schematics. Related to the Slash circuit but with different voicing." },
  { id: "brit-pre", label: "Brit Pre", basedOn: "Marshall JMP-1 preamp", category: "amp", characteristics: "Marshall's MIDI-controlled tube preamp. Dual-channel (Clean/OD), versatile studio workhorse. Used by many 90s rock players." },
  { id: "friedman-be", label: "Friedman BE", basedOn: "Friedman BE-100", category: "amp", characteristics: "Dave Friedman's hot-rodded Marshall. Very high gain, tight low-end, aggressive midrange. Modern high-gain rock/metal. SAT switch adds compression, Voice switch varies brightness." },
  { id: "friedman-hbe", label: "Friedman HBE", basedOn: "Friedman HBE (Hairy Brown Eye)", category: "amp", characteristics: "Higher gain Friedman variant. Even more saturation and compression than BE. Extended gain range." },
  { id: "friedman-sm", label: "Friedman Small Box", basedOn: "Friedman Small Box 50W", category: "amp", characteristics: "50W EL34 Friedman. More Marshall-like than BE, with a tighter, more focused sound. Great for classic rock to hard rock." },
  { id: "dirty-shirley", label: "Dirty Shirley", basedOn: "Friedman Dirty Shirley 40W", category: "amp", characteristics: "Friedman's Plexi/JTM-45 inspired design with 5881 (6L6) tubes. Lower gain than BE but with rich, fat tone. Cleans up beautifully with guitar volume. Vintage classic rock character." },
  { id: "dirty-shirley-2", label: "Dirty Shirley 2", basedOn: "Friedman Dirty Shirley (earlier version)", category: "amp", characteristics: "Earlier version of the Dirty Shirley with different component values. Slightly more aggressive than model 1." },
  { id: "cameron-ccv", label: "Cameron CCV", basedOn: "Cameron CCV-100", category: "amp", characteristics: "Mark Cameron's hot-rodded Marshall. Multiple channels from clean to crushing gain. Tight response with Plexi heritage. 6 channel variants (1A, 1B, 2A-2D)." },
  { id: "atomica-high", label: "Atomica High", basedOn: "Cameron Atomica (high gain)", category: "amp", characteristics: "Cameron's high-gain design, high gain channel. Tight, aggressive, modern voicing." },
  { id: "atomica-low", label: "Atomica Low", basedOn: "Cameron Atomica (low gain)", category: "amp", characteristics: "Cameron Atomica low gain channel. More crunch-oriented, tighter response." },
  { id: "sol-100", label: "Solo 100", basedOn: "Soldano SLO-100", category: "amp", characteristics: "Legendary high-gain amp. Smooth, liquid lead tone with singing sustain. Defined low-end, vocal midrange. Clean/Crunch/Overdrive channels." },
  { id: "usa-lead", label: "USA Lead+", basedOn: "Mesa Boogie Mark IIC+", category: "amp", characteristics: "The most sought-after Mesa. Scooped, tight, aggressive. The Metallica Master of Puppets tone. Heavy low-end, searing highs, scooped mids. Legendary lead channel." },
  { id: "usa-rhythm", label: "USA Rhythm", basedOn: "Mesa Boogie Mark IV", category: "amp", characteristics: "Versatile Mesa tone. Tight, percussive rhythm with adjustable voicing. Works clean to high gain." },
  { id: "usa-lead-bright", label: "USA Lead Bright", basedOn: "Mesa Boogie Mark IIC+ (bright)", category: "amp", characteristics: "Bright-voiced variant of the IIC+ lead channel. More treble presence and cut." },
  { id: "usa-jp-iic", label: "USA JP IIC+", basedOn: "Mesa Boogie JP-2C (John Petrucci IIC+)", category: "amp", characteristics: "John Petrucci's signature Mesa based on the IIC+. Tighter, more modern voicing with extended gain range. Dream Theater tones." },
  { id: "usa-clean", label: "USA Clean", basedOn: "Mesa Boogie Mark series clean channel", category: "amp", characteristics: "The Mesa clean channel. Warm, round, slightly scooped clean tone. Can be surprisingly Fender-like." },
  { id: "recto-red-mdrn", label: "Recto Red Modern", basedOn: "Mesa Dual/Triple Rectifier Red channel (Modern mode)", category: "amp", characteristics: "Maximum gain Recto voicing. Massive, saturated, scooped. The modern metal standard for 2000s-era heavy tones." },
  { id: "recto-red-vntg", label: "Recto Red Vintage", basedOn: "Mesa Dual/Triple Rectifier Red channel (Vintage mode)", category: "amp", characteristics: "Vintage-voiced Red channel. Less saturated, more midrange than Modern. Tighter feel with more note definition." },
  { id: "recto-red-raw", label: "Recto Red Raw", basedOn: "Mesa Dual/Triple Rectifier Red channel (Raw mode)", category: "amp", characteristics: "Raw mode Red channel. Most open and dynamic Recto voicing. Least gain, most touch-responsive." },
  { id: "recto-orange-mdrn", label: "Recto Orange Modern", basedOn: "Mesa Dual Rectifier Orange channel (Modern)", category: "amp", characteristics: "Orange channel Modern mode. Medium-high gain with Recto character. Great for hard rock." },
  { id: "recto-orange-vntg", label: "Recto Orange Vintage", basedOn: "Mesa Dual Rectifier Orange channel (Vintage)", category: "amp", characteristics: "Vintage-voiced Orange channel. Classic rock feel with Recto character." },
  { id: "euro-red", label: "Euro Red", basedOn: "Bogner Ecstasy Red channel", category: "amp", characteristics: "Refined high-gain with European voicing. Smooth, articulate, not as aggressive as Recto. Complex harmonics." },
  { id: "euro-blue", label: "Euro Blue", basedOn: "Bogner Ecstasy Blue channel", category: "amp", characteristics: "Lower gain Bogner channel. Beautiful crunch, very dynamic. Excellent clean-to-crunch range." },
  { id: "euro-uber", label: "Euro Uber", basedOn: "Bogner Uberschall", category: "amp", characteristics: "Bogner's high-gain monster. Extremely tight bass response, aggressive midrange. Designed for modern heavy tones with EL34 power tubes." },
  { id: "class-a-30", label: "Class A 30W", basedOn: "Vox AC30 (Top Boost)", category: "amp", characteristics: "Class A chimey cleans, complex breakup with harmonics. The Beatles/Brian May/The Edge tone. Top Boost channel." },
  { id: "class-a-15", label: "Class A 15W", basedOn: "Vox AC15", category: "amp", characteristics: "Smaller, earlier breakup than AC30. Warmer, more compressed. Great for blues and indie." },
  { id: "ac-20", label: "AC-20", basedOn: "Morgan AC20 Deluxe", category: "amp", characteristics: "Based on the Morgan AC20 Deluxe. EF86 and 12AX7 preamp tube options. Class A, EL84 power tubes. Vox-inspired but with its own character." },
  { id: "deluxe-verb", label: "Deluxe Verb", basedOn: "Fender '65 Deluxe Reverb (Blackface)", category: "amp", characteristics: "Classic American clean. Sweet, chimey, breaks up nicely when pushed. Studio workhorse. Normal/Vibrato channels." },
  { id: "deluxe-tweed", label: "Deluxe Tweed", basedOn: "1957 Fender narrow-panel Tweed Deluxe 5E3", category: "amp", characteristics: "Raw, gritty, vintage breakup. The Neil Young tone. Interactive volume controls, beautiful harmonic distortion when cranked. Classic blues standard." },
  { id: "twin-verb", label: "Twin Verb", basedOn: "Fender Twin Reverb", category: "amp", characteristics: "Maximum Fender clean headroom. Crystal clear, scooped, very loud. Country, jazz, clean tones." },
  { id: "59-bassguy", label: "59 Bassguy", basedOn: "1959 Fender Tweed Bassman 5F6-A", category: "amp", characteristics: "The amp that started Marshall. Warm, fat, breaks up beautifully. Bright/Normal/Jumped channels. Blues standard." },
  { id: "65-bassguy-bass", label: "65 Bassguy Bass", basedOn: "1965 Blackface Fender Bassman AB165 (Bass channel)", category: "amp", characteristics: "Blackface-era Bassman bass channel. Cleaner than Tweed version. More headroom, tighter bass response." },
  { id: "65-bassguy-norm", label: "65 Bassguy Normal", basedOn: "1965 Blackface Fender Bassman AB165 (Normal channel)", category: "amp", characteristics: "Blackface Bassman normal channel. Bright, clean, punchy. Good pedal platform." },
  { id: "vibrato-verb", label: "Vibrato Verb", basedOn: "Fender Vibroverb", category: "amp", characteristics: "Fender Vibroverb combo. Similar to Deluxe Reverb but with different power section. Warm, chimey, great reverb and vibrato." },
  { id: "band-commander", label: "Band Commander", basedOn: "1968 Silverface/Blackface Fender Bandmaster head AB763", category: "amp", characteristics: "Blackface Fender head. Clean, bright, responds well to pedals. Similar voicing to Deluxe Reverb but with more headroom." },
  { id: "super-verb", label: "Super Verb", basedOn: "Fender Super Reverb", category: "amp", characteristics: "4x10 Fender combo. Great clean tone with singing breakup. More low-end than Deluxe due to 4x10 configuration." },
  { id: "princeton", label: "Princeton", basedOn: "Fender Princeton Reverb (Blackface)", category: "amp", characteristics: "Small Fender combo. Sweet, compressed breakup at manageable volumes. One of the best recording amps ever made." },
  { id: "5f1-tweed", label: "5F1 Tweed", basedOn: "Fender narrow-panel Tweed Champ 5F1", category: "amp", characteristics: "Single-ended, single-tube Fender. Pure, raw tone. Eric Clapton's Layla tones. Breaks up beautifully at low volume. One knob: Volume." },
  { id: "6g4-super", label: "6G4 Super", basedOn: "1960 Brownface Fender Super 6G4", category: "amp", characteristics: "Transitional brownface Fender. Warmer than blackface, more harmonically rich. Vibrato channel has a unique, lush tremolo circuit." },
  { id: "5153-blue", label: "5153 100W Blue", basedOn: "EVH 5150III 100W Blue Channel", category: "amp", characteristics: "Clean/crunch channel. Fender-ish cleans with hot-rod capabilities. Very versatile." },
  { id: "5153-green", label: "5153 100W Green", basedOn: "EVH 5150III 100W Green Channel", category: "amp", characteristics: "Medium gain crunch channel. Great for classic rock tones. Bridge between clean and high gain." },
  { id: "5153-red", label: "5153 100W Red", basedOn: "EVH 5150III 100W Red Channel", category: "amp", characteristics: "Eddie Van Halen's modern high-gain. Tight, aggressive, very defined palm mutes. Modern rock/metal standard." },
  { id: "5153-stealth-blue", label: "5153 Stealth Blue", basedOn: "EVH 5150III 100S Stealth Blue Channel", category: "amp", characteristics: "Stealth edition Blue channel. Slightly different voicing from standard 5153, refined high-frequency response." },
  { id: "5153-stealth-green", label: "5153 Stealth Green", basedOn: "EVH 5150III 100S Stealth Green Channel", category: "amp", characteristics: "Stealth edition Green channel. Tighter crunch with more modern voicing than standard." },
  { id: "5153-stealth-red", label: "5153 Stealth Red", basedOn: "EVH 5150III 100S Stealth Red Channel", category: "amp", characteristics: "Stealth edition Red channel. Tighter, more focused high-gain than standard Red. Modern metal favorite." },
  { id: "5153-50w-blue", label: "5153 50W Blue", basedOn: "EVH 5150III 50W Blue Channel", category: "amp", characteristics: "50W version Blue channel. Same character, slightly earlier breakup due to lower wattage." },
  { id: "dizzy-v4", label: "Dizzy V4", basedOn: "Diezel VH4", category: "amp", characteristics: "German engineering for extreme tones. Four channels. Tight, aggressive, surgical precision. Channel 3/4 are modern metal monsters." },
  { id: "herbie", label: "Herbie", basedOn: "Diezel Herbert", category: "amp", characteristics: "Versatile Diezel. Three channels from clean to crushing. More midrange flexibility than VH4." },
  { id: "das-benzin", label: "Das Benzin", basedOn: "Diezel D-Moll", category: "amp", characteristics: "Diezel's take on more classic British-flavored tones with German precision. More Marshall-like than VH4." },
  { id: "das-metall", label: "Das Metall", basedOn: "Diezel VH4 (schematic-based)", category: "amp", characteristics: "Modeled from VH4 schematics by ear. Fan-favorite for modern metal despite not being matched to a specific VH4 unit. Tighter and bassier than a Recto. Massive low-end, surgical highs." },
  { id: "angle-severe", label: "Angle Severe", basedOn: "Engl Savage 120", category: "amp", characteristics: "German high-gain. Tight, precise, articulate. Multiple gain stages. Well-suited for technical metal." },
  { id: "angle-fireball", label: "Angle Fireball", basedOn: "Engl Fireball 100", category: "amp", characteristics: "Engl's more affordable high-gain head. Tight, aggressive midrange. Great for modern rock and metal." },
  { id: "archean", label: "Archean", basedOn: "PRS Archon 100W", category: "amp", characteristics: "Paul Reed Smith's high-gain design. Versatile from clean to crushing. Balanced EQ with tight low-end. Bright/Normal channels." },
  { id: "citrus-terrier", label: "Citrus Terrier", basedOn: "Orange Tiny Terror", category: "amp", characteristics: "Simple British tone machine. 7/15W switchable. Great crunch at low volumes. Responsive to pick dynamics." },
  { id: "citrus-a30", label: "Citrus A30", basedOn: "Orange AD30HTC", category: "amp", characteristics: "Orange 30W Class A. Clean and Dirty channels. Rich, warm British tone with more gain than a typical Class A design." },
  { id: "citrus-bass-200", label: "Citrus Bass 200", basedOn: "Orange AD200B bass amp", category: "amp", characteristics: "200W all-tube bass amp. Huge, round, warm bass tone. Class A/B with 4x 6550 power tubes." },
  { id: "carol-ann-od2", label: "Carol-Ann OD2", basedOn: "Carol-Ann OD-2", category: "amp", characteristics: "Boutique hand-wired amp. Smooth, creamy overdrive with excellent note separation. Responds beautifully to pick dynamics." },
  { id: "carol-ann-triptik", label: "Carol-Ann Triptik", basedOn: "Carol-Ann Triptik", category: "amp", characteristics: "Three-channel boutique amp. Clean/Classic/Modern modes. Extremely refined high-gain with complex harmonics." },
  { id: "carol-ann-tucana", label: "Carol-Ann Tucana", basedOn: "Carol-Ann Tucana 3", category: "amp", characteristics: "Carol-Ann's flagship. Clean and lead channels. Beautiful, refined high-gain with singing sustain." },
  { id: "capt-hook", label: "Capt Hook", basedOn: "Hook Captain 34 (Netherlands)", category: "amp", characteristics: "100W boutique amp with unique mu-follower circuit replacing traditional cathode follower. 3 channels. Open, smooth distortion without typical cathode follower compression. Richard Hallebeek's amp." },
  { id: "bludojai", label: "Bludojai", basedOn: "Bludotone BludoDrive Ojai", category: "amp", characteristics: "100W 6L6 boutique amp. Same schematic as the famous 'Tan' amp played by Robben Ford. Extremely touch-sensitive, great for blues/jazz." },
  { id: "bogfish", label: "Bogfish", basedOn: "Bogner Fish preamp", category: "amp", characteristics: "Bogner's preamp design. Brown and Strato channels. Rich, complex harmonic content." },
  { id: "big-hair", label: "Big Hair", basedOn: "Custom 80s rock model", category: "amp", characteristics: "Fractal's custom model designed for quintessential 80s rock tones. Think big hair bands, hot-rodded Marshall character." },
  { id: "buddah-duomaster", label: "Buddah Duomaster", basedOn: "Budda Twinmaster", category: "amp", characteristics: "Simple, pure tube tone. Class A, single-ended. Extremely touch-sensitive. Pure, uncolored amplification." },
  { id: "car-ambler", label: "Car Ambler", basedOn: "Carr Rambler", category: "amp", characteristics: "Boutique American combo. Beautiful cleans with warm, musical breakup. Reverb and tremolo. Very responsive." },
  { id: "chieftain", label: "Chieftain", basedOn: "Matchless Chieftain", category: "amp", characteristics: "Class A boutique amp with EF86 preamp tube. Rich, complex harmonics. Clean to moderate gain with stunning touch response." },
  { id: "ca3-plus", label: "CA3+", basedOn: "Custom Audio Amplifiers 3+ SE preamp", category: "amp", characteristics: "Bob Bradshaw's high-end preamp. Clean/Rhythm/Lead channels. Studio-quality tone shaping. Used by many session players." },
  { id: "corncob", label: "Corncob", basedOn: "65amps London", category: "amp", characteristics: "British-voiced boutique amp. EL34 power section with Plexi-inspired preamp. Rich, harmonically complex crunch." },
  { id: "comet-60", label: "Comet 60", basedOn: "Komet 60", category: "amp", characteristics: "Boutique amp inspired by early German Telefunken and Marshall designs. Rich, complex harmonic content. Ken Fischer design philosophy." },
  { id: "division-13", label: "Division 13", basedOn: "Divided by 13 RSA 23", category: "amp", characteristics: "Boutique American design. Sparkling cleans and rich, complex overdrive. Switchable wattage." },
  { id: "energyball", label: "Energyball", basedOn: "Engl Powerball", category: "amp", characteristics: "Four-channel German high-gain amp. Extremely tight bass, massive gain on tap. Modern metal machine with versatile clean channel." },
  { id: "jmpre-1", label: "JMPre-1", basedOn: "Marshall JMP-1 preamp (updated model)", category: "amp", characteristics: "Updated model of Marshall's rack preamp. MIDI-controlled, dual-channel. More accurate modeling than the earlier Brit Pre." },
  { id: "legend-100", label: "Legend 100", basedOn: "Sunn Model T / O)))", category: "amp", characteristics: "Massive, heavy, doom-oriented tone. Huge low-end, thick midrange. Stoner/doom metal standard." },
  { id: "mr-z-38", label: "Mr Z 38 SR", basedOn: "Dr. Z Maz 38 Senior", category: "amp", characteristics: "Dr. Z boutique amp. Warm, dynamic, incredibly responsive to pick dynamics. EL84 power tubes. Great for blues and roots." },
  { id: "nuclear-tone", label: "Nuclear Tone", basedOn: "Swart Atomic Space Tone", category: "amp", characteristics: "Boutique Class A amp with unique tremolo and reverb. Warm, lush cleans. EL84 powered. Great for indie and ambient." },
  { id: "solo-88", label: "Solo 88", basedOn: "Soldano Hot Rod 50", category: "amp", characteristics: "Soldano's smaller sibling to the SLO-100. 50W, EL34 power tubes. Smooth lead tone with less gain than SLO." },
  { id: "solo-99", label: "Solo 99", basedOn: "Soldano Decatone", category: "amp", characteristics: "Soldano's multi-channel monster. 100W with more gain options than SLO-100. Versatile high-gain." },
  { id: "shiver-clean", label: "Shiver Clean", basedOn: "Bogner Shiva Clean channel", category: "amp", characteristics: "Bogner Shiva clean channel. Crystalline, bell-like cleans. EL34 power section gives it a British warmth." },
  { id: "shiver-lead", label: "Shiver Lead", basedOn: "Bogner Shiva Lead channel", category: "amp", characteristics: "Bogner Shiva lead channel. Smooth, creamy gain with excellent note articulation. Classic rock to hard rock." },
  { id: "supertweed", label: "Super Tweed", basedOn: "Fender '57 Tweed Super 5E4", category: "amp", characteristics: "Fender Super Tweed. Raw, gritty, louder than Deluxe Tweed. Beautiful harmonic distortion at volume." },
  { id: "wrecker-1", label: "Wrecker 1", basedOn: "Trainwreck Express", category: "amp", characteristics: "Ken Fischer's legendary boutique amp. Extremely dynamic, touch-sensitive. Beautiful harmonic complexity. One of the most sought-after amps ever." },
  { id: "wrecker-2", label: "Wrecker 2", basedOn: "Trainwreck Liverpool", category: "amp", characteristics: "Vox-inspired Trainwreck. Chimey, jangly, with complex Class A character. More British-voiced than Express." },
  { id: "thordendal", label: "Thordendal", basedOn: "Randall T2 (Meshuggah)", category: "amp", characteristics: "Fredrik Thordendal's signature Randall. Extreme tight bass, massive gain. Designed for 8-string djent/progressive metal." },
  { id: "fox-od", label: "Fox OD", basedOn: "Fuchs ODS", category: "amp", characteristics: "Boutique ODS (Overdrive Supreme). Dumble-inspired circuit. Sweet, vocal overdrive with bell-like cleans." },
  { id: "ruby-rocket", label: "Ruby Rocket", basedOn: "Dr. Z Route 66", category: "amp", characteristics: "EL84-powered boutique. American voicing with British power section. Warm, dynamic, responsive." },

  { id: "fas-modern", label: "FAS Modern", basedOn: "Fractal Audio idealized modern high-gain", category: "amp", characteristics: "Fractal's own idealized modern metal amp. No real-world equivalent. Tight, surgical, massive gain. Removes undesirable characteristics of real amps. Community favorite for metal." },
  { id: "fas-crunch", label: "FAS Crunch", basedOn: "Fractal Audio idealized British crunch", category: "amp", characteristics: "Idealized Plexi/Marshall crunch tone. The ultimate British crunch sound without the limitations of any single real amp." },
  { id: "fas-lead", label: "FAS Lead", basedOn: "Fractal Audio idealized lead tone", category: "amp", characteristics: "Fractal's idealized lead amp. Smooth, singing sustain with perfect note definition. Great for solos." },
  { id: "fas-hot-rod", label: "FAS Hot Rod", basedOn: "Fractal Audio idealized hot-rodded Marshall", category: "amp", characteristics: "Idealized version of a hot-rodded Marshall. All the gain and aggression without the downsides." },
  { id: "fas-6160", label: "FAS 6160", basedOn: "Fractal Audio idealized 5150 variant", category: "amp", characteristics: "Less fizzy variant of the EVH 5150 character. Tighter, more focused. Great for modern rock/metal." },
  { id: "fas-wreck", label: "FAS Wreck", basedOn: "Fractal Audio idealized Trainwreck", category: "amp", characteristics: "Idealized Trainwreck-style amp. All the harmonic complexity and touch sensitivity without the price tag." },
  { id: "fas-brown", label: "FAS Brown", basedOn: "Fractal Audio idealized 'Brown Sound'", category: "amp", characteristics: "Fractal's take on the EVH 'Brown Sound'. More refined than the Brit Brown model." },
  { id: "fas-class-a", label: "FAS Class-A", basedOn: "Fractal Audio idealized Class A amp", category: "amp", characteristics: "Idealized Class A amplifier. Chimey, complex harmonics, beautiful breakup characteristics." },
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
    appliesTo: ["1959slp", "1987x", "brit-jm45"],
    category: "amp",
    description: "Jose Arredondo's legendary Plexi modification as done for Eddie Van Halen, Steve Lukather, and others.",
    circuitChanges: "Added post-phase-inverter master volume (PPIMV). Cascaded gain stages by jumping channels internally. Removed bright cap on channel 2. Changed cathode follower plate resistor for more drive. Added clipping diodes in some versions. Changed coupling caps for tighter bass response. Modified negative feedback loop for more gain and midrange push."
  },
  {
    id: "snorkler",
    label: "Snorkler Mod",
    appliesTo: ["brit-800-2204", "brit-800-2203", "1959slp", "1987x"],
    category: "amp",
    description: "Cascaded gain stages mod for more distortion while retaining the amp's core character.",
    circuitChanges: "Routes signal from V1a to V1b (cascading the preamp stages) instead of running them in parallel. Adds a coupling cap and grid leak resistor between stages. Effectively doubles the preamp gain. Similar concept to the Jose mod but simpler. May include cathode bypass cap changes for more gain on the second stage."
  },
  {
    id: "cameron-mod",
    label: "Mark Cameron Mod",
    appliesTo: ["1959slp", "1987x", "brit-800-2204", "brit-800-2203"],
    category: "amp",
    description: "Mark Cameron's hot-rod Marshall modification, known for tight high-gain with Plexi feel.",
    circuitChanges: "Complete preamp redesign with cascaded stages and additional clipping. Modified tone stack for tighter bass. Added extra gain stage. Modified cathode follower. Reduced negative feedback for more gain. Added series/parallel effects loop. Clipping diode network for controlled saturation. Often includes channel switching."
  },
  {
    id: "plexi-to-jcm800",
    label: "Plexi-to-JCM800 Conversion",
    appliesTo: ["1959slp", "1987x", "brit-jm45"],
    category: "amp",
    description: "Convert a Plexi circuit to JCM 800 specs by adding a master volume and preamp gain.",
    circuitChanges: "Add master volume after the phase inverter. Change the first preamp stage cathode bypass cap from 0.68uF to 0.82uF for more low-end gain. Add a 470pF bright cap across the master volume. Change coupling caps to 0.022uF for tighter bass. Reduce plate resistors on V1 for hotter signal. May change negative feedback resistor."
  },
  {
    id: "jcm800-gain-mod",
    label: "JCM 800 Extra Gain Mod",
    appliesTo: ["brit-800-2204", "brit-800-2203", "brit-800-mod", "brit-800-studio-20"],
    category: "amp",
    description: "Increase gain in a JCM 800 beyond stock levels for heavier tones.",
    circuitChanges: "Add or increase cathode bypass cap on second preamp stage (from 0.68uF to 1uF or higher). Change coupling cap between stages for more bass into the clipping stages. Reduce the bright cap value to tame ice-pick highs at higher gain. Some versions add a clipping diode pair to ground after the second gain stage."
  },
  {
    id: "vox-top-boost",
    label: "Top Boost Mod",
    appliesTo: ["class-a-30", "class-a-15", "ac-20"],
    category: "amp",
    description: "Add the classic Top Boost circuit to a normal-channel Vox for more treble and gain.",
    circuitChanges: "Add an extra triode gain stage with treble and bass cut controls after the first preamp stage. The Top Boost circuit adds a 12AX7 stage with adjustable high-frequency emphasis. This became standard on later AC30s but early models lacked it."
  },
  {
    id: "mesa-gain-mod",
    label: "Mesa Gain Structure Mod",
    appliesTo: ["usa-lead", "usa-rhythm", "usa-lead-bright", "usa-jp-iic", "recto-red-mdrn", "recto-red-vntg", "recto-red-raw", "recto-orange-mdrn", "recto-orange-vntg"],
    category: "amp",
    description: "Modify Mesa gain staging for tighter or looser feel.",
    circuitChanges: "Adjust cascaded gain stage coupling caps to control bass entering each stage. Modify cathode bypass caps to change gain character at each stage. Change plate load resistors to alter headroom per stage. In Rectos, changing the rectifier tube type (silicon vs tube) dramatically changes feel and sag."
  },
  {
    id: "recto-tube-rectifier",
    label: "Tube Rectifier Swap",
    appliesTo: ["recto-red-mdrn", "recto-red-vntg", "recto-red-raw", "recto-orange-mdrn", "recto-orange-vntg"],
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
    appliesTo: ["friedman-be", "friedman-hbe"],
    category: "amp",
    description: "Explore the Friedman's SAT switch and Voice switch combinations for different gain characters.",
    circuitChanges: "SAT switch adds a clipping network in the preamp that compresses and saturates the signal. Without SAT, the amp is more open and dynamic. Voice switch changes the high-frequency roll-off and bass response: one position is brighter with bigger bass, the other is darker with more midrange focus. These interact with each other significantly."
  },
  {
    id: "5153-bias-shift",
    label: "5150 Bias / Tube Swap",
    appliesTo: ["5153-blue", "5153-green", "5153-red", "5153-stealth-blue", "5153-stealth-green", "5153-stealth-red", "5153-50w-blue"],
    category: "amp",
    description: "Change power tube bias or swap tube types in the 5150 for different feel.",
    circuitChanges: "Stock 5150III uses 6L6 power tubes. Swapping to EL34s changes the character dramatically: more aggressive midrange, less clean headroom, more British-voiced. Biasing hotter gives smoother class-A-like response, colder gives more crossover distortion and grit. Some players run the 5150 with KT77s (EL34 variant) for a tighter, more focused sound."
  },
  {
    id: "soldano-gain-mod",
    label: "SLO Gain Mod",
    appliesTo: ["sol-100", "solo-88", "solo-99"],
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
