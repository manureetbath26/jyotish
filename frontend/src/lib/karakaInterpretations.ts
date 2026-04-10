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
