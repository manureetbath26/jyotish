/**
 * Rich implications text per yoga slug.
 *
 * Each entry answers: "How does this yoga manifest in the native's life,
 * when does it activate, and what should they watch for / maximize?"
 *
 * Used as a supplement to the classical `effects` field.
 */

export const YOGA_IMPLICATIONS: Record<string, string> = {
  // ─── Nabhasa ────────────────────────────────────────────────────────────
  rajju: "Life moves through many places and changes. The native feels unsettled staying in one role or location — travel, migration, and career shifts keep the chart energized. Best outcomes come from embracing the movement rather than resisting it; foreign or cross-cultural work is strongly indicated. Dasha periods of planets in movable signs accelerate these themes.",
  musala: "Steady, rooted life with accumulating honour. The native's reputation compounds slowly but surely through consistency. Authority comes not from ambition but from reliability — people trust them because they stay put. Activation during fixed-sign dashas brings peak recognition and wealth.",
  nala: "Multi-faceted, adaptable, skilled in bridging worlds. The native collects abilities across domains and helps knit them together for others. Periods of dual-sign dashas sharpen communication, teaching, and intermediary roles.",
  maala: "Protection and ease run through the foundations of life. Major life milestones — marriage, career, home — arrive with benefic support, and the native often gets pleasant surprises during kendra-lord dashas. Best maximized by engaging with beauty, art, and refined social circles.",
  sarpa: "The opposite signature of Maala — pressure descends through the same foundational pillars. Early life may feel hemmed in, but the pressure cultivates extraordinary resilience. Wisdom and authority eventually emerge from navigating the obstacles; spiritual or yogic practice mitigates the sharper edges.",
  gola: "Life's intensity concentrates in one specific domain. The native's whole chart-energy focuses through a single sign, which means deep specialist success in that sign's themes but comparatively shallow interest outside it. Celibate or intensely-focused lifestyles often align.",
  yuga: "Duality defines the native — two parallel life-threads, two worldviews, often two very different phases. Expect a pivot mid-life where one thread gives way to the other.",
  sool: "Sharp focus, conflict-orientation, success through bold confrontation. Well-used, this makes excellent debate lawyers, surgeons, critics. Mis-directed, it becomes combativeness. Mars-flavored dashas bring peak activity.",
  kedara: "Broad stability across four life-segments — suits agriculture, real estate, hospitality, or any field that rewards steady cultivation. Fickle moods pass quickly; the underlying life is grounded.",
  paash: "Network-driven life — servants, contractors, partnerships, chains of collaboration. Talks much, manages many, prone to being bound by obligations. Professional leverage through delegation.",
  daama: "Wealth and reputation compound through righteous activity. Six-sign distribution gives broad exposure without over-concentration, so prosperity accumulates from multiple sources. Typically a visibly-successful later life.",
  veena: "Artistic and cultural life — music, poetry, aesthetics, leadership in cultured circles. The seven planets in seven signs produce a harmonious melody in the native's choices. Best maximized by engaging the arts professionally.",

  // ─── Mahapurusha ────────────────────────────────────────────────────────
  ruchaka: "Exceptionally strong physical vitality and command. Mars-themed career — defence, sports, engineering, surgery, real-estate development — becomes a primary life-signature. During Mars major and sub-periods, peak opportunities arrive; restraint in anger and partnership frictions protects long-term gains.",
  bhadra: "A sharp, analytical, commercially-gifted life. Speech and writing become instruments of advantage. During Mercury dashas, education, trade, technology, analysis, and communications produce defining career leaps. Best maximized by picking a specialist domain and going deep.",
  hamsa: "A beautiful, principled, benevolent disposition. Respect naturally gravitates to the native; wisdom and generosity become the defining traits. Jupiter dashas activate teaching, advisory, legal, or spiritual roles; moral restraint is rewarded much more than grasping ambition.",
  malavya: "Charm, beauty, refined tastes, and material comfort. Love, art, luxury, and hospitality form the life-texture. Spouse and partnerships bring exceptional wealth and social position during Venus dashas. Over-indulgence is the only real risk — moderation preserves the yoga's full flower.",
  sasha: "Authority over large workforces, institutions, or long-cycle enterprises. Public service and administrative power flow during Saturn dashas. The native matures late but with deep roots — the peak of the yoga's delivery is often in the 40s and 50s, not early in life.",

  // ─── Special ────────────────────────────────────────────────────────────
  gajakesari: "Respect follows the native across every room they enter — the Jupiter-Moon pairing creates natural gravitas. Income grows through professional wisdom rather than speculation; gradual-and-solid accumulation across mid-life. Jupiter's dasha periods activate this most dramatically — teaching, advisory, or leadership roles. Weakens if Jupiter is in a dusthana or debilitated, otherwise a reliable life-long support.",
  amala: "Reputation of unimpeachable integrity. Others describe the native as 'a class act' — charitable, honoured, fair in dealings. The tenth-house benefic anchor means this shows up most clearly in professional life. Ideal for public roles where trust is currency — law, medicine, finance, public service.",
  parvata: "Socially prominent, likely becomes a leader in their chosen city or field. Benefics-in-kendras with clean dusthanas creates an effortless visibility — people gravitate to the native. Public speaking, leadership of cultural or civic institutions, or a well-known professional practice all flourish here.",
  kalanidhi: "Classical treasure of the arts and sciences. Jupiter in the 2nd or 5th with Mercury-Venus influence produces someone comfortable in cultured, literary, or scholarly circles. Income flows through knowledge-based work. Best activated during Jupiter-Mercury or Jupiter-Venus dashas.",
  lakshmi: "Exceptional fortune signature. Wealth, beauty, spouse, and status all align through the 9th lord's kendra strength. Most potent when the 9th-lord's dasha runs — expect rapid jumps in status, property, fame, and relationships during these years. Maintain dharmic conduct to sustain the yoga's full flow.",
  budhaditya: "Clear thinking, eloquent speech, persuasive writing, intellectual recognition. Career benefits most in knowledge-based or communication-heavy fields. Sun-Mercury dasha periods are inflection points — expect promotions, publications, or visibility milestones. Only cautions: if Mercury is combust (too close to Sun), the yoga weakens; check the degree separation.",
  saraswati: "A scholar's chart — fame through speech, writing, teaching, or arts. Jupiter-Mercury-Venus's combined kendra/kona blessing makes the native a natural educator or cultural voice. Activates strongly during Jupiter, Mercury, or Venus dashas. Classical signature of Sanskrit pundits, senior academics, and cultural icons.",
  parivartana_general: "Sign exchange fuses the themes of the two involved houses. The lords 'live in each other's worlds', so activating the dasha of one lord also brings the other house's themes forward. Exchanges involving kendras and konas create raja yogas; exchanges involving dusthanas create either vipareet raja (cancel-each-other) or khala (conflicted) signatures depending on specifics. Read the two houses together as a single interlinked life-domain.",
  shubha_kartari_lagna: "Protected life-environment — benefic planets flank the self on both sides, filtering out raw pressures. People often describe the native as 'lucky' or 'born to nice circumstances'. The protection is real and passive; less effort needed to secure basic life foundations than most charts.",

  // ─── Chandra ────────────────────────────────────────────────────────────
  adhi_moon: "Positional power. The native rises into leadership of teams, organizations, or institutions — the 6/7/8 from Moon configuration classically produces kings, ministers, and army chiefs. Expect authority roles during the dashas of the benefics involved.",
  sunapha: "Mental energy radiates outward — the native expresses ideas, earns from intellect or words, and often builds income streams through thought-leadership. Activation during the dasha of the planet in 2nd-from-Moon.",
  anapha: "An emotionally-rich inner life with strong constitution and charm. The 12th-from-Moon planet colours dreams, meditation, and the unconscious — spiritual seeking or creative imagination often become meaningful. Freedom from disease and pleasant social presence are classical markers.",
  duradhara: "Supported from both sides emotionally and materially — domestic help, good servants, and steady lifestyle comforts. Income covers expenses reliably. Activates strongly during any of the dashas of the planets flanking the Moon.",
  kemadruma: "Moon's isolation creates an inward-turned, sometimes lonely emotional life. Classical texts are quite dire; modern interpretation softens this: the native develops deep self-reliance and sometimes extraordinary introspective wisdom. Most classical cancellations (benefic aspect on Moon, or Moon in kendra from Lagna) fully rescue the yoga.",
  shubha_kartari_moon: "A protected mind. Worry and anxiety find it hard to settle because benefics flank the emotional center. Strong support from maternal figures, nurturing environments, or close friends characterises life.",

  // ─── Surya ──────────────────────────────────────────────────────────────
  vesi: "Sun's forward-flowing energy — the native earns through effort and authority, with speech and positional clarity. If the 2nd-from-Sun planet is benefic, reputation is smooth; if malefic, the rise comes through conflict and struggle but is still real.",
  vosi: "The trailing planet from Sun shapes the native's 'hidden' side — what people say about them, the energy behind their visible persona. Benefic flavour = charitable behind-the-scenes character; malefic flavour = pressure from reputation-management.",
  ubhayachari: "Sun is surrounded on both sides — public identity is fully formed, visible, and supported (or tested) by multiple planetary influences. Royal or quasi-royal life, defining public roles. Activation through the dashas of the flanking planets.",

  // ─── Raja ───────────────────────────────────────────────────────────────
  chamara: "Royal favour and long, honoured life. Exalted lagna lord + Jupiter's aspect produces natural leadership presence. Peak achievement during the lagna lord's dasha. Especially strong for politicians, executives, and long-tenure officials.",
  maha_raja: "Fame and deep happiness — the exchange between lagna and 5th lord aligns self-expression with purpose. The native's creative output (children, art, intellectual work) becomes their public identity. Activates around the lagna-lord / 5th-lord dashas.",
  raja_kendra_kona: "A Raja Yoga in the classical sense — power, status, recognition in one's field. The strength depends entirely on the specific lords involved and their dignity. Most charts have one or more of these; the yoga is practically ubiquitous but genuinely powerful.",
  yogakaraka_planet: "A single planet doing double duty — its dasha becomes the defining period of life, bringing career rise, authority, prosperity, and overall good fortune simultaneously. Treat this planet's dasha as the 'prime time' for major life moves.",
  akhanda_samrajya: "Undivided empire — the 2nd/9th/11th lords' fusion with Jupiter's blessing creates sustained, hereditary-like prosperity. Wealth compounds across decades, not years. Excellent for family businesses, institutional leaders, and those who inherit responsibility.",
  harsha_vipareet: "Victory arrives through adversity. Early life may feature enemy-themed challenges (competition, health setbacks, debts) but the native triumphs over each — building strength and reputation through those very struggles. Peak delivery during 6th-lord dashas.",
  sarala_vipareet: "Longevity and depth come from crisis-navigation. The 8th lord's reverse becomes a research and transformation signature — excellent for investigative work, finance, surgery, insurance, occult sciences. Late-blooming authority.",
  vimala_vipareet: "Expense mastery — the native is unusually good at doing more with less. Frugality becomes a superpower that unlocks financial freedom. Often seen in charts of self-made entrepreneurs and monastics.",
  neecha_bhanga: "What looked like a weakness becomes a hidden Raja Yoga. The debilitated planet's dasha is the turning point — early life feels restricted in that domain, then mid-life or the dasha itself delivers a reversal that looks like overnight success to observers.",
  shankh: "Classical prosperity signature — wealth, wife, sons; intelligent, long-lived, grateful to benefactors. The triple combination (strong Lagna lord + mutual-kendra 5L/6L) is rare enough that when present it reliably delivers.",
  bhairi: "Harmony across life-domains — family, career, wealth, wisdom. Venus, Jupiter, and the Lagna lord in kendras with a strong 9th lord creates universal benefic support. Royal status or equivalent community standing.",
  mridang: "The widespread dignity of planets creates a 'musically balanced' chart — no single domain dominates or falters. Even, moderate prosperity across all houses. Excellent life-texture even if no single spectacular achievement marks the chart.",
  shrinath: "The 7L-10L-9L alignment produces exceptionally elevated status — described classically as 'equal to Lord Devendra' (chief of gods). Rare, reserved for charts with genuinely royal trajectories or comparable modern equivalents (CEOs, senior statesmen).",
  khadg: "Wealth and fortune through intelligent execution of inherited or learned opportunities. The 2L-9L exchange channels ancestral or dharmic resources into the native's direct action.",
  matsya: "The classical jyotishi signature — chart-reader, counsellor, spiritual advisor. The specific benefic/malefic arrangement in 1/9/4/8 produces deep pattern recognition. Often seen in astrologers, psychologists, and pattern-matching professionals.",
  kurma: "The tortoise yoga — slow-but-sure, patient, eventually-dominant. Dignified benefics in 5/6/7 + dignified malefics in 1/3/11 creates a leader who outlasts rivals through steadiness rather than speed.",

  // ─── Dhana ──────────────────────────────────────────────────────────────
  dhana_yoga: "Wealth lords are connected — income flow has natural structure. Typically not a 'get-rich-quick' signature but rather 'wealth-arrives-when-the-dashas-support-it'. Activate the dhana flow by investing during the dashas of the involved lords.",
  dhana_mutual_aspect: "Wealth through relational dynamics — income responds to partnership, negotiation, and reciprocal exchange. Strongest during the mutual-aspect dashas.",
  sun_lagna_wealth: "Wealth through authority, government dealings, or senior administrative roles. Sun's own-sign placement in lagna with Mars-Jupiter influence means leadership becomes the income source.",
  jupiter_lagna_wealth: "Wealth through wisdom, teaching, advisory, finance, or law. Jupiter's own-sign lagna with Mercury-Mars creates a dharmic breadwinner — prosperity flows from integrity and expertise.",
  venus_lagna_wealth: "Wealth through arts, luxury, hospitality, relationships, or refined professions. Venus's own-sign lagna with Saturn-Mercury produces durable income from beauty and craft.",
  chandra_mangal: "Entrepreneurial drive — Moon-Mars conjunction produces strong earning instinct and independent operation. Real estate, trade, hospitality, physical goods all flourish. Periods of Moon-Mars dashas are peak earning windows.",
  lakshmi_: "", // placeholder if any duplicate keys — unused
  vasumati: "Wealth compounds in the second half of life. Benefics in upachayas grow with time — patience is rewarded. Early struggles around 3rd/6th themes (courage, competition) are the growing pains before the yoga blossoms in the 10th/11th dashas.",

  // ─── Doshas ─────────────────────────────────────────────────────────────
  shakata: "Classical fortune-reversal pattern. Status, wealth, or reputation can fluctuate — a period of rise followed by unexpected setback, then gradual recovery. Jupiter's strength and benefic aspects significantly reduce the severity. Dharmic conduct and Jupiter remedies (offerings on Thursdays, Guru mantras) are classical mitigations.",
  papa_kartari_lagna: "Self-expression feels pressured from both sides. The native develops extraordinary self-reliance because there's no room to be casual. Long-term this builds iron character; short-term it can feel exhausting. Strengthening the Lagna lord (its mantra, dasha-preparedness) is the key classical mitigation.",
  papa_kartari_moon: "Mental space feels crowded by external pressure. Anxiety and worry come more easily than to other charts. Protection routines — meditation, journaling, therapy, physical exercise — materially reduce the dosha. Moon-strengthening (pranayama, silver, dairy) also classical.",
  guru_chandal: "Unorthodox wisdom — the native questions traditional authority but also develops unusual spiritual insight. Shadow side: ethical conflicts or guru-related disappointments. Best handled by aligning with a genuine teacher while maintaining healthy scepticism. Jupiter's dignity improves outcomes significantly.",
  angaraka_yoga: "Intensified drive — good for competitive fields (sports, surgery, technology, entrepreneurship), challenging in personal relationships. Mars-Rahu conjunction asks for conscious channelling of the aggression into creative ambition rather than raw conflict.",
  vish_yoga: "Emotional depth with a serious undertone. Periods of loneliness or melancholy feature, balanced by extraordinary patience and concentration. Excellent for long-term craft, research, or monastic pursuits.",
  shapit_yoga: "Karmic tests arrive as slow-moving challenges. Patience yields deep mastery over time. Meditation, Hanuman / Shiva practices, and sustained effort are the classical remedies.",
  daridra_lagna_12_swap: "Tight financial flow — expenses can outrun income during early decades. The pattern softens with dharmic lifestyle, automated savings, and careful avoidance of large loans. Favourable dashas of benefics (especially of Jupiter and Venus) periodically open relief windows.",
  grahana_yoga: "The luminary (Sun or Moon) is eclipsed by a node — identity or emotions feel 'filtered' through karmic themes. Strong intuition, unusual life path, sometimes psychic sensitivity. Consciously channelled, this becomes a creative or spiritual gift; unchannelled, it produces periods of confusion.",
  kala_sarpa: "All classical planets sit between Rahu and Ketu — life feels karmically charged. Obstacles arrive in unexpected sequences but push the native toward a specific dharmic purpose. Strong public influence is often a feature of this yoga; spiritual practice softens the turbulence and sharpens the direction.",

  // ─── Per-ascendant yogakarakas ──────────────────────────────────────────
  asc_yk_aries: "For Aries natives, Sun and Jupiter are the dharmic trikona pillars. Their dignity and dasha periods bring recognition, wisdom, and royal blessings. Career peaks during Sun or Jupiter dashas.",
  asc_yk_taurus: "Saturn's dasha is the career-defining period for Taurus. 9+10 ownership produces career-dharma alignment — expect authority, fame, and steady wealth during Saturn mahadasha or major antardashas.",
  asc_yk_gemini: "Venus's dasha is the creative and financial peak for Gemini. Partnerships, arts, and refined professions flourish when Venus antardashas activate within Mercury or other mahadashas.",
  asc_yk_cancer: "Mars's dasha defines the life of a Cancer native. 5+10 ownership unites purpose and profession — expect fame through action, courage, property, and authoritative creativity during Mars periods.",
  asc_yk_leo: "Mars as 4+9 lord gives Leo natives real-estate success, maternal blessings, and long journeys that shape dharma. Activates most strongly in Mars mahadasha and any time Mars transit touches Leo, 4th, or 9th houses.",
  asc_yk_virgo: "Mercury-Venus association is the signature raja-yoga trigger for Virgo. When Mercury's dasha runs with Venus's antardasha (or vice versa), watch for career breakthroughs, intellectual recognition, and refined partnerships.",
  asc_yk_libra: "Saturn is the supreme yogakaraka for Libra. Its mahadasha or major antardashas bring peak authority, disciplined wealth, and institutional prominence. Cultivate Saturn's virtues (patience, service, integrity) to maximize.",
  asc_yk_scorpio: "Sun and Moon together define raja yoga potential for Scorpio. When their dignity is high, Sun dashas bring authority, Moon dashas bring public affection. Sun-Moon antardashas are peak times.",
  asc_yk_sagittarius: "Sun and Mars together form raja yoga for Sagittarius. 5+9 dharmic alignment produces righteous leadership. Activate during Sun or Mars periods — think authority, confrontation, or physical action in dharmic service.",
  asc_yk_capricorn: "Venus is the supreme yogakaraka for Capricorn. 5+10 fusion brings fame through beauty, art, luxury, or refined commerce. Venus's mahadasha is the career peak window; cultivate Venus (arts, aesthetics) for maximum unlock.",
  asc_yk_aquarius: "Venus as 4+9 lord brings Aquarius natives property, maternal peace, and long dharmic journeys. Venus dashas activate international opportunities, refined professional standing, and relationship-based wealth.",
  asc_yk_pisces: "Mars-Jupiter pairing is Pisces' raja yoga signature. When the two combine (conjunction, aspect, or kendra relationship), expect righteous authority, teaching, or legal/advisory work. Jupiter dasha with Mars antardasha (or vice versa) = peak.",

  // ─── Bhava yogas — 5th lord ────────────────────────────────────────────
  bhava_5_in_1: "Intellect and creativity shape identity. The native is often known for their mind — a teacher, writer, performer, or wise counsellor. Children's success reflects positively on the native's own standing. 5th lord's dasha is a self-defining period.",
  bhava_5_in_2: "Creative or intellectual output directly translates into income. Eloquence, education, and investment acumen produce wealth; family wealth often passes through the native's creative hands.",
  bhava_5_in_3: "Courage supports intellectual endeavours. Younger siblings or close collaborators assist in creative pursuits. Short journeys, writing, and communications become ways the native channels 5th-house themes.",
  bhava_5_in_4: "Happiness at home centres on learning, children, and comfort. Education, property, and emotional security are deeply linked. 5th lord dasha periods bring peak home-related contentment.",
  bhava_5_in_5: "Powerful raja yoga — 5L in own house creates a pure self-contained signature. Children's success, intellectual fame, creative pursuits all flourish. Peak activates during the 5th lord's mahadasha.",
  bhava_5_in_6: "Early difficulty with children or education, or intellectual work that involves service / conflict. Service-oriented teaching, advocacy, or fighting for causes fits well. Struggles eventually yield mastery.",
  bhava_5_in_7: "Marriage and partnership bring creative and intellectual wealth. Spouse often educated, artistic, or supportive of the native's creativity. Joint ventures in knowledge industries flourish.",
  bhava_5_in_8: "Deep research and transformative learning. Children may come late or through unusual paths. Investigative work, occult studies, or research careers fit this placement. Intellect deepens through crisis.",
  bhava_5_in_9: "Exceptional raja yoga — the two trikona lords' concerns unite. Dharma, fortune, wisdom, and creative output all compound. Higher education, teaching, and advisory paths become lifelong signatures.",
  bhava_5_in_10: "Purpose aligns with career — the 5+10 combination produces recognition through intellectual or creative work. Advisory, teaching, writing, or creative leadership become the public face.",
  bhava_5_in_11: "Income through creativity, children, or speculative ventures. Networks of fellow creatives support wealth; teaching or producing content flourishes.",
  bhava_5_in_12: "Creative expression through imagination, foreign settings, or spirituality. Expenditure on children or education is significant. Fame, if it comes, is not the driving motivation — inner expression is.",

  // ─── Bhava yogas — 9th lord ────────────────────────────────────────────
  bhava_9_in_1: "The native IS lucky — dharma and fortune are embodied. Father (or father-figure) blesses early life. Natural respect and philosophical inclination colour the personality.",
  bhava_9_in_2: "Wealth through dharma, teaching, or institutional honour. Ethical earnings produce long-term stability. Family inheritance and prestige are common.",
  bhava_9_in_3: "Courage in dharmic pursuits. Younger siblings support the native's philosophical life. Short journeys produce blessings; writing and communications fulfill dharma.",
  bhava_9_in_4: "Happy home rooted in dharma. Mother is devoted; property and comfort flow through family lineage. Inner peace comes from spiritual or philosophical foundations.",
  bhava_9_in_5: "Exceptional raja yoga — the two trikona lords align. Children are blessed; intelligence is sharpened by wisdom; authority comes through dharmic expression.",
  bhava_9_in_6: "Victory over enemies through dharma. Service-oriented dharma-career (law, medicine, teaching). Health improves after initial struggle; disputes typically resolve in native's favour.",
  bhava_9_in_7: "Fortunate marriage — spouse brings prosperity and dharmic support. International partnerships or cross-cultural alliances flourish.",
  bhava_9_in_8: "Hidden blessings — fortune manifests through inheritance, deep transformation, or late-life spiritual insight. Father's legacy often surfaces through unusual channels.",
  bhava_9_in_9: "Supreme fortune signature. Highly virtuous, devoted to teachers, respected as scholar or leader. Pilgrimage, philanthropy, spiritual realization mark life.",
  bhava_9_in_10: "Career and dharma fuse completely. Fame through teaching, law, advisory, or dharmic institutions. The native is seen as an authority of principle, not just competence.",
  bhava_9_in_11: "Abundant gains through dharmic work and networks. Elder siblings bring fortune; large social circles support spiritual or philosophical pursuits.",
  bhava_9_in_12: "Dharma via renunciation, foreign lands, or intensive spiritual practice. Wealth often redirected to charity. Moksha-oriented life arc.",

  // ─── Bhava yogas — 10th lord ───────────────────────────────────────────
  bhava_10_in_1: "Career shapes identity — the native IS their profession. Self-made; authority earned young. Public visibility comes naturally.",
  bhava_10_in_2: "Career directly feeds wealth. Strong income flow through profession. Family name adds visibility to career.",
  bhava_10_in_3: "Career through communication, writing, travel, sales, or alliance with siblings. Entrepreneurial drive; short ventures succeed.",
  bhava_10_in_4: "Career built from a family base — real estate, property, mother-related themes. Inner stability drives outer success.",
  bhava_10_in_5: "Powerful raja yoga — career aligned with purpose and creative vision. Fame through teaching, performance, or intellectual work.",
  bhava_10_in_6: "Career in service industries, medicine, law, or handling disputes. Hard work overcomes initial obstacles; steady promotion through diligence.",
  bhava_10_in_7: "Career through partnerships, public dealings, trade, or consulting. Spouse supports or participates in professional life.",
  bhava_10_in_8: "Career in research, investigation, insurance, occult, or transformation industries. Multiple career shifts before finding depth; late-blooming success.",
  bhava_10_in_9: "Exceptional raja yoga — career merges with dharma, teaching, law, advisory, international work. Recognized as guide or mentor.",
  bhava_10_in_10: "Peak career signature — high visibility, authority, institutional prominence. Digbala (directional strength) for career.",
  bhava_10_in_11: "Career produces abundant gains, network support, fulfilled ambitions. Success through industry connections and goal-orientation.",
  bhava_10_in_12: "Career in foreign lands, isolation-dependent fields, spirituality, hospitals, or charitable institutions. Behind-the-scenes influence.",

  // ─── Chandra yoga flavour variants ─────────────────────────────────────
  sunapha_benefic: "Purely positive Sunapha — intellect and income flow together through benefic channels. Expect creative, communication, or teaching-based earnings activated during the benefic planet's dasha.",
  sunapha_malefic: "Effort-earned wealth via hard industries — labour, competition, structured discipline. Income comes with friction but is real. Malefic's dasha is intense but productive.",
  anapha_benefic: "Inward benefic colouring — spiritual, charitable, or creative expenditure signatures. Freedom from disease, quiet pleasures, meditation, and refined imagination all flourish.",
  anapha_malefic: "Lessons through loss or detachment. Foreign exposure, monastic tendencies, or austerity themes. Builds detachment strength over time.",
  duradhara_benefic: "Both sides of Moon lit by benefics — a rare fully-positive Duradhara. Smooth material life, good household, excellent support staff. Wealth flows easily; only caution is complacency.",
  duradhara_malefic: "Pressure from both income and expense — survival-built character. Prosperity arrives through endurance; once reached, it's unshakable because it was earned hard.",
};
