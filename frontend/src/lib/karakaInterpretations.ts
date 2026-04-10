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
// Chara Karaka in House — what each role means when placed in houses 1-12
// ---------------------------------------------------------------------------
export const CHARA_KARAKA_IN_HOUSE: Record<string, Record<number, string>> = {
  AK: {
    1: "Soul purpose is deeply tied to self-development, physical well-being, and establishing your personal identity. You are here to learn independence and self-reliance.",
    2: "The soul's lesson revolves around wealth, speech, and family values. Accumulating resources and refining your communication are central to your life path.",
    3: "Courage, self-expression, and initiative are the soul's focus. Writing, performing, or entrepreneurship may be part of your higher purpose.",
    4: "Emotional security, home, and motherly bonds are the soul's domain. Finding inner peace through domestic stability is a core life theme.",
    5: "Creativity, children, and intelligence are the soul's arena. Your life purpose involves creative expression, teaching, or guiding the next generation.",
    6: "The soul learns through overcoming obstacles, service, and healing. You may be drawn to medicine, law, or social work as pathways of growth.",
    7: "Relationships and partnerships are the soul's great teacher. Learning compromise, understanding others, and achieving balance in unions is your central lesson.",
    8: "Transformation, the occult, and deep research define the soul's journey. You are here to uncover hidden truths and undergo profound personal metamorphosis.",
    9: "Dharma, higher wisdom, and philosophy are the soul's calling. Teaching, spirituality, travel, and connection to a guru are central themes.",
    10: "Career, public duty, and authority are the soul's stage. You are here to build something meaningful in the world and earn lasting recognition.",
    11: "Fulfilling ambitions, serving communities, and gaining through networks define the soul's purpose. Large-scale impact through social connections is indicated.",
    12: "Spiritual liberation, foreign lands, and dissolution of ego are the soul's path. You are here to transcend material attachments and find moksha.",
  },
  AmK: {
    1: "Career is deeply personal — you are your own brand. Self-employment and personal influence drive professional success.",
    2: "Career connects to finance, speech, or family business. Earning through knowledge, food, or banking is indicated.",
    3: "Career thrives through communication, media, writing, or sales. Siblings may play a role in your professional path.",
    4: "Career connected to real estate, education, automobiles, or homeland. Working from home or in property businesses is favourable.",
    5: "Career in education, entertainment, speculation, or creative fields. You may guide or teach children or youth.",
    6: "Career in medicine, law, service industries, or competitive fields. You excel in overcoming professional challenges.",
    7: "Career through partnerships, consulting, or foreign trade. Business partnerships are central to professional growth.",
    8: "Career in research, insurance, occult sciences, or transformation work. You may thrive in fields others avoid.",
    9: "Career in higher education, law, religion, publishing, or international affairs. A guru or father figure shapes your path.",
    10: "Career is strong and central to your identity. Government, management, or high-authority positions are natural fits.",
    11: "Career success comes through networks, large organizations, and friend circles. Gains from profession are substantial.",
    12: "Career may involve foreign lands, spiritual institutions, hospitals, or behind-the-scenes work. International connections are fruitful.",
  },
  DK: {
    1: "Spouse is very similar to you in personality. Marriage strongly shapes your identity and physical appearance.",
    2: "Spouse brings wealth or connects to your family. Partner may have beautiful speech or come from a well-to-do family.",
    3: "Spouse is communicative, courageous, and possibly artistic. You may meet through short travels or sibling connections.",
    4: "Spouse is homely, nurturing, and property-oriented. Deep emotional bonding and domestic happiness through marriage.",
    5: "Spouse is creative, romantic, and intelligent. Children strengthen the marriage bond. Love marriage is indicated.",
    6: "Marriage may face health or legal challenges. Spouse may be in a service profession. Conflicts require patience.",
    7: "Spouse is partnership-oriented, diplomatic, and balanced. Marriage is a strong and defining life theme.",
    8: "Deep, transformative, and intense marriage bond. Spouse may bring inheritance. Joint finances are important.",
    9: "Spouse is philosophical, fortunate, or from a different cultural background. Marriage improves your luck and dharma.",
    10: "Spouse is career-oriented and ambitious. Marriage enhances your public standing and professional reputation.",
    11: "Spouse is socially connected and brings gains. Friendship-based marriage with shared aspirations.",
    12: "Spouse may be from a foreign land or spiritually inclined. Marriage involves sacrifice, travel, or seclusion.",
  },
  BK: {
    1: "Siblings strongly influence your personality. Great personal courage and initiative.",
    2: "Siblings connected to family wealth. Courage in speech and financial matters.",
    3: "Siblings are strong and supportive. Excellent courage, communication skills, and self-made success.",
    4: "Siblings connected to home and property matters. Courage in domestic affairs.",
    5: "Siblings may be creative or involved in education. Courageous approach to romance and speculation.",
    6: "Challenges with siblings possible. Courage in fighting obstacles and enemies.",
    7: "Siblings involved in your partnerships. Courage in business and relationship matters.",
    8: "Transformative sibling relationships. Courage in facing hidden matters and crises.",
    9: "Siblings connected to dharma and higher learning. Courage in philosophical pursuits.",
    10: "Siblings influence your career. Courage and initiative in professional matters.",
    11: "Gains through siblings. Courageous approach to fulfilling ambitions.",
    12: "Siblings may be abroad or distant. Courage in spiritual pursuits and foreign matters.",
  },
  MK: {
    1: "Mother strongly shapes your personality. Deep emotional connection to physical self.",
    2: "Mother connected to family wealth. Emotional security through finances and speech.",
    3: "Mother is courageous and communicative. Emotional growth through self-effort.",
    4: "Mother is very influential and nurturing. Strong property and vehicle blessings. Deep domestic happiness.",
    5: "Mother connected to your creativity and children. Emotional fulfilment through creative pursuits.",
    6: "Mother may face health challenges. Emotional growth through overcoming obstacles.",
    7: "Mother influences your partnerships. Emotional security through marriage and business ties.",
    8: "Transformative relationship with mother. Emotional depth through hidden or occult matters.",
    9: "Mother is dharmic, fortunate, or spiritual. Emotional growth through wisdom and philosophy.",
    10: "Mother influences your career and public standing. Emotional fulfilment through achievement.",
    11: "Mother connected to social networks and gains. Emotional security through community.",
    12: "Mother may live abroad or be spiritually inclined. Emotional growth through sacrifice and letting go.",
  },
  PK: {
    1: "Children strongly shape your identity. Creative intelligence is a core personality trait.",
    2: "Children connected to family wealth. Creativity in financial matters and speech.",
    3: "Children are brave and communicative. Creative expression through writing, art, or media.",
    4: "Children bring domestic happiness. Creative intelligence in home and property matters.",
    5: "Children are especially blessed and talented. Strong creative genius, romance, and good fortune in speculation.",
    6: "Challenges related to children possible. Creativity applied to service, healing, or overcoming obstacles.",
    7: "Children influence your partnerships. Creative approach to marriage and business.",
    8: "Deep transformative connection with children. Creative research and hidden talents.",
    9: "Children are fortunate and wise. Creative expression through teaching, dharma, and philosophy.",
    10: "Children influence your career. Creative professional reputation and public standing.",
    11: "Gains through children. Creative fulfilment of ambitions through community and networks.",
    12: "Children may live abroad. Creative expression through spiritual or foreign pursuits.",
  },
  GK: {
    1: "Obstacles relate to health and self-image. Enemies target your personality directly.",
    2: "Obstacles in wealth and family matters. Financial debts or disputes require careful management.",
    3: "Obstacles through communication or siblings. Rivals in business or creative fields.",
    4: "Obstacles related to property, vehicles, or mother. Domestic disputes need attention.",
    5: "Obstacles in children, creativity, or romance. Speculative losses possible; careful planning needed.",
    6: "Enemies and obstacles are well-handled — you effectively defeat rivals and manage debts. Strong health recovery.",
    7: "Obstacles through partnerships and marriage. Legal disputes or business rivalry.",
    8: "Obstacles manifest as sudden crises, health issues, or inheritance disputes. Transformative challenges.",
    9: "Obstacles in dharma, father, or higher education. Philosophical conflicts or travel disruptions.",
    10: "Obstacles in career and public standing. Professional rivalry or authority conflicts.",
    11: "Obstacles in gaining income or through social networks. Ambitions face resistance.",
    12: "Obstacles in foreign lands or spiritual pursuits. Expenses and losses need monitoring.",
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
