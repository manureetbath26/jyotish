/**
 * Karaka (Significator) interpretation tables for Vedic astrology.
 *
 * Two systems:
 * 1. Chara Karakas (Jaimini) — variable, based on planetary degrees in the chart
 * 2. Naisargika Karakas — fixed natural significators per planet
 */

// ---------------------------------------------------------------------------
// Chara Karaka roles — assigned by descending degree within rashi
// ---------------------------------------------------------------------------
export interface CharaKarakaRole {
  id: string;
  name: string;
  shortName: string;
  meaning: string;
  governs: string;
  icon: string;
  lifeThemes: string[];
  strongPlacement: string;
  weakPlacement: string;
}

export const CHARA_KARAKA_ROLES: CharaKarakaRole[] = [
  {
    id: "AK",
    name: "Atmakaraka",
    shortName: "AK",
    meaning: "Soul Significator",
    governs: "Your deepest soul desires, life purpose, and the central lesson of this incarnation. The Atmakaraka is the king of your chart — its house placement and sign reveal what your soul is here to learn and master.",
    icon: "👑",
    lifeThemes: ["Soul purpose", "Core identity", "Spiritual evolution", "Life mission"],
    strongPlacement: "When well-placed (exalted, own sign, or in a kendra/trikona), the soul's journey flows naturally. Recognition, inner peace, and alignment with purpose come with less friction.",
    weakPlacement: "When afflicted (debilitated, combust, or in dusthana houses 6/8/12), the soul faces intense karmic lessons. Struggles in the themes of the occupied house push you toward deeper self-awareness.",
  },
  {
    id: "AmK",
    name: "Amatyakaraka",
    shortName: "AmK",
    meaning: "Career / Advisor Significator",
    governs: "Your professional path, the nature of your work, and the people who guide your career. The Amatyakaraka is the minister of your chart — it shows how you earn, advise, and build your worldly position.",
    icon: "💼",
    lifeThemes: ["Career direction", "Professional reputation", "Mentors & advisors", "Worldly achievement"],
    strongPlacement: "A well-placed AmK brings excellent career growth, wise mentors, and recognition in your profession. Work feels aligned with your natural talents.",
    weakPlacement: "An afflicted AmK can bring career confusion, poor guidance, or professional struggles. The career path may require multiple pivots before finding the right direction.",
  },
  {
    id: "BK",
    name: "Bhratrikaraka",
    shortName: "BK",
    meaning: "Siblings / Courage Significator",
    governs: "Your relationship with siblings, your courage and initiative, and your ability to take bold action. It also governs short journeys and communication efforts.",
    icon: "🤝",
    lifeThemes: ["Siblings", "Courage & will", "Short travels", "Initiative & effort"],
    strongPlacement: "Strong BK gives supportive siblings, natural bravery, and the ability to execute plans with vigor. Short ventures and communication efforts succeed easily.",
    weakPlacement: "Afflicted BK can indicate strained sibling relations, lack of courage, or scattered efforts. Initiative may be blocked or misdirected.",
  },
  {
    id: "MK",
    name: "Matrikaraka",
    shortName: "MK",
    meaning: "Mother / Happiness Significator",
    governs: "Your relationship with your mother, domestic happiness, property matters, emotional security, and inner peace. The Matrikaraka shows the quality of your home life.",
    icon: "🏡",
    lifeThemes: ["Mother", "Home & property", "Emotional peace", "Vehicles & comforts"],
    strongPlacement: "Well-placed MK brings a supportive mother, comfortable home, good vehicles, and deep emotional contentment. Property acquisition comes easily.",
    weakPlacement: "Afflicted MK may indicate a complicated relationship with the mother, residential instability, or inner restlessness. Property matters may face delays or disputes.",
  },
  {
    id: "PK",
    name: "Putrakaraka",
    shortName: "PK",
    meaning: "Children / Creativity Significator",
    governs: "Your relationship with children, creative intelligence, higher education, and the ability to produce lasting works. It also governs romantic attraction and speculative gains.",
    icon: "🎨",
    lifeThemes: ["Children", "Creative expression", "Romance", "Higher learning", "Speculation"],
    strongPlacement: "Strong PK blesses with talented children, creative genius, academic success, and good fortune through speculative ventures. Romance is fulfilling.",
    weakPlacement: "Afflicted PK may delay children, block creative expression, or bring disappointment in romance. Education may face interruptions.",
  },
  {
    id: "GK",
    name: "Gnatikaraka",
    shortName: "GK",
    meaning: "Obstacles / Enemies Significator",
    governs: "The nature of your obstacles, enemies, diseases, and debts. The Gnatikaraka shows the type of challenges you must overcome and the illnesses you are prone to. Overcoming these builds character.",
    icon: "⚔️",
    lifeThemes: ["Enemies & rivals", "Obstacles", "Disease patterns", "Debts & litigation"],
    strongPlacement: "When the GK is strong, you effectively overcome enemies, manage debts, and recover quickly from illness. Challenges become stepping stones to growth.",
    weakPlacement: "Afflicted GK intensifies the nature of obstacles — recurring health issues, persistent enemies, or ongoing legal/financial disputes. Awareness and remedies help mitigate.",
  },
  {
    id: "DK",
    name: "Darakaraka",
    shortName: "DK",
    meaning: "Spouse / Partnership Significator",
    governs: "The nature and qualities of your spouse, the quality of your marriage, and your approach to partnerships. The Darakaraka is the most important planet for relationship analysis in Jaimini astrology.",
    icon: "💍",
    lifeThemes: ["Spouse characteristics", "Marriage quality", "Business partnerships", "Contractual bonds"],
    strongPlacement: "Well-placed DK attracts a supportive, compatible spouse. Marriage brings happiness, stability, and mutual growth. Business partnerships thrive.",
    weakPlacement: "Afflicted DK can delay marriage, bring incompatible partners, or create marital discord. Partnerships require extra effort and conscious compromise.",
  },
];

// ---------------------------------------------------------------------------
// Chara Karaka by Planet — what each specific planet means in each role
// Keyed as [role][planet] → integrated interpretation
// ---------------------------------------------------------------------------
export const CHARA_KARAKA_BY_PLANET: Record<string, Record<string, string>> = {
  AK: {
    Sun: "The Sun as Atmakaraka means your soul's deepest lesson is about ego, authority, and self-identity. You are here to learn true leadership — not through domination, but through integrity and service. The soul craves recognition and respect, but spiritual growth comes when you use authority for others' benefit. Father and government themes are central to your karmic journey. Your life purpose unfolds through positions of visibility and command, and the soul evolves by learning humility within power.",
    Moon: "The Moon as Atmakaraka means your soul's evolution centres on emotional mastery, nurturing, and the mind. You are deeply sensitive, intuitive, and connected to the public. The soul craves emotional security and motherly love, but must learn that true peace comes from within — not from external comfort. Mother is a profoundly karmic relationship. Your life purpose involves caring for others, connecting with masses, and finding mental equilibrium through all of life's fluctuations.",
    Mars: "Mars as Atmakaraka means your soul's journey is about mastering courage, aggression, and willpower. You are here to learn the right use of force — when to fight and when to yield. The soul is drawn to competition, land, property, and physical mastery, but spiritual growth comes through disciplined energy rather than reckless anger. Siblings and rivalry are karmic themes. Your purpose unfolds through brave action, protecting others, and channelling raw energy into constructive achievement.",
    Mercury: "Mercury as Atmakaraka means your soul's purpose revolves around intelligence, communication, and learning. You are here to master the mind — to discern truth from illusion through sharp analysis and clear expression. The soul craves knowledge, intellectual stimulation, and commercial success, but must learn that true wisdom transcends mere cleverness. Education, writing, and trade are karmic themes. Your life purpose unfolds through teaching, connecting ideas, and using intellect in service of deeper understanding.",
    Jupiter: "Jupiter as Atmakaraka means your soul's deepest evolution is through wisdom, dharma, and faith. You are here to become a guide, teacher, or moral compass. The soul craves philosophical truth, children, and spiritual expansion, but must learn to embody wisdom rather than merely preach it. Guru-disciple relationships and ethical conduct are central to your karma. Your purpose unfolds through generosity, righteous action, and expanding others' understanding of life's meaning.",
    Venus: "Venus as Atmakaraka means your soul's lesson centres on love, desire, and the refinement of pleasure. You are here to understand the difference between attachment and true love, between indulgence and appreciation of beauty. The soul craves romance, luxury, and artistic expression, but spiritual growth comes through transforming desire into devotion. Relationships and marriage are profoundly karmic. Your purpose unfolds through art, harmonious connections, and learning to love without possessing.",
    Saturn: "Saturn as Atmakaraka is one of the most spiritually significant placements. Your soul's deepest lesson is about suffering, discipline, and karmic responsibility. You are here to master patience, endure hardship without bitterness, and serve with humility. The soul carries heavy past-life debts that must be repaid through hard work and sacrifice. Democracy, justice, and the common people are your karmic domain. Your purpose unfolds through perseverance — every obstacle is a step toward liberation.",
    Rahu: "Rahu as Atmakaraka means your soul is driven by intense, often insatiable worldly desires that must be experienced and ultimately transcended. You are here to chase ambition, foreign experiences, and unconventional paths — but the deeper lesson is recognising that material achievement alone cannot satisfy the soul. Illusion, obsession, and breaking social boundaries are karmic themes. Your purpose unfolds through extraordinary worldly experiences that eventually turn you inward toward spiritual truth.",
  },
  AmK: {
    Sun: "The Sun as Amatyakaraka makes authority and leadership the defining force in your career. You are meant for positions of command — government, administration, politics, or any field where you can exercise sovereign authority. Professional success comes through confidence, visibility, and the ability to inspire. Your career advisor or mentor is likely an authority figure, possibly connected to government or your father's influence.",
    Moon: "The Moon as Amatyakaraka directs your career toward public-facing, nurturing, or emotionally engaging work. You thrive in professions serving the masses — hospitality, healthcare, food, counselling, or public relations. Your professional instincts are guided by emotional intelligence and intuition. Career guidance comes through maternal figures or emotionally supportive mentors. Professional reputation fluctuates with public mood but builds through genuine care.",
    Mars: "Mars as Amatyakaraka channels aggressive, competitive energy into your career. You excel in engineering, military, police, surgery, real estate, sports, or any field requiring physical courage and decisive action. Professional success comes through bold initiative — you are meant to lead through action, not just words. Career mentors are likely strong, martial personalities. Competition fuels rather than hinders your growth.",
    Mercury: "Mercury as Amatyakaraka makes intellect, communication, and commerce the backbone of your professional life. You are meant for careers in business, technology, writing, accounting, education, or analytical fields. Professional success comes through mental agility, networking, and the ability to translate complex ideas into practical solutions. Career advisors are intellectual, articulate, and commercially savvy. Multiple income streams through diverse skills are indicated.",
    Jupiter: "Jupiter as Amatyakaraka brings wisdom, ethics, and expansion to your professional path. You are drawn to teaching, law, finance, counselling, religious institutions, or advisory roles. Career success comes through knowledge, moral authority, and the ability to guide others. Your professional mentor is a genuine guru figure — wise, generous, and principled. Wealth grows naturally through dharmic professional conduct and reputation for integrity.",
    Venus: "Venus as Amatyakaraka steers your career toward beauty, art, luxury, diplomacy, and relationship-based professions. You thrive in fashion, entertainment, hospitality, jewellery, interior design, or any field involving aesthetic refinement and interpersonal charm. Professional success comes through grace, creativity, and the ability to make others feel valued. Career mentors are refined, well-connected, and socially polished.",
    Saturn: "Saturn as Amatyakaraka means your career is built through relentless hard work, discipline, and long-term perseverance. Success is slow but extremely durable. You excel in government service, engineering, mining, oil, agriculture, real estate, or any field requiring sustained effort and structural thinking. Career mentors are strict, experienced, and teach through demanding standards. Professional authority is earned, never given.",
    Rahu: "Rahu as Amatyakaraka drives your career toward unconventional, foreign, or technology-driven fields. You may excel in IT, foreign trade, politics, media, aviation, or anything that breaks traditional moulds. Professional success comes through innovation, calculated risk, and the ability to operate in unfamiliar territory. Career path involves dramatic rises. Mentors may be foreign or outside your cultural norm.",
  },
  DK: {
    Sun: "The Sun as Darakaraka indicates a spouse who is authoritative, dignified, proud, and possibly connected to government or leadership. Your partner has a strong ego and commands respect — the relationship involves navigating power dynamics. Marriage may connect you to authority figures or political circles. The spouse is loyal and generous but needs recognition and may dominate the relationship if the Sun is afflicted.",
    Moon: "The Moon as Darakaraka indicates a spouse who is emotionally sensitive, nurturing, caring, and deeply intuitive. Your partner is family-oriented with a strong maternal instinct. Marriage brings emotional depth and domestic comfort. The spouse is popular and public-facing but may be moody or overly dependent on emotional security. The relationship thrives on emotional understanding and shared inner life.",
    Mars: "Mars as Darakaraka indicates a spouse who is energetic, passionate, courageous, and possibly hot-tempered. Your partner is action-oriented with strong physical vitality and competitive drive. Marriage is passionate but may involve conflicts and power struggles (Mangal Dosha implications). The spouse may work in engineering, military, sports, or property. The relationship needs channelled energy and mutual respect for independence.",
    Mercury: "Mercury as Darakaraka indicates a spouse who is intelligent, communicative, youthful, and commercially savvy. Your partner is witty, articulate, and possibly involved in business, technology, education, or writing. Marriage is intellectually stimulating with rich conversation and shared learning. The spouse may be younger or have a youthful demeanour. The relationship thrives on mental compatibility and shared curiosity.",
    Jupiter: "Jupiter as Darakaraka is among the most auspicious placements for marriage. Your spouse is wise, generous, ethical, and possibly a teacher, advisor, or spiritual person. In female charts, this is especially significant as Jupiter is the natural husband karaka. Marriage brings expansion, fortune, and dharmic growth. The spouse comes from a good family and supports your highest potential.",
    Venus: "Venus as Darakaraka — the natural love planet as the spouse significator — indicates a deeply romantic, beautiful, artistic, and pleasure-loving partner. Marriage is filled with love, luxury, and sensual enjoyment. The spouse is charming, socially graceful, and values beauty and harmony. This is an excellent placement for marital happiness, especially in male charts. The relationship thrives on mutual appreciation and shared aesthetic sensibility.",
    Saturn: "Saturn as Darakaraka indicates a spouse who is mature, disciplined, hardworking, and possibly older or more serious in nature. Marriage may come later in life but is durable and karmic. The partner teaches you responsibility and patience. The relationship deepens significantly over time. The spouse may work in structured fields — government, engineering, or management. Marriage requires effort but rewards with lasting stability.",
    Rahu: "Rahu as Darakaraka indicates a spouse who is unconventional, foreign, or from a different cultural or social background. Marriage may defy social norms or family expectations. The partner is ambitious, worldly, and technologically oriented. The relationship involves intense attraction and possibly obsessive qualities. The marriage brings exposure to foreign cultures, technology, or non-traditional lifestyle. Ensuring clarity and avoiding illusion in the relationship is important.",
  },
  BK: {
    Sun: "The Sun as Bhratrikaraka means your courage and initiative are fuelled by ego, authority, and a desire for leadership. Siblings (especially brothers) may be authoritative, government-connected, or proud personalities. Your willpower is tied to self-respect — you fight hardest when your dignity is at stake. Initiative comes naturally in matters of leadership and command.",
    Moon: "The Moon as Bhratrikaraka means your courage is emotionally driven — you act bravely to protect those you love. Siblings are emotionally close, nurturing, and may be popular or public-facing. Your initiative is guided by intuition and feeling rather than logic. The mother-sibling dynamic is closely intertwined. Emotional situations bring out your strongest self-effort.",
    Mars: "Mars as Bhratrikaraka is its natural placement — exceptionally powerful for courage, siblings, and initiative. Brothers are strong, competitive, and possibly in military, sports, or property. Your willpower is formidable and physically expressed. You are a natural fighter who thrives under competition. Property acquisition comes through bold, direct action.",
    Mercury: "Mercury as Bhratrikaraka means your courage expresses through intellect, communication, and strategic thinking. Siblings are intelligent, commercially minded, or involved in education and media. Your initiative is analytical — you plan before you act. Self-effort succeeds through networking, writing, business ideas, and clever problem-solving rather than physical force.",
    Jupiter: "Jupiter as Bhratrikaraka means your courage is guided by wisdom, ethics, and dharmic conviction. Siblings are educated, fortunate, or philosophically oriented. Your initiative comes from moral certainty — you act when you believe it is righteous. Self-effort succeeds through teaching, counselling, and expanding others' horizons. Courage in spiritual and educational pursuits is strong.",
    Venus: "Venus as Bhratrikaraka means your courage and initiative express through charm, diplomacy, and artistic drive. Siblings are attractive, artistic, or relationship-oriented. Your self-effort succeeds through social grace, creative ventures, and building harmonious connections. You are brave in matters of love, beauty, and artistic expression. Siblings may work in creative or luxury industries.",
    Saturn: "Saturn as Bhratrikaraka means your courage is forged through hardship, discipline, and endurance. Siblings may face challenges, delays, or carry heavy responsibilities. Your willpower is slow to ignite but virtually unbreakable once committed. Self-effort requires patience — results come late but are permanent. Initiative in structured, long-term projects succeeds. Siblings teach you perseverance.",
    Rahu: "Rahu as Bhratrikaraka means your courage drives you toward unconventional, foreign, or boundary-breaking actions. Siblings may be foreign-connected, technologically oriented, or non-traditional. Your initiative is fuelled by intense ambition and a willingness to break rules. Self-effort succeeds through innovation, calculated risk, and operating outside conventional boundaries.",
  },
  MK: {
    Sun: "The Sun as Matrikaraka means your emotional security and relationship with the mother are tied to authority, dignity, and recognition. Mother may be a strong, authoritative figure or connected to government. Your domestic happiness depends on feeling respected at home. Property and vehicles may come through government connections. Inner peace is found through earning self-respect.",
    Moon: "The Moon as Matrikaraka is its natural role — deeply auspicious. Mother is extremely nurturing, emotionally available, and central to your happiness. Domestic life is rich with emotional warmth and comfort. Property, vehicles, and material comforts come naturally. Your emotional nature is the foundation of your entire life experience. Inner peace through family bonds is strong.",
    Mars: "Mars as Matrikaraka means your emotional nature has a fiery, protective quality. Mother is courageous, independent, and possibly combative or action-oriented. Domestic environment may have conflict but also great vitality. Property and land acquisition involves competitive effort. Your emotional security comes through physical space, territory, and the courage to defend what you love.",
    Mercury: "Mercury as Matrikaraka means your emotional security is tied to learning, communication, and intellectual stimulation at home. Mother is intelligent, articulate, and educationally supportive. Domestic happiness comes through a mentally stimulating environment — books, study, conversation. Property connected to education or commerce. Inner peace is found through understanding, analysing, and making sense of your emotions.",
    Jupiter: "Jupiter as Matrikaraka means your emotional life is guided by wisdom, faith, and generosity. Mother is wise, dharmic, and spiritually nurturing. Domestic happiness is abundant — this is among the best placements for home, property, and maternal blessings. Emotional security comes from a meaningful, ethically grounded home life. Property expansion and comfortable vehicles are favoured.",
    Venus: "Venus as Matrikaraka means your emotional happiness is deeply tied to beauty, comfort, luxury, and harmonious surroundings. Mother is attractive, artistic, or relationship-oriented. Domestic environment is aesthetically beautiful and materially comfortable. Luxury vehicles and well-decorated property are indicated. Inner peace comes through sensory pleasure, art, and loving connections within the home.",
    Saturn: "Saturn as Matrikaraka means your emotional nature is serious, disciplined, and shaped by responsibility. Mother may face health challenges or carry heavy burdens. Domestic happiness comes slowly and requires patient effort. Property acquisition involves delays but results in durable assets. Emotional security is built through structure, duty, and long-term commitment to family stability.",
    Rahu: "Rahu as Matrikaraka means your emotional nature is intense, unconventional, and possibly foreign-influenced. Mother may be non-traditional or connected to foreign cultures or technology. Domestic environment is unusual or breaks social norms. Property may be in foreign locations or involve technology. Emotional security comes through embracing the unconventional and transcending traditional domestic expectations.",
  },
  PK: {
    Sun: "The Sun as Putrakaraka means your creative intelligence and relationship with children are tied to ego, authority, and leadership. Children may be authoritative, proud, or government-connected. Your creative expression seeks recognition and visibility. Romance involves authority dynamics. Speculative success through confident, leadership-oriented ventures. Education emphasises command and dignity.",
    Moon: "The Moon as Putrakaraka means your creativity and connection to children are deeply emotional and intuitive. Children are sensitive, nurturing, and emotionally intelligent. Your creative expression is guided by feeling and imagination. Romance is emotional and nurturing. Creative success in fields involving the public, food, caregiving, or emotional storytelling. Fertility is strong.",
    Mars: "Mars as Putrakaraka means your creative energy is fiery, competitive, and action-oriented. Children are courageous, athletic, and independent. Your creative expression involves physical energy, sports, engineering, or bold artistic ventures. Romance is passionate and intense. Speculative success through bold, decisive risks. Education in technical or martial fields is favoured.",
    Mercury: "Mercury as Putrakaraka means your creativity is intellectual, analytical, and communication-driven. Children are intelligent, articulate, and academically gifted. Your creative expression shines through writing, comedy, business innovation, or intellectual pursuits. Romance involves mental connection and witty exchange. Speculative success through calculated analysis. Education is the cornerstone of your creative life.",
    Jupiter: "Jupiter as Putrakaraka is supremely auspicious for children, creativity, and higher learning. Children are wise, fortunate, and possibly spiritually inclined. Your creative intelligence is guided by dharmic principles and philosophical depth. Romance is meaningful and growth-oriented. Speculative fortune is favoured. Education in philosophy, law, or spirituality brings creative fulfilment.",
    Venus: "Venus as Putrakaraka means your creative life revolves around beauty, art, love, and sensual expression. Children are artistic, attractive, and socially graceful. Your creativity excels in music, visual arts, fashion, or entertainment. Romance is central to your creative inspiration. Speculative success in beauty or luxury industries. Education in fine arts or aesthetics is strongly indicated.",
    Saturn: "Saturn as Putrakaraka means your creative expression is disciplined, structured, and slowly developing. Children may come late or involve responsibilities. Your creativity matures with age and produces lasting, serious work. Romance is cautious and develops gradually. Speculative ventures require careful, long-term strategies. Education demands persistent effort but builds deep expertise.",
    Rahu: "Rahu as Putrakaraka means your creativity is unconventional, boundary-breaking, and technologically oriented. Children may be unusual, adopted, or foreign-influenced. Your creative expression thrives in innovative, cutting-edge, or taboo-breaking fields. Romance involves unconventional attractions. Speculative success through technology or foreign ventures. Education in non-traditional or foreign systems is indicated.",
  },
  GK: {
    Sun: "The Sun as Gnatikaraka means your obstacles and enemies are connected to authority, ego, and power struggles. Rivals are proud, government-connected, or authoritative figures. Health issues may affect vitality, bones, eyesight, or heart. Debts and disputes involve matters of prestige and recognition. Overcoming these challenges requires surrendering ego and finding true inner authority.",
    Moon: "The Moon as Gnatikaraka means your obstacles arise through emotional turbulence, mental anxiety, and public opinion. Enemies exploit your emotional sensitivity. Health issues connect to the mind, fluids, digestion, or chest. Debts may involve family or emotionally charged situations. Overcoming challenges requires emotional resilience and separating genuine intuition from anxious overthinking.",
    Mars: "Mars as Gnatikaraka means your obstacles involve aggression, conflict, competition, and physical danger. Enemies are confrontational, violent, or property-related. Health issues connect to blood, accidents, surgery, or inflammation. Debts involve property or competitive disputes. Overcoming challenges requires disciplined use of force — channelling aggression into constructive action rather than destructive conflict.",
    Mercury: "Mercury as Gnatikaraka means your obstacles arise through miscommunication, intellectual deception, and business disputes. Enemies are clever, articulate, and commercially competitive. Health issues connect to nerves, skin, or respiratory system. Debts involve business or commercial transactions. Overcoming challenges requires sharp analytical thinking and avoiding contractual or communication traps.",
    Jupiter: "Jupiter as Gnatikaraka means your obstacles involve faith, ethics, and issues of judgement. Enemies may appear righteous or use moral authority against you. Health issues connect to the liver, weight, or metabolic disorders. Debts involve educational, legal, or religious institutions. Overcoming challenges requires maintaining genuine wisdom while guarding against false gurus and misguided faith.",
    Venus: "Venus as Gnatikaraka means your obstacles arise through relationships, desire, and sensual indulgence. Enemies exploit your need for love and approval. Health issues connect to reproductive organs, kidneys, or hormonal imbalance. Debts involve luxury purchases or relationship-related expenses. Overcoming challenges requires discernment in love — learning to distinguish genuine affection from manipulative attachment.",
    Saturn: "Saturn as Gnatikaraka means your obstacles are chronic, structural, and karmic in nature. Enemies are persistent, powerful, and operate through systems and institutions. Health issues are chronic — joints, bones, teeth, or depression. Debts are long-standing and systemic. Overcoming challenges requires extraordinary patience, endurance, and acceptance that some burdens are meant to be carried and transmuted through sustained effort.",
    Rahu: "Rahu as Gnatikaraka means your obstacles involve deception, illusion, foreign elements, and unconventional threats. Enemies are cunning, potentially foreign, and operate through confusion and misdirection. Health issues involve mysterious, hard-to-diagnose conditions or toxin exposure. Debts involve foreign matters or technology. Overcoming challenges requires piercing through illusion and maintaining clarity in confusing situations.",
  },
};

// ---------------------------------------------------------------------------
// Naisargika Karakas — fixed natural significators per planet
// ---------------------------------------------------------------------------
export interface NaisargikaKaraka {
  planet: string;
  significations: string[];
  overview: string;
  strongResult: string;
  weakResult: string;
}

export const NAISARGIKA_KARAKAS: NaisargikaKaraka[] = [
  {
    planet: "Sun",
    significations: ["Soul", "Father", "Government", "Authority", "Self-confidence", "Vitality", "Eyesight", "Bones"],
    overview: "The Sun is the natural karaka of the soul (Atma), father, government authority, and vitality. Its condition reflects your relationship with power, recognition, and life force.",
    strongResult: "Strong Sun gives natural authority, government favour, a healthy father, strong vitality, leadership ability, and a noble character. Recognition comes naturally.",
    weakResult: "Weak Sun causes low self-esteem, father issues, government obstacles, poor eyesight, bone weakness, and difficulty asserting authority.",
  },
  {
    planet: "Moon",
    significations: ["Mind", "Mother", "Emotions", "Public", "Fluids", "Fertility", "Comfort", "Memory"],
    overview: "The Moon is the natural karaka of the mind, mother, emotional nature, and the public. Its condition determines your mental peace, popularity, and nurturing ability.",
    strongResult: "Strong Moon gives emotional stability, a loving mother, public popularity, good memory, fertility, and mental peace. Intuition is sharp and reliable.",
    weakResult: "Weak Moon causes mental restlessness, emotional volatility, mother's health issues, poor memory, fluid imbalances, and difficulty connecting with the public.",
  },
  {
    planet: "Mars",
    significations: ["Courage", "Brothers", "Land", "Energy", "Surgery", "Police/Military", "Blood", "Passion"],
    overview: "Mars is the natural karaka of courage, younger siblings, landed property, physical energy, and martial pursuits. Its condition reflects your drive, aggression, and physical vitality.",
    strongResult: "Strong Mars gives exceptional courage, supportive siblings, property gains, athletic ability, surgical precision, and strong blood vitality. Command over land and people.",
    weakResult: "Weak Mars causes cowardice, sibling conflicts, property losses, low energy, blood disorders, accidents, and inability to stand up for oneself.",
  },
  {
    planet: "Mercury",
    significations: ["Intelligence", "Speech", "Commerce", "Education", "Skin", "Maternal uncle", "Humour", "Mathematics"],
    overview: "Mercury is the natural karaka of intelligence, communication, education, trade, and analytical ability. Its condition shows your learning capacity and business acumen.",
    strongResult: "Strong Mercury gives sharp intellect, eloquent speech, business success, mathematical ability, good skin, and academic excellence. Wit and humour are assets.",
    weakResult: "Weak Mercury causes speech defects, learning difficulties, poor business judgement, skin disorders, nervous anxiety, and scattered thinking.",
  },
  {
    planet: "Jupiter",
    significations: ["Wisdom", "Guru/Teacher", "Children", "Dharma", "Wealth", "Husband (female charts)", "Liver", "Expansion"],
    overview: "Jupiter is the greatest benefic — natural karaka of wisdom, children, dharma, prosperity, and the guru. Its condition determines your fortune, ethics, and spiritual growth.",
    strongResult: "Strong Jupiter blesses with wisdom, worthy children, excellent teachers, dharmic conduct, prosperity, and spiritual depth. It is the greatest protector in the chart.",
    weakResult: "Weak Jupiter causes loss of faith, poor judgement, childlessness or troubled children, liver problems, financial mismanagement, and lack of mentorship.",
  },
  {
    planet: "Venus",
    significations: ["Love", "Wife (male charts)", "Luxury", "Art", "Vehicles", "Beauty", "Reproduction", "Sensual pleasure"],
    overview: "Venus is the natural karaka of love, marriage (in male charts), beauty, art, luxury, and all sensual pleasures. Its condition determines your romantic life and material comforts.",
    strongResult: "Strong Venus gives a beautiful and loving spouse, artistic talent, luxury vehicles, material comforts, charm, and a refined aesthetic sense. Relationships flourish.",
    weakResult: "Weak Venus causes relationship troubles, lack of refinement, vehicle problems, reproductive issues, and inability to enjoy life's pleasures. Romance suffers.",
  },
  {
    planet: "Saturn",
    significations: ["Longevity", "Discipline", "Servants", "Grief", "Hard work", "Democracy", "Iron", "Chronic disease"],
    overview: "Saturn is the natural karaka of longevity, karma, discipline, servants, and the common people. Its condition shows your capacity for hard work, patience, and dealing with suffering.",
    strongResult: "Strong Saturn gives long life, disciplined character, loyal employees, success through perseverance, democratic leadership, and mastery over time and karma.",
    weakResult: "Weak Saturn causes chronic ailments, premature ageing, servant problems, laziness, depression, legal troubles, and difficulty bearing life's hardships.",
  },
  {
    planet: "Rahu",
    significations: ["Foreign", "Obsession", "Technology", "Illusion", "Ambition", "Paternal grandfather", "Poison", "Unconventional"],
    overview: "Rahu is the karaka of foreign connections, ambition, technology, and unconventional paths. It amplifies whatever it touches, creating intense desire and worldly drive.",
    strongResult: "Strong Rahu gives success in foreign lands, technological innovation, political cunning, extraordinary ambition, and ability to break social boundaries for growth.",
    weakResult: "Weak Rahu causes confusion, obsessive behaviour, scandals, substance issues, fear of the unknown, and being deceived by illusions or fraudulent schemes.",
  },
  {
    planet: "Ketu",
    significations: ["Moksha", "Spirituality", "Detachment", "Past lives", "Maternal grandfather", "Hidden knowledge", "Sudden events"],
    overview: "Ketu is the karaka of spiritual liberation, past-life karma, detachment, and hidden knowledge. It strips away material attachment to reveal deeper truths.",
    strongResult: "Strong Ketu gives spiritual insight, intuitive wisdom, psychic abilities, and liberation from material bondage. Excellent for astrology, healing, and metaphysical pursuits.",
    weakResult: "Weak Ketu causes confusion, aimlessness, sudden losses, mysterious ailments, and difficulty grounding in practical reality. Past-life debts surface unexpectedly.",
  },
];

// ---------------------------------------------------------------------------
// Naisargika Karaka in House — integrated interpretation connecting
// what a planet naturally signifies with where it sits in the chart
// ---------------------------------------------------------------------------
export const NAISARGIKA_KARAKA_IN_HOUSE: Record<string, Record<number, string>> = {
  Sun: {
    1: "The karaka of the soul in the house of self — your identity, vitality, and life purpose are powerfully self-directed. You radiate natural authority and leadership. Father is a strong influence on your personality. Government and authority figures shape your life path directly.",
    2: "The soul karaka in the house of wealth — your life force is channelled into accumulating resources, preserving family values, and commanding through speech. Father may be connected to family finances. Self-confidence grows through financial security and eloquence.",
    3: "The soul and authority karaka in the house of courage — you assert yourself through bold communication, writing, or media. Relationship with father involves themes of courage and self-effort. Younger siblings may hold positions of authority.",
    4: "The karaka of authority and father in the house of mother and home — a complex placement where paternal and maternal influences compete for dominance. Your vitality is tied to domestic security. Government or authority matters connect to property and land.",
    5: "The soul karaka in the house of creativity and children — your life purpose expresses through creative intelligence, education, and guiding the next generation. Father is a source of wisdom. Government connections benefit through intellectual or speculative pursuits.",
    6: "The karaka of vitality in the house of disease — health requires vigilance as the life force faces obstacles through enemies, debts, or chronic conditions. However, this placement gives excellent ability to defeat rivals. Father may face health challenges or work in service/medical fields.",
    7: "The soul karaka in the house of partnerships — your identity is deeply shaped by marriage and business partnerships. Authority is exercised through collaboration. Father influences your choice of spouse. Government connections come through partnerships and contracts.",
    8: "The karaka of vitality and father in the house of longevity and transformation — deep karmic lessons around authority, father, and self-identity. Vitality fluctuates through life crises that ultimately transform you. Government matters involve hidden or investigative work.",
    9: "The soul karaka in the house of dharma and fortune — exceptionally auspicious. Your life purpose aligns with higher wisdom, teaching, and righteous conduct. Father is fortunate, wise, or spiritually inclined. Government favour and authority come through dharmic pursuits.",
    10: "The karaka of authority in the house of career — powerful placement for public recognition, government position, and professional authority. Your vitality is channelled into worldly achievement. Father strongly influences your career path. Natural leader in your field.",
    11: "The soul karaka in the house of gains — your life purpose manifests through large networks, fulfilling ambitions, and accumulated income. Father is connected to gains and social circles. Authority brings financial rewards and community influence.",
    12: "The karaka of the soul in the house of liberation — the ego must surrender for spiritual growth. Vitality may feel depleted in worldly matters but strengthens in spiritual, foreign, or institutional settings. Father may be distant, abroad, or spiritually oriented. Government matters involve foreign affairs or isolation.",
  },
  Moon: {
    1: "The karaka of the mind in the house of self — your emotional nature dominates your personality. You are highly intuitive, empathetic, and publicly visible. Mother is a defining influence. Mental state directly affects physical health. The public is drawn to you naturally.",
    2: "The mind and mother karaka in the house of wealth — emotional security is tied to finances. Mother influences family values and wealth. You earn through nurturing, food, or public-facing work. Memory is excellent for financial and family matters.",
    3: "The karaka of emotions in the house of courage — you communicate with emotional intelligence and intuitive sensitivity. Mother is courageous and self-made. Public appeal comes through media, writing, or artistic self-expression. Mental strength drives initiative.",
    4: "The mind and mother karaka in the house of home — exceptionally strong placement. Deep emotional peace through domestic life. Mother is the central figure in your life. Property, vehicles, and comforts come naturally. Public popularity stems from your nurturing nature.",
    5: "The karaka of mind and emotions in the house of creativity — highly creative, romantic, and emotionally intelligent. Children bring emotional fulfilment. Mother is creative and wise. Fertility is favoured. Speculative success comes through intuitive timing.",
    6: "The karaka of mental peace in the house of enemies and disease — emotional turbulence through health issues, workplace conflicts, or service obligations. Mother may face health challenges. However, emotional resilience in defeating obstacles develops over time.",
    7: "The mind and public karaka in the house of marriage — your emotional life revolves around partnerships. Spouse is nurturing, emotionally expressive, and possibly public-facing. Mother influences your marriage. Business partnerships thrive through public connection.",
    8: "The karaka of the mind in the house of transformation — deep, intense emotional life with psychic sensitivity. Mental transformation through crises builds profound resilience. Mother may face longevity concerns. Fertility and emotional matters undergo major life changes.",
    9: "The mind karaka in the house of dharma — emotionally drawn to wisdom, philosophy, and spiritual pursuits. Mother is dharmic, fortunate, or connected to teaching. Public recognition through higher education or religious/spiritual work. Pilgrimages bring peace.",
    10: "The karaka of the public in the house of career — excellent for public-facing careers, politics, and mass appeal. Your emotional nature drives professional success. Mother influences your career. Mental determination builds lasting authority and reputation.",
    11: "The mind and public karaka in the house of gains — emotional fulfilment through social networks, community, and achieving ambitions. Mother is connected to gains and elder siblings. Public popularity brings income. Many friendships nurture your emotional well-being.",
    12: "The karaka of the mind in the house of isolation — emotional sensitivity to spiritual realms, foreign lands, and subconscious patterns. Mother may be distant or spiritually oriented. Mental peace comes through solitude, meditation, and surrender. Public life may feel draining.",
  },
  Mars: {
    1: "The karaka of courage and energy in the house of self — you are physically strong, assertive, and action-oriented. Brothers may be influential. Natural aptitude for sports, military, surgery, or engineering. Property and land matters favour you through personal initiative.",
    2: "The courage and property karaka in the house of wealth — you accumulate wealth through bold action, property deals, or competitive fields. Speech is direct and commanding. Brothers connect to family finances. Blood-related health requires attention.",
    3: "The karaka of courage in the house of courage — exceptionally brave, self-reliant, and entrepreneurial. Brothers are strong and supportive. Excellence in sports, military, media, or any field requiring physical drive and competitive edge. Property through self-effort.",
    4: "The karaka of land and property in the house of home — strong connection to real estate, vehicles, and fixed assets. However, domestic peace may be disrupted by aggression or conflict. Brothers influence home life. Energy is directed toward building a secure foundation.",
    5: "The courage and passion karaka in the house of romance — passionate, daring approach to love and creativity. Children may be athletic or competitive. Speculative risk-taking is instinctive. Brothers connect to your creative pursuits. Surgery or engineering education possible.",
    6: "The karaka of energy in the house of enemies — powerful placement for defeating rivals, managing debts, and excelling in competitive or martial fields. Brothers may be in service or military. Physical energy is channelled into overcoming obstacles. Surgery and medical fields favour.",
    7: "The karaka of passion and aggression in the house of marriage — intense, passionate partnerships but prone to conflict (Mangal Dosha considerations). Brothers influence your partnerships. Business success through bold, competitive strategies. Property through partnerships.",
    8: "The karaka of blood and surgery in the house of transformation — deep resilience through life crises. Surgical skill or involvement in emergency/crisis work. Brothers may face transformative challenges. Property matters involve inheritance or hidden assets. Accidents require caution.",
    9: "The courage karaka in the house of dharma — courage in pursuing higher knowledge, philosophy, and righteous causes. Brothers are fortunate or connected to education. Property and land gains through dharmic pursuits. Energy directed toward teaching or spiritual warfare.",
    10: "The karaka of energy and property in the house of career — powerful professional drive in engineering, military, police, real estate, or sports. Brothers influence your career. Authority through physical prowess or technical skill. Property and land from professional success.",
    11: "The courage and property karaka in the house of gains — ambitions are achieved through bold action and competitive drive. Brothers bring gains. Income from property, engineering, or military/competitive fields. Network of courageous, action-oriented friends.",
    12: "The karaka of energy in the house of loss — physical energy may be spent in foreign lands, institutions, or spiritual pursuits. Brothers may be distant or abroad. Property matters in foreign locations. Courage is directed inward toward spiritual discipline and letting go.",
  },
  Mercury: {
    1: "The karaka of intelligence in the house of self — you are articulate, youthful, and intellectually curious. Education and communication define your personality. Business acumen is instinctive. Maternal uncle may influence your life path. Skin and nervous system are health focus areas.",
    2: "The intelligence and commerce karaka in the house of wealth — exceptional ability to earn through intellect, trade, accounting, or communication. Eloquent and persuasive speech. Family values are intellectual. Maternal uncle connects to finances. Mathematical and financial skills are strong.",
    3: "The karaka of communication in the house of communication — powerfully placed. Writing, media, sales, short travel, and networking are your greatest strengths. Business success through communication. Maternal uncle is self-made. Education through self-effort excels.",
    4: "The education karaka in the house of home — academic success from a supportive home environment. Intellectual property, home-based business, or educational institutions connect to your domestic life. Maternal uncle influences home matters. Vehicles and comforts through intellect.",
    5: "The karaka of intelligence in the house of creativity — brilliant creative and analytical mind. Education in arts, mathematics, or commerce. Children are intellectually gifted. Speculative success through calculated analysis. Humour and wit attract romantic partners.",
    6: "The intelligence and commerce karaka in the house of service — analytical problem-solving in medical, legal, or accounting fields. Maternal uncle may face health or legal matters. Business skills applied to overcoming obstacles. Nervous health and skin require attention.",
    7: "The karaka of commerce in the house of partnerships — business partnerships are central to your prosperity. Spouse is intelligent, communicative, and commercially oriented. Maternal uncle influences your partnerships. Trade and contractual negotiations are your strength.",
    8: "The intelligence karaka in the house of hidden knowledge — exceptional research ability, occult mathematics, forensic analysis, or insurance/tax expertise. Education in hidden sciences. Maternal uncle faces transformation. Nervous health and skin may undergo crises.",
    9: "The karaka of education in the house of higher learning — very auspicious. Advanced degrees, publishing, philosophical writing, and teaching are favoured. Maternal uncle is fortunate or educated. Business in international trade or education. Higher wisdom through intellectual pursuit.",
    10: "The intelligence and commerce karaka in the house of career — career in communication, technology, business, accounting, or education. Professional reputation built through intellect. Maternal uncle influences career. Commercial success and recognition through analytical skills.",
    11: "The karaka of commerce in the house of gains — income through trade, technology, communication, or intellectual work. Maternal uncle brings gains. Social network is intellectual and business-oriented. Ambitions achieved through calculated strategy and networking.",
    12: "The intelligence karaka in the house of loss — intellect applied to spiritual research, foreign education, or behind-the-scenes analysis. Maternal uncle may be abroad. Business in foreign trade or institutional work. Nervous anxiety requires meditation and rest.",
  },
  Jupiter: {
    1: "The karaka of wisdom and dharma in the house of self — you are naturally wise, ethical, optimistic, and generous. Children and teachers are central to your life. Wealth and expansion come through personal virtue. Liver health needs attention. The greatest natural benefic protecting the self.",
    2: "The wealth and wisdom karaka in the house of wealth — extremely auspicious for accumulated riches, eloquent speech, and strong family values. Children connect to family prosperity. Teachers influence your financial growth. Generous and truthful communication.",
    3: "The dharma karaka in the house of self-effort — wisdom expressed through writing, teaching, and media. Courage is guided by ethics. Children may be courageous or in communication fields. Guru's teachings inspire your creative initiatives. Moderate for Jupiter's expansive nature.",
    4: "The karaka of wisdom and children in the house of home — deeply fortunate for domestic happiness, property, and academic achievement. Children bring joy to the home. Mother is wise and dharmic. Vehicles, property, and educational institutions are favoured.",
    5: "The karaka of children in the house of children — among the most powerful placements. Exceptional blessings through children, creative genius, advanced education, and speculative fortune. Dharmic conduct brings luck. Teachers are profoundly influential. Fertility is strong.",
    6: "The karaka of dharma and prosperity in the house of enemies — wisdom used to overcome obstacles, but prosperity faces hurdles through debts, legal issues, or health concerns. Children or teachers may face difficulties. Liver and weight need attention. Service work guided by ethics.",
    7: "The wisdom and prosperity karaka in the house of marriage — very auspicious for marriage, especially for women (Jupiter = husband karaka). Spouse is wise, prosperous, and dharmic. Children benefit from partnerships. Business partnerships are ethical and profitable. Wealth through collaboration.",
    8: "The karaka of children and dharma in the house of transformation — deep spiritual wisdom through life crises. Children or teachers face transformative experiences. Longevity is generally protected by Jupiter's benefic nature. Wealth through inheritance or occult knowledge. Research into hidden truths.",
    9: "The dharma karaka in the house of dharma — exceptionally powerful. The planet of wisdom in its natural house brings profound spiritual growth, excellent teachers, righteous fortune, and philosophical depth. Children are fortunate. International education and travel are blessed.",
    10: "The karaka of prosperity in the house of career — career in education, law, religion, finance, or advisory roles. Professional reputation built through ethical conduct and wisdom. Children influence your career path. Teachers shape your public standing. Wealth through professional growth.",
    11: "The wisdom and wealth karaka in the house of gains — large income, fulfilled ambitions, and expansive social networks. Children bring gains. Teachers connect to your aspirations. Prosperity through ethical, dharmic means. Elder siblings are fortunate.",
    12: "The karaka of dharma and prosperity in the house of liberation — profound spiritual growth, philanthropic giving, and wisdom through renunciation. Children may be abroad or spiritually inclined. Wealth is spent on spiritual or foreign pursuits. Jupiter protects even in the 12th, mitigating losses.",
  },
  Venus: {
    1: "The karaka of love and beauty in the house of self — you are charming, attractive, and relationship-oriented. Artistic talent is evident in your personality. Luxury, vehicles, and material comforts come naturally. Spouse qualities reflect in your own appearance. Reproductive health is strong.",
    2: "The love and luxury karaka in the house of wealth — very auspicious for accumulated wealth through beauty, art, luxury goods, or entertainment. Sweet, melodious speech. Spouse connects to family wealth. Vehicles and refined tastes are hallmarks. Beauty industry or jewellery favours.",
    3: "The karaka of art in the house of communication — artistic expression through writing, performing arts, media, or creative communication. Spouse may be in communication fields. Luxury short travels. Courageous in romantic pursuits. Beauty and charm in self-expression.",
    4: "The karaka of vehicles and comfort in the house of home — exceptionally comfortable domestic life with beautiful surroundings, luxury vehicles, and material abundance. Spouse creates a harmonious home. Artistic sensibility in interior design. Mother is beautiful or artistic.",
    5: "The love and reproduction karaka in the house of romance — powerfully placed for romantic happiness, creative arts, and blessings through children. Spouse may be met through creative or educational settings. Speculative gains through beauty, art, or entertainment industries.",
    6: "The karaka of love and luxury in the house of enemies — relationships face obstacles through rivals, health issues, or service obligations. Vehicles may cause problems. Reproductive health needs care. However, artistic or beauty skills applied to service and healing can overcome challenges.",
    7: "The karaka of love and spouse in the house of marriage — among the best placements for a beautiful, loving, and harmonious marriage. Spouse is attractive, artistic, and materially comfortable. Business partnerships in beauty, luxury, or creative industries thrive. Strong marital happiness.",
    8: "The love and luxury karaka in the house of transformation — intense, transformative romantic experiences. Spouse brings inheritance or hidden wealth. Reproductive matters undergo changes. Vehicles and luxury through joint finances. Beauty and art connected to mystery, psychology, or the occult.",
    9: "The karaka of love in the house of dharma — spouse is philosophical, fortunate, or from a foreign background. Romance connected to higher learning, travel, or spiritual pursuits. Artistic talent in sacred or philosophical themes. Luxury through international connections and teaching.",
    10: "The beauty and art karaka in the house of career — career in art, beauty, fashion, entertainment, luxury goods, or diplomacy. Professional charm and aesthetic presentation. Spouse influences your career. Vehicles and comforts from professional success. Public reputation is graceful.",
    11: "The karaka of love and luxury in the house of gains — income through beauty, art, entertainment, or relationship-based businesses. Spouse brings social connections and gains. Luxury vehicles and comforts through fulfilled ambitions. Large, aesthetically refined social circle.",
    12: "The love karaka in the house of loss and foreign lands — romantic experiences in foreign settings or with foreign-born people. Luxury spending may be excessive. Spouse may be from abroad or spiritually inclined. Artistic inspiration from solitude, meditation, or travel. Bedroom pleasures are emphasised.",
  },
  Saturn: {
    1: "The karaka of longevity and discipline in the house of self — a serious, mature, and enduring personality. You age with grace and gain authority through patience. Hard work defines your life from an early age. Servants and subordinates are connected to your identity. Chronic health needs lifelong management.",
    2: "The discipline and hard work karaka in the house of wealth — wealth comes slowly but surely through sustained effort and frugality. Speech is measured and authoritative. Family life involves responsibilities and duties. Longevity supports long-term wealth accumulation. Iron, oil, or labour industries favour.",
    3: "The karaka of discipline in the house of courage — courage develops through hardship and perseverance. Younger siblings may face delays or responsibilities. Communication style is serious and structured. Self-effort over long periods brings success. Writing or media work matures with age.",
    4: "The longevity and karma karaka in the house of home — domestic responsibilities are heavy. Property comes through hard work and patience. Mother may face health challenges or carry burdens. Emotional happiness is delayed but deepens with time. Old, ancestral, or distant properties are indicated.",
    5: "The karaka of discipline in the house of creativity — creative expression is structured and serious. Children come late or involve responsibilities. Education requires persistent effort. Romance is cautious and mature. Speculative activity is restrained — slow, steady investments over gambling.",
    6: "The discipline and servant karaka in the house of enemies — excellent for defeating enemies, managing debts, and working through chronic health issues. Servants are loyal and hardworking. Saturn's disciplined nature thrives in overcoming the 6th house challenges. Medical or legal service excels.",
    7: "The karaka of karma and longevity in the house of marriage — marriage is delayed but deeply karmic and enduring. Spouse is older, serious, or hardworking. Business partnerships are built on discipline and long-term commitment. Marriage improves significantly with age and mutual effort.",
    8: "The longevity karaka in the house of longevity — very strong for long life and resilience through crises. However, the journey involves chronic ailments, deep karmic purification, and transformation through suffering. Servants face difficulties. Hard work in research, insurance, or occult fields.",
    9: "The karma karaka in the house of dharma — dharmic path involves discipline, austerity, and serving tradition. Father may be strict, hardworking, or face difficulties. Higher education is earned through persistent effort. Teaching role comes through mastery and experience. Justice through law or governance.",
    10: "The karaka of hard work and discipline in the house of career — among the most powerful career placements. Success through relentless effort, structure, and long-term strategy. Government, engineering, construction, or management careers. Authority is earned, not given. Professional peak comes after 36-40.",
    11: "The discipline and longevity karaka in the house of gains — large, sustained income through disciplined work and patient networking. Ambitions are fulfilled in the long run. Elder siblings carry responsibilities. Democratic leadership in organisations. Gains from iron, oil, labour, or real estate.",
    12: "The karaka of karma in the house of liberation — deep karmic dissolution through spiritual discipline, foreign residence, or institutional work. Servants are connected to foreign or spiritual settings. Chronic health issues need attention in isolation. Hard work in hospitals, ashrams, or prisons may be indicated.",
  },
  Rahu: {
    1: "The karaka of ambition and illusion in the house of self — you project a larger-than-life, unconventional persona. Foreign influences shape your identity. Extraordinary worldly drive and ambition, but self-image may be inflated or illusory. Technology and innovation connect to your personality.",
    2: "The ambition and foreign karaka in the house of wealth — wealth through unconventional, foreign, or technological means. Speech may be deceptive or unusually persuasive. Family values are non-traditional. Paternal grandfather connects to finances. Obsessive accumulation needs balance.",
    3: "The karaka of unconventional drive in the house of courage — exceptionally bold, daring, and media-savvy. Communication through technology, foreign languages, or unconventional channels. Ambition drives entrepreneurial success. Paternal grandfather is self-made. Foreign short travels.",
    4: "The foreign and obsession karaka in the house of home — home may be in a foreign land or have unusual characteristics. Domestic peace is disrupted by worldly ambitions. Paternal grandfather connects to property. Technology in the home. Mother may be non-traditional or foreign-influenced.",
    5: "The karaka of illusion in the house of creativity — highly creative but in unconventional, cutting-edge, or foreign-influenced ways. Children may be unusual or adopted. Romance involves foreign or taboo elements. Speculative gains through technology or unconventional means. Obsessive creative drive.",
    6: "The ambition karaka in the house of enemies — excellent for defeating enemies through cunning and unconventional strategy. Foreign diseases or unusual health conditions possible. Technology applied to service and healing. Rahu's competitive nature thrives against obstacles.",
    7: "The karaka of foreign connections in the house of marriage — spouse may be foreign, unconventional, or from a different cultural background. Partnerships involve technology, foreign trade, or non-traditional arrangements. Marriage may break conventions. Business success through foreign connections.",
    8: "The illusion and obsession karaka in the house of transformation — deep, intense transformation through hidden, occult, or taboo experiences. Foreign connections to inheritance or joint finances. Technology in research or investigation. Paternal grandfather's legacy involves mystery. Poisoning or toxins need caution.",
    9: "The foreign karaka in the house of dharma — spiritual path is unconventional, foreign, or involves non-traditional teachings. Paternal grandfather is dharmic or foreign. Higher education abroad or in technology. Ambition directed toward philosophical or religious innovation.",
    10: "The karaka of ambition in the house of career — extraordinary professional ambition and drive. Career in technology, foreign trade, politics, or unconventional fields. Public image may be larger than reality. Rapid, dramatic career rises (and potential falls). Fame through innovation or foreign connections.",
    11: "The ambition and foreign karaka in the house of gains — very auspicious for large gains through technology, foreign sources, or unconventional networks. Extraordinary ambition for fulfilling desires. Friends from foreign or unusual backgrounds. Paternal grandfather connects to gains.",
    12: "The foreign karaka in the house of foreign lands — powerfully placed for life abroad, foreign success, and spiritual exploration of unconventional paths. Expenses on foreign travel or technology. Paternal grandfather may be abroad. Vivid dreams and psychic experiences through Rahu's illusory nature.",
  },
  Ketu: {
    1: "The moksha and detachment karaka in the house of self — deeply spiritual, psychic, and detached personality. Past-life wisdom manifests as instinctive knowledge. Material identity feels hollow; the self yearns for liberation. Sudden events reshape who you are. Healing and metaphysical abilities are strong.",
    2: "The karaka of spiritual detachment in the house of wealth — detachment from material accumulation. Family values are spiritual rather than material. Speech may be cryptic or spiritually charged. Maternal grandfather connects to finances. Sudden financial events — both gains and losses. Past-life wealth karma resolves.",
    3: "The moksha karaka in the house of courage — spiritual courage and inner will. Communication is intuitive rather than logical. Siblings may be spiritually inclined or distant. Past-life skills in writing, healing, or occult arts surface naturally. Sudden events through short travels.",
    4: "The detachment karaka in the house of home — inner restlessness in domestic life; the soul seeks liberation beyond material comfort. Mother may be spiritually oriented or face sudden changes. Property matters have karmic dimensions. Past-life connections to the homeland or ancestral property.",
    5: "The karaka of past lives in the house of creativity — exceptional past-life creative and spiritual abilities resurface. Children may be unusually intuitive or karmically significant. Romance is karmic and intense. Education in astrology, healing, or occult sciences. Sudden speculative results.",
    6: "The moksha and sudden events karaka in the house of enemies — ability to suddenly dissolve obstacles through spiritual or unconventional means. Mysterious health conditions that require alternative healing. Past-life enemies or debts surface. Ketu's detachment can transcend competitive struggles entirely.",
    7: "The karaka of detachment in the house of marriage — marriage involves karmic completion, spiritual lessons, or past-life connections. Spouse may be spiritually oriented or unusual. Partnerships dissolve material attachments. Business partnerships involve sudden, unexpected turns.",
    8: "The moksha karaka in the house of transformation — extremely powerful for spiritual transformation, occult mastery, and past-life memory access. Sudden, dramatic life changes catalyse awakening. Maternal grandfather's legacy is mysterious. Hidden knowledge and healing abilities are exceptionally strong.",
    9: "The karaka of spirituality in the house of dharma — deeply dharmic placement. Spiritual wisdom comes through past-life merit and inner knowing rather than formal study. Maternal grandfather is spiritual. Pilgrimages and spiritual travel are transformative. Renunciation tendencies are strong.",
    10: "The detachment karaka in the house of career — career may feel unfulfilling materially but is deeply karmic. Work in healing, astrology, spiritual teaching, or research. Sudden career changes. Public reputation involves spiritual or unconventional elements. Maternal grandfather influences career.",
    11: "The moksha karaka in the house of gains — detachment from worldly ambitions, or gains through spiritual and unconventional means. Sudden income through past-life talents. Friends are spiritually oriented. Maternal grandfather connects to social networks. Large-scale spiritual community involvement.",
    12: "The karaka of moksha in the house of moksha — the most powerful placement for spiritual liberation. The planet of detachment in the house of dissolution creates deep, natural inclination toward enlightenment, psychic abilities, and transcendence. Past-life spiritual merit is strong. Foreign ashrams, meditation retreats, and solitary spiritual practice bring profound realization. Maternal grandfather may be a spiritual figure. Material losses serve as gateways to freedom.",
  },
};

// ---------------------------------------------------------------------------
// Planet → color mapping (consistent across the app)
// ---------------------------------------------------------------------------
export const KARAKA_PLANET_COLORS: Record<string, string> = {
  Sun:     "text-amber-400",
  Moon:    "text-blue-300",
  Mars:    "text-red-400",
  Mercury: "text-emerald-400",
  Jupiter: "text-yellow-400",
  Venus:   "text-pink-400",
  Saturn:  "text-slate-400",
  Rahu:    "text-purple-400",
  Ketu:    "text-orange-400",
};

export const KARAKA_PLANET_BG: Record<string, string> = {
  Sun:     "bg-amber-500/10 border-amber-500/30",
  Moon:    "bg-blue-500/10 border-blue-500/30",
  Mars:    "bg-red-500/10 border-red-500/30",
  Mercury: "bg-emerald-500/10 border-emerald-500/30",
  Jupiter: "bg-yellow-500/10 border-yellow-500/30",
  Venus:   "bg-pink-500/10 border-pink-500/30",
  Saturn:  "bg-slate-500/10 border-slate-500/30",
  Rahu:    "bg-purple-500/10 border-purple-500/30",
  Ketu:    "bg-orange-500/10 border-orange-500/30",
};
