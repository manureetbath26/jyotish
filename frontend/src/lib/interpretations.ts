/**
 * Vedic astrology interpretation tables.
 * Used by ChartInterpretation and NavamsaInterpretation components.
 */

// ---------------------------------------------------------------------------
// Lagna (Ascendant) sign descriptions
// ---------------------------------------------------------------------------
export const LAGNA_DESCRIPTIONS: Record<string, { overview: string; strengths: string; challenges: string; health: string }> = {
  Aries: {
    overview: "Aries Lagna gives a bold, energetic, and independent nature. You are action-oriented and pioneering, with strong leadership instincts and a restless drive to initiate. Mars as your chart ruler makes you courageous but also prone to impulsiveness.",
    strengths: "Natural leadership, high physical energy, courage, directness, pioneering spirit",
    challenges: "Impatience, recklessness, tendency to start without finishing, aggression under stress",
    health: "Head, brain, and eyes are sensitive areas. Prone to fevers, headaches, and accidents. Strong constitution overall with fast recovery.",
  },
  Taurus: {
    overview: "Taurus Lagna bestows a stable, sensuous, and determined nature. Venus as chart ruler grants appreciation of beauty, comfort, and material security. You are reliable and patient but can be stubborn once a view is formed.",
    strengths: "Patience, reliability, financial acumen, love of beauty, strong endurance",
    challenges: "Stubbornness, resistance to change, overindulgence, materialistic tendencies",
    health: "Throat, neck, and thyroid are sensitive. Prone to weight gain and indulgence-related conditions. Generally robust health.",
  },
  Gemini: {
    overview: "Gemini Lagna produces an intelligent, adaptable, and communicative personality. Mercury as chart ruler gives quick thinking, versatility, and skill with language. You excel in fields requiring intellect and networking.",
    strengths: "Intelligence, communication, adaptability, curiosity, versatility, networking skills",
    challenges: "Restlessness, inconsistency, scattered focus, nervousness, indecision",
    health: "Lungs, arms, shoulders, and nervous system need attention. Prone to respiratory issues and anxiety.",
  },
  Cancer: {
    overview: "Cancer Lagna gives a nurturing, intuitive, and emotionally sensitive personality. Moon as chart ruler makes you deeply empathetic, family-oriented, and psychic. Your moods fluctuate with the Moon's transit.",
    strengths: "Empathy, intuition, nurturing instincts, strong memory, family devotion",
    challenges: "Emotional volatility, over-sensitivity, clinging, moodiness, fear of change",
    health: "Stomach, chest, breasts, and digestion are sensitive. Emotional stress directly affects physical health.",
  },
  Leo: {
    overview: "Leo Lagna creates a charismatic, generous, and authority-seeking personality. The Sun as your chart ruler bestows natural dignity, leadership, and a desire for recognition. You shine in positions of visibility and authority.",
    strengths: "Leadership, generosity, confidence, loyalty, dignity, creative expression",
    challenges: "Pride, ego, need for validation, domineering tendencies, stubbornness",
    health: "Heart, spine, and back are key areas. Prone to heart conditions and back pain with age.",
  },
  Virgo: {
    overview: "Virgo Lagna produces an analytical, service-oriented, and detail-focused personality. Mercury as chart ruler grants exceptional problem-solving ability, precision, and skill in health or healing professions.",
    strengths: "Analytical mind, precision, service ethic, health consciousness, practical skills",
    challenges: "Over-criticism, perfectionism, worry, health anxiety, difficulty delegating",
    health: "Intestines, digestion, and nervous system are sensitive. Prone to digestive disorders and anxiety-linked ailments.",
  },
  Libra: {
    overview: "Libra Lagna bestows a diplomatic, aesthetic, and relationship-oriented personality. Venus as chart ruler gives charm, a sense of justice, and a love of harmony. You naturally seek balance and fairness in all dealings.",
    strengths: "Diplomacy, aesthetic sense, fairness, social grace, partnership ability",
    challenges: "Indecisiveness, people-pleasing, dependency in relationships, avoidance of conflict",
    health: "Kidneys, lower back, and skin are sensitive. Prone to kidney issues and hormonal imbalances.",
  },
  Scorpio: {
    overview: "Scorpio Lagna creates an intense, perceptive, and transformative personality. Mars (and Ketu) as chart rulers give depth, willpower, and a penetrating insight into hidden matters. You are drawn to mysteries and transformation.",
    strengths: "Depth, willpower, investigative ability, resilience, intense focus",
    challenges: "Jealousy, secretiveness, vindictiveness, intensity that can overwhelm others",
    health: "Reproductive organs, elimination system, and immune system need attention. Prone to emotional suppression affecting physical health.",
  },
  Sagittarius: {
    overview: "Sagittarius Lagna produces a philosophical, optimistic, and freedom-loving personality. Jupiter as chart ruler bestows wisdom, moral conviction, and a lifelong pursuit of knowledge and higher truth.",
    strengths: "Optimism, wisdom, philosophical outlook, generosity, love of adventure and learning",
    challenges: "Overconfidence, bluntness, commitment issues, over-preaching, restlessness",
    health: "Hips, thighs, and liver are sensitive. Prone to over-indulgence and liver conditions.",
  },
  Capricorn: {
    overview: "Capricorn Lagna creates a disciplined, ambitious, and structured personality. Saturn as chart ruler endows perseverance, practical wisdom, and the ability to achieve long-term goals through steady effort.",
    strengths: "Ambition, discipline, practicality, organisational skill, perseverance",
    challenges: "Coldness, excessive caution, workaholism, pessimism, difficulty expressing emotion",
    health: "Bones, joints, knees, and skin are sensitive. Prone to arthritis and chronic conditions with age.",
  },
  Aquarius: {
    overview: "Aquarius Lagna produces an independent, humanitarian, and unconventional personality. Saturn as chart ruler gives intellectual depth, progressive thinking, and a desire to serve collective causes.",
    strengths: "Originality, humanitarianism, intellect, independence, vision",
    challenges: "Emotional detachment, eccentricity, rigidity of opinion, aloofness",
    health: "Ankles, calves, circulatory system, and nervous system are sensitive.",
  },
  Pisces: {
    overview: "Pisces Lagna bestows a compassionate, intuitive, and spiritually inclined personality. Jupiter as chart ruler gives faith, empathy, and an otherworldly quality. You absorb the emotions of those around you easily.",
    strengths: "Compassion, intuition, creativity, spiritual depth, adaptability",
    challenges: "Over-idealism, escapism, lack of boundaries, victim mentality, vagueness",
    health: "Feet, lymphatic system, and immune system are sensitive. Prone to infections and substance sensitivity.",
  },
};

// ---------------------------------------------------------------------------
// Planet-in-house meanings
// ---------------------------------------------------------------------------
export const PLANET_IN_HOUSE: Record<string, Record<number, string>> = {
  Sun: {
    1:  "Sun in 1st house gives a strong self-identity, vitality, and natural authority. You radiate confidence and often take on leadership roles. Health is generally robust.",
    2:  "Sun in 2nd house supports financial gains through government or authoritative positions. Speech is commanding. Family values are important to your sense of self.",
    3:  "Sun in 3rd house gives courage, initiative, and success through self-effort. Communication is authoritative. Relationships with siblings may be competitive.",
    4:  "Sun in 4th house can create tension with maternal figures but gives success in real estate. Public reputation is tied to home and homeland.",
    5:  "Sun in 5th house is very auspicious — excellent for creativity, children, speculation, and romance. Gives strong intelligence and leadership in educational pursuits.",
    6:  "Sun in 6th house gives the ability to defeat enemies and overcome illness. Success in competitive fields, medicine, law, or government service.",
    7:  "Sun in 7th house makes you seek a partner with status and authority. Partnerships can be ego-driven. Business partnerships with government entities are favoured.",
    8:  "Sun in 8th house gives interest in the occult and research. Potential for inheritance. Health and vitality may fluctuate; longevity depends on other factors.",
    9:  "Sun in 9th house is highly auspicious — strong father figure, fortune, and spiritual inclinations. Government favour and higher education are supported.",
    10: "Sun in 10th house is one of the best placements for career. Gives authority, recognition, and success in public life or government. Strong professional reputation.",
    11: "Sun in 11th house brings gains from government, powerful friends, and large social networks. Elder siblings may be successful. Income grows steadily.",
    12: "Sun in 12th house indicates expenses related to government or hospital stays. Spiritual inclinations are strong. Foreign residence or service abroad is possible.",
  },
  Moon: {
    1:  "Moon in 1st house creates a nurturing, emotionally expressive personality. You are highly intuitive and attuned to others' feelings. Health and mood fluctuate with the lunar cycle.",
    2:  "Moon in 2nd house supports wealth through trade, public dealings, or mother's support. Emotional attachment to family wealth and possessions. Strong memory.",
    3:  "Moon in 3rd house makes communication emotionally rich. Excellent for writers, musicians, and communicators. Relationships with siblings are emotionally intense.",
    4:  "Moon in 4th house is the Moon's natural placement — very powerful for emotional contentment, strong mother bond, beautiful home, and property gains.",
    5:  "Moon in 5th house gives a romantic, creative, and child-loving nature. Highly intuitive intelligence. Speculation may have emotional swings. Strong bond with children.",
    6:  "Moon in 6th house can create emotional worry and health sensitivity, especially digestive. Excellent for service professions like nursing, care work.",
    7:  "Moon in 7th house attracts a sensitive, caring partner. You seek emotional fulfilment in relationships. Business with the public or women is supported.",
    8:  "Moon in 8th house creates emotional depth and psychic sensitivity. Interest in occult or healing. Emotional transformation is a recurring theme in life.",
    9:  "Moon in 9th house gives a devotional, philosophically inclined mind. Blessed by gurus and foreign travel. Strong bond with mother's religious traditions.",
    10: "Moon in 10th house brings fame and public recognition. Career linked to the masses — media, hospitality, politics, or public service. Reputation fluctuates.",
    11: "Moon in 11th house is excellent for gains — financial, social, and emotional. Large circle of friends, especially women. Desires are fulfilled over time.",
    12: "Moon in 12th house gives strong spiritual and dream life. May spend emotionally or have periods of solitude. Connection to foreign lands or spiritual retreat.",
  },
  Mars: {
    1:  "Mars in 1st house gives a bold, energetic, and courageous personality. You are competitive and direct. Tendency towards accidents or impulsiveness if not channelled.",
    2:  "Mars in 2nd house makes speech sharp, sometimes harsh. Financial gains through action and initiative. Possible family conflicts over money. Dental issues possible.",
    3:  "Mars in 3rd house is its natural placement — excellent for courage, athletic ability, and self-promotion. Siblings may be competitive or ambitious.",
    4:  "Mars in 4th house can cause domestic tensions and property disputes. Restlessness at home. However, gives real estate success if well-aspected.",
    5:  "Mars in 5th house creates passionate romantic relationships and drive in creative pursuits. Can indicate fewer children or challenges in romance if afflicted.",
    6:  "Mars in 6th house is a powerful placement — defeats enemies, overcomes illness, and excels in competitive environments. Excellent for sports, military, or medicine.",
    7:  "Mars in 7th house (Mangal Dosha) can create an intense, passionate, sometimes combative partnership. Energy needs to be shared through active pursuits together.",
    8:  "Mars in 8th house gives a penetrating mind, occult interest, and physical endurance. Potential for sudden events or surgeries. Research and inheritance indicated.",
    9:  "Mars in 9th house gives religious zeal and desire to fight for one's beliefs. Father may be a strong figure. Long journeys and adventures abroad.",
    10: "Mars in 10th house gives strong professional drive and leadership in competitive fields — military, sports, engineering, surgery. Career involves action and initiative.",
    11: "Mars in 11th house gives excellent income-generating ability and competitive success in achieving goals. Older siblings may be influential or aggressive.",
    12: "Mars in 12th house indicates expenditure through conflicts or hospitalisation. Potential for foreign residence. Hidden aggression; spiritual warrior path possible.",
  },
  Mercury: {
    1:  "Mercury in 1st house gives an intelligent, witty, and communicative personality. Quick-thinking and youthful appearance throughout life. Excellent for writers and speakers.",
    2:  "Mercury in 2nd house gives eloquent speech, financial intelligence, and skill with words and numbers. Multiple income streams through communication or trade.",
    3:  "Mercury in 3rd house is its natural placement — superb communication, writing, and business skills. Successful short journeys and negotiation ability.",
    4:  "Mercury in 4th house gives an intellectually stimulating home environment. Strong bond with mother. Real estate or educational business from home is supported.",
    5:  "Mercury in 5th house is excellent for intelligence, education, and creative writing. Skill in speculation through analytical thinking. Witty, playful parenting style.",
    6:  "Mercury in 6th house gives skill in healthcare, analysis, and problem-solving. Excellent for doctors, lawyers, accountants, and analysts. Health is generally good.",
    7:  "Mercury in 7th house attracts an intellectually stimulating, communicative partner. Business partnerships in communication or trade fields are highly favoured.",
    8:  "Mercury in 8th house gives a sharp, investigative mind. Interest in research, occult studies, or psychology. Income may come from hidden or research-based sources.",
    9:  "Mercury in 9th house gives a philosophical, learned mind. Success in publishing, teaching, and higher education. Long journeys for knowledge.",
    10: "Mercury in 10th house supports career in communication, business, writing, media, or technology. Quick career rise through networking and intellectual skill.",
    11: "Mercury in 11th house gives excellent gains through intellectual work, trade, and networking. Many friendships in intellectual circles. Income from communication.",
    12: "Mercury in 12th house gives a reflective, introspective mind. Talent for spiritual writing or research in private. Hidden business dealings possible.",
  },
  Jupiter: {
    1:  "Jupiter in 1st house is one of the most auspicious placements — gives wisdom, optimism, good health, and natural abundance. You attract good fortune and expand the lives of those around you.",
    2:  "Jupiter in 2nd house gives abundant wealth, eloquent speech, and a large, supportive family. Financial prosperity grows steadily throughout life.",
    3:  "Jupiter in 3rd house gives intellectual courage and success through communication. Writing, teaching, and publishing are highlighted. Generous with siblings.",
    4:  "Jupiter in 4th house bestows a beautiful home, vehicles, happiness from mother, and emotional contentment. Property gains are well-indicated.",
    5:  "Jupiter in 5th house is highly auspicious for children, creativity, speculation, and romance. Strong intelligence and success in education. Blessed with wise children.",
    6:  "Jupiter in 6th house gives strength in overcoming enemies and debt. Success in service professions. However, it can sometimes create indulgence-related health issues.",
    7:  "Jupiter in 7th house is excellent for marriage — attracts a wise, generous, and prosperous partner. Business partnerships with foreigners or learned people are supported.",
    8:  "Jupiter in 8th house protects longevity and gives interest in esoteric knowledge. Can indicate large inheritance. Philosophical approach to death and transformation.",
    9:  "Jupiter in 9th house is its strongest placement — maximum fortune, wisdom, spiritual blessings, and strong father figure. Highly auspicious for all life matters.",
    10: "Jupiter in 10th house gives a prestigious, respected career. Success in teaching, law, banking, or advisory roles. Recognised for wisdom and integrity.",
    11: "Jupiter in 11th house brings consistent financial gains, influential friends, and fulfilment of desires. One of the best placements for long-term wealth.",
    12: "Jupiter in 12th house gives spiritual liberation, foreign travel for spiritual purposes, and generosity that can drain finances. Strong connection to ashrams or institutions.",
  },
  Venus: {
    1:  "Venus in 1st house bestows physical beauty, charm, and a pleasant personality. You attract love and luxury naturally. Strong artistic sense and enjoyment of life's pleasures.",
    2:  "Venus in 2nd house gives wealth, beautiful speech, and enjoyment of fine food and luxury. Financial gains through art, beauty, or the hospitality industry.",
    3:  "Venus in 3rd house gives a charming communicative style and artistic talent. Travel for pleasure is common. Relationships with siblings are harmonious.",
    4:  "Venus in 4th house gives a beautiful home, vehicles, and happiness from mother. Emotional contentment through comfort and beauty. Property gains are indicated.",
    5:  "Venus in 5th house is excellent for romance, creative arts, and children. Strong romantic nature and appreciation for beauty. Speculative gains through art.",
    6:  "Venus in 6th house can create challenges in relationships or health from overindulgence. Skill in healing arts and service to others through beauty or hospitality.",
    7:  "Venus in 7th house is its natural placement — extremely auspicious for marriage, bringing a beautiful, loving, and harmonious partner. Business in creative fields succeeds.",
    8:  "Venus in 8th house gives access to partner's resources and interest in tantric or esoteric love. Can indicate complex relationships requiring deep transformation.",
    9:  "Venus in 9th house gives a fortunate, beautiful, and devotional life. Blessed through foreign travel, art, and spiritual pursuits. Harmonious relationship with father.",
    10: "Venus in 10th house gives success in creative fields — arts, fashion, entertainment, beauty. Career brings recognition and is deeply satisfying.",
    11: "Venus in 11th house brings financial gains through creative pursuits and a large circle of friends. Desires for beauty and luxury are fulfilled over time.",
    12: "Venus in 12th house gives enjoyment of private pleasures and possible foreign romance. Generous spending habits. Strong spiritual and artistic inner life.",
  },
  Saturn: {
    1:  "Saturn in 1st house gives a serious, disciplined, and reserved personality. Life has early hardships that build incredible character. Longevity is often indicated. You achieve through sustained effort.",
    2:  "Saturn in 2nd house creates financial caution and slow but steady wealth accumulation. Speech can be serious or harsh. Family responsibilities weigh heavily.",
    3:  "Saturn in 3rd house gives disciplined communication and success through persistent effort. Long journeys for work. Siblings may be a source of responsibility.",
    4:  "Saturn in 4th house can create distance from mother and a spartan or shifting home environment. However, gives lasting property gains after mid-life.",
    5:  "Saturn in 5th house creates delays in romance and children but eventual success through patience. Serious intellectual approach. Speculative losses if rushed.",
    6:  "Saturn in 6th house is very powerful for overcoming enemies, debt, and illness through discipline. Success in law, medicine, engineering, or public service.",
    7:  "Saturn in 7th house may delay marriage but creates a stable, long-lasting partnership. The partner may be serious, older, or from a different background.",
    8:  "Saturn in 8th house gives research ability, interest in occult, and strong longevity when well-placed. Delays in inheritance. Challenges early in life build resilience.",
    9:  "Saturn in 9th house creates a disciplined spiritual path and challenges with traditional religion or father. Long pilgrimages and philosophical perseverance.",
    10: "Saturn in 10th house is one of the best placements for career — slow and steady rise to great authority and lasting professional success. Government and engineering excel.",
    11: "Saturn in 11th house gives steady financial gains through hard work and older, serious friendships. Gains come late but are durable. Elder sibling may be a karmic figure.",
    12: "Saturn in 12th house gives spiritual discipline and success in foreign lands. Can indicate periods of isolation, retreat, or service in institutions.",
  },
  Rahu: {
    1:  "Rahu in 1st house gives an unconventional, ambitious, and intensely driven personality. You may blur identity with obsession. Foreign influences shape your character strongly.",
    2:  "Rahu in 2nd house creates an obsession with wealth and material possessions. Unconventional income sources. Speech may be deceptive or manipulative if unaware.",
    3:  "Rahu in 3rd house gives boldness in communication and success through unconventional media or technology. Courageous, sometimes reckless initiative.",
    4:  "Rahu in 4th house can disrupt domestic harmony with foreign or unconventional home environments. Property dealings may be complex. Inner restlessness persists.",
    5:  "Rahu in 5th house creates unconventional romance, speculative risks, and unusual or complicated matters regarding children. Creative expression can be highly original.",
    6:  "Rahu in 6th house is powerful for overcoming enemies and succeeding in competitive environments through unconventional means. Health issues can be mysterious.",
    7:  "Rahu in 7th house attracts an unusual or foreign partner. Business with foreign entities can succeed. Relationships may involve deception or unconventional dynamics.",
    8:  "Rahu in 8th house gives deep interest in occult, transformation, and research. Sudden gains or losses are possible. Hidden fears must be confronted for growth.",
    9:  "Rahu in 9th house creates an unconventional spiritual path and challenges with traditional religious structures. Father may be foreign or unconventional.",
    10: "Rahu in 10th house gives strong worldly ambition and career success in technology, media, or foreign companies. Career trajectory may be unusual or fast-rising.",
    11: "Rahu in 11th house brings sudden, large financial gains and an extensive network. Gains through technology or foreign associates. Desires are intense and frequent.",
    12: "Rahu in 12th house gives access to foreign lands, spiritual seeking, and hidden pleasures. Expenses can be sudden and large. Strong interest in foreign cultures.",
  },
  Ketu: {
    1:  "Ketu in 1st house creates a spiritually inclined, somewhat detached personality. You may struggle with self-identity but have deep past-life wisdom. Prone to spiritual seeking.",
    2:  "Ketu in 2nd house creates detachment from family wealth and material possessions. Speech may be blunt or disconnected. Past-life skills with finances emerge unexpectedly.",
    3:  "Ketu in 3rd house gives sharp intuition and occult communication abilities. Detachment from siblings. Past-life skills in writing or communication emerge naturally.",
    4:  "Ketu in 4th house creates emotional distance from mother and home. You may find it hard to settle. Deep past-life connection to land and property themes.",
    5:  "Ketu in 5th house gives spiritual intelligence and past-life creative gifts. Detachment in romance. Children may be spiritually inclined or fewer in number.",
    6:  "Ketu in 6th house gives strong ability to defeat enemies and overcome illness, often through unconventional or spiritual means. Prone to mysterious ailments.",
    7:  "Ketu in 7th house creates detachment in partnerships. You may feel unfulfilled in relationships until spiritual dimensions are integrated. Past-life partner karma.",
    8:  "Ketu in 8th house gives strong occult abilities and natural intuition about hidden matters. Interest in moksha, liberation, and past-life research.",
    9:  "Ketu in 9th house creates a non-traditional spiritual path. Detachment from gurus and traditional religion, yet deep inner spiritual wisdom from past lives.",
    10: "Ketu in 10th house creates career confusion early in life but eventually leads to a highly spiritual or unconventional career path. Past-life professional wisdom.",
    11: "Ketu in 11th house creates detachment from material gains and friendships. Income may come unexpectedly. Past-life network connections surface suddenly.",
    12: "Ketu in 12th house is the most natural placement for Ketu — gives deep spiritual liberation, moksha orientation, and strong past-life connection to ashrams.",
  },
};

// ---------------------------------------------------------------------------
// Dignity interpretations
// ---------------------------------------------------------------------------
export const DIGNITY_INTERPRETATIONS: Record<string, Record<string, string>> = {
  exalted: {
    Sun:     "Exalted Sun (Aries) — maximum strength. Authority, confidence, and career success are powerfully supported.",
    Moon:    "Exalted Moon (Taurus) — emotional stability, mental peace, and prosperity are strongly indicated.",
    Mars:    "Exalted Mars (Capricorn) — disciplined courage and remarkable ability to achieve long-term goals through sustained action.",
    Mercury: "Exalted Mercury (Virgo) — exceptional analytical ability, communication skills, and professional precision.",
    Jupiter: "Exalted Jupiter (Cancer) — maximum wisdom and abundance. Wealth, children, and spiritual blessings are strongly favoured.",
    Venus:   "Exalted Venus (Pisces) — profound capacity for love, artistic genius, and spiritual beauty.",
    Saturn:  "Exalted Saturn (Libra) — disciplined justice and the ability to create lasting structures through patient effort.",
    Rahu:    "Rahu in Taurus (exalted per Vedic tradition) — strong material desires fulfilled through persistence.",
    Ketu:    "Ketu in Scorpio (exalted per Vedic tradition) — deep spiritual insight and natural occult abilities.",
  },
  debilitated: {
    Sun:     "Debilitated Sun (Libra) — ego and confidence may be compromised. Neechabhanga Raja Yoga (cancellation of debility) can transform this into strength.",
    Moon:    "Debilitated Moon (Scorpio) — emotional intensity and instability. Emotional discipline brings powerful transformation.",
    Mars:    "Debilitated Mars (Cancer) — energy and assertiveness may be misdirected. Channelling through nurturing action brings results.",
    Mercury: "Debilitated Mercury (Pisces) — analytical precision is reduced but intuitive intelligence and spiritual insight may compensate.",
    Jupiter: "Debilitated Jupiter (Capricorn) — wisdom and optimism may be blocked by materialism or skepticism. Perseverance unlocks growth.",
    Venus:   "Debilitated Venus (Virgo) — relationships may feel overly analytical or critical. Practical love deepens with maturity.",
    Saturn:  "Debilitated Saturn (Aries) — discipline and patience may be challenged by impulsiveness. Mastering patience brings karmic rewards.",
    Rahu:    "Rahu in Scorpio (debilitated) — obsessive tendencies need conscious management. Transformation through facing hidden fears.",
    Ketu:    "Ketu in Taurus (debilitated) — attachment to material security conflicts with spiritual detachment.",
  },
  moolatrikona: {
    Sun:     "Sun in Moolatrikona (Leo) — natural leadership and creative self-expression are strongly supported.",
    Moon:    "Moon in Moolatrikona (Taurus) — emotional contentment and prosperity through practical nurturing.",
    Mars:    "Mars in Moolatrikona (Aries) — powerful drive, initiative, and physical strength are at their most natural expression.",
    Mercury: "Mercury in Moolatrikona (Virgo) — precision, analytical genius, and communication skills are fully expressed.",
    Jupiter: "Jupiter in Moolatrikona (Sagittarius) — wisdom, optimism, and spiritual teaching abilities are strongly manifest.",
    Venus:   "Venus in Moolatrikona (Libra) — relationship harmony, aesthetic vision, and diplomacy flow naturally.",
    Saturn:  "Saturn in Moolatrikona (Aquarius) — humanitarian discipline and structured service to society.",
    Rahu:    "Rahu in Moolatrikona — ambitions expressed with unusual strength.",
    Ketu:    "Ketu in Moolatrikona — spiritual insights flow naturally and powerfully.",
  },
  own: {
    Sun:     "Sun in own sign (Leo) — confident, creative, and naturally authoritative. Career and recognition flow easily.",
    Moon:    "Moon in own sign (Cancer) — deeply nurturing, intuitive, and emotionally secure in family bonds.",
    Mars:    "Mars in own sign (Aries/Scorpio) — strong, decisive, and courageous. Physical vitality is excellent.",
    Mercury: "Mercury in own sign (Gemini/Virgo) — highly intelligent and communicative. Business and intellectual pursuits excel.",
    Jupiter: "Jupiter in own sign (Sagittarius/Pisces) — wisdom and abundance flow naturally. Spiritual and financial growth.",
    Venus:   "Venus in own sign (Taurus/Libra) — love, beauty, and harmony are expressed naturally and powerfully.",
    Saturn:  "Saturn in own sign (Capricorn/Aquarius) — discipline and perseverance bring lasting achievements.",
    Rahu:    "Rahu in own sign — worldly ambitions expressed with confidence.",
    Ketu:    "Ketu in own sign — spiritual gifts expressed naturally.",
  },
};

// ---------------------------------------------------------------------------
// House lord placement meanings (lord of X house in Y house)
// ---------------------------------------------------------------------------
export const HOUSE_LORD_MEANINGS: Record<number, { signifies: string; inHouse: Record<number, string> }> = {
  1: {
    signifies: "Self, body, personality, vitality, overall life direction",
    inHouse: {
      1: "Lagna lord in 1st — strong constitution, self-reliance, and a prominent personality. Life force is potent.",
      2: "Lagna lord in 2nd — wealth accumulation is linked to personal efforts. Family support is strong.",
      3: "Lagna lord in 3rd — self-made success through courage and initiative. Communication is a key strength.",
      4: "Lagna lord in 4th — happiness and property come through personal effort. Strong bond with mother and homeland.",
      5: "Lagna lord in 5th — intelligence, creativity, and speculation are key strengths. Fortunate with children.",
      6: "Lagna lord in 6th — personal health and vitality require conscious maintenance. Success through service.",
      7: "Lagna lord in 7th — partnerships are central to your identity and success. Marriage is a defining experience.",
      8: "Lagna lord in 8th — life involves significant transformation. Research, occult, or inheritance themes are prominent.",
      9: "Lagna lord in 9th — highly fortunate. Life is shaped by dharma, higher knowledge, and philosophy.",
      10: "Lagna lord in 10th — career success and public recognition are strongly indicated. A natural achiever.",
      11: "Lagna lord in 11th — gains come easily. Social connections and income are central to personal fulfilment.",
      12: "Lagna lord in 12th — spiritual liberation is the life theme. Periods of foreign residence or solitude.",
    },
  },
  2: {
    signifies: "Wealth, speech, family, food, accumulated resources",
    inHouse: {
      1: "2nd lord in 1st — wealth comes through personal personality and self-expression. Speech defines you.",
      2: "2nd lord in 2nd — strong financial acumen. Family wealth is preserved and grown naturally.",
      3: "2nd lord in 3rd — income through communication, media, or trade. Writing and networking build wealth.",
      4: "2nd lord in 4th — family wealth tied to property. Inherits from mother's side. Comfortable home life.",
      5: "2nd lord in 5th — wealth through speculation, creative work, or children's success.",
      6: "2nd lord in 6th — financial challenges through debt or health expenses. Income from service or litigation.",
      7: "2nd lord in 7th — wealth through partnerships, spouse, or business dealings.",
      8: "2nd lord in 8th — possible inheritance. Wealth may come through unexpected or hidden sources.",
      9: "2nd lord in 9th — fortune through father, pilgrimage, or higher education. Strong financial dharma.",
      10: "2nd lord in 10th — career directly builds wealth. Income grows with professional recognition.",
      11: "2nd lord in 11th — excellent for financial gains. Income streams multiply over time.",
      12: "2nd lord in 12th — expenses outpace savings. Financial losses through foreign dealings or poor management.",
    },
  },
  5: {
    signifies: "Children, romance, creativity, intelligence, speculation, past life merit",
    inHouse: {
      1: "5th lord in 1st — creative intelligence is central to your personality. Romance and children bring joy.",
      2: "5th lord in 2nd — speculative gains can build family wealth. Children are a source of financial support.",
      4: "5th lord in 4th — happiness through children and creative home environment.",
      5: "5th lord in 5th — strong natural intelligence and creativity. Highly favourable for children and romance.",
      7: "5th lord in 7th — romance leads to marriage. Partner is creative, intelligent, and brings joy.",
      9: "5th lord in 9th — past-life merit translates to present fortune. Children are spiritually inclined.",
      10: "5th lord in 10th — creative career brings recognition. Success in entertainment, education, or politics.",
      11: "5th lord in 11th — speculative gains are strongly supported. Children fulfil your desires.",
    },
  },
  7: {
    signifies: "Marriage, partnerships, open enemies, business dealings, foreign travel",
    inHouse: {
      1: "7th lord in 1st — your identity is deeply intertwined with partnerships. Marriage happens early or is prominent.",
      2: "7th lord in 2nd — spouse contributes to family wealth. Business partnerships bring financial gains.",
      4: "7th lord in 4th — settled domestic life after marriage. Spouse may bring property.",
      5: "7th lord in 5th — romantic relationship leads to love marriage. Creative partnerships thrive.",
      7: "7th lord in 7th — strong, successful partnerships. Marriage is a core life theme with positive results.",
      9: "7th lord in 9th — fortunate marriage. Spouse may be from a different background or connected to wisdom.",
      10: "7th lord in 10th — career through partnerships. Business dealings define professional success.",
      11: "7th lord in 11th — spouse is a source of gains. Business partnerships generate income.",
    },
  },
  10: {
    signifies: "Career, reputation, status, authority, public life, father",
    inHouse: {
      1: "10th lord in 1st — career success through personal initiative and personality. Self-employment is favoured.",
      2: "10th lord in 2nd — career in banking, food, speech, or family business. Income grows through professional status.",
      3: "10th lord in 3rd — career in communication, media, writing, or sales. Self-made professional success.",
      5: "10th lord in 5th — career in education, entertainment, or creative fields. Children may follow your career path.",
      6: "10th lord in 6th — career in medicine, law, service, or competitive fields.",
      7: "10th lord in 7th — career through partnerships and business dealings. Foreign trade or diplomatic roles.",
      9: "10th lord in 9th — highly auspicious. Career in law, teaching, religion, or international work. Dharmic profession.",
      10: "10th lord in 10th — very powerful for career. Consistent professional growth and public recognition.",
      11: "10th lord in 11th — career brings large financial gains. Income rises steadily with status.",
    },
  },
};

// ---------------------------------------------------------------------------
// Life area configuration (primary/secondary houses + key planets)
// ---------------------------------------------------------------------------
export const LIFE_AREA_CONFIG: Record<string, {
  icon: string;
  primaryHouse: number;
  secondaryHouse: number;
  keyPlanets: string[];
  primaryHouseLabel: string;
  secondaryHouseLabel: string;
}> = {
  "Love & Marriage": {
    icon: "💕",
    primaryHouse: 7,
    secondaryHouse: 5,
    keyPlanets: ["Venus", "Moon", "Jupiter"],
    primaryHouseLabel: "7th house (marriage & partnerships)",
    secondaryHouseLabel: "5th house (romance & attraction)",
  },
  "Career & Status": {
    icon: "💼",
    primaryHouse: 10,
    secondaryHouse: 6,
    keyPlanets: ["Sun", "Saturn", "Mercury"],
    primaryHouseLabel: "10th house (career & public life)",
    secondaryHouseLabel: "6th house (work & service)",
  },
  "Wealth & Finances": {
    icon: "💰",
    primaryHouse: 2,
    secondaryHouse: 11,
    keyPlanets: ["Jupiter", "Venus", "Mercury"],
    primaryHouseLabel: "2nd house (accumulated wealth)",
    secondaryHouseLabel: "11th house (income & gains)",
  },
  "Health & Vitality": {
    icon: "🏥",
    primaryHouse: 6,
    secondaryHouse: 1,
    keyPlanets: ["Sun", "Moon", "Mars"],
    primaryHouseLabel: "6th house (disease & healing)",
    secondaryHouseLabel: "1st house (body & constitution)",
  },
  "Family & Home": {
    icon: "🏡",
    primaryHouse: 4,
    secondaryHouse: 9,
    keyPlanets: ["Moon", "Jupiter", "Saturn"],
    primaryHouseLabel: "4th house (mother, home & property)",
    secondaryHouseLabel: "9th house (father, luck & dharma)",
  },
};

// ---------------------------------------------------------------------------
// Sign on primary house — what it means for each life area
// ---------------------------------------------------------------------------
export const SIGN_ON_HOUSE_FOR_AREA: Record<string, Record<string, string>> = {
  "Love & Marriage": {
    Aries:       "Aries on the 7th brings passionate, independent partners. You're attracted to energetic, action-oriented people but may face combative relationship dynamics. Mars rules your partnerships.",
    Taurus:      "Taurus on the 7th gives a partner who is stable, sensual, and loyal. Venus-ruled partnerships promise lasting comfort, material security, and deep physical connection.",
    Gemini:      "Gemini on the 7th draws intellectually stimulating, communicative partners. You need variety in relationships. Mercury rules your partnerships; contracts and trade ties also benefit.",
    Cancer:      "Cancer on the 7th brings nurturing, emotionally deep partners. You may meet your spouse through family circles. Moon rules partnerships — emotional security is essential in marriage.",
    Leo:         "Leo on the 7th attracts confident, generous, and sometimes dominant partners. You need a partner who shines. Sun rules your partnerships; royal or creative connections are indicated.",
    Virgo:       "Virgo on the 7th draws practical, health-conscious, and analytical partners. Mercury governs your partnerships. A spouse who serves and improves your life is strongly indicated.",
    Libra:       "Libra on the 7th — Venus directly rules your marriage house, an auspicious sign. Partners are charming, balanced, and aesthetically refined. Marriage is a central life theme.",
    Scorpio:     "Scorpio on the 7th brings intense, transformative, and deeply loyal partners. Mars rules your partnerships. Relationships involve deep emotional bonding; Mangal Dosha considerations apply.",
    Sagittarius: "Sagittarius on the 7th attracts philosophical, freedom-loving, and optimistic partners. Jupiter governs your marriages. Foreign or educated spouses are common; travel through partnerships.",
    Capricorn:   "Capricorn on the 7th brings mature, responsible, and career-focused partners. Saturn rules your marriages — delay is possible but the union, when it comes, is durable and karmic.",
    Aquarius:    "Aquarius on the 7th attracts unconventional, intellectual, and independent partners. Saturn rules partnerships. You may meet a partner through social causes or technology fields.",
    Pisces:      "Pisces on the 7th brings spiritual, compassionate, and imaginative partners. Jupiter governs your marriages. A soulful, other-worldly connection is indicated; foreign partnerships are possible.",
  },
  "Career & Status": {
    Aries:       "Aries on the 10th: Your career thrives on initiative, leadership, and bold action. You are born to lead, compete, and pioneer. Mars-ruled career benefits from independent ventures, sports, military, or engineering.",
    Taurus:      "Taurus on the 10th: Career in finance, beauty, food, music, or real estate is strongly indicated. Venus-ruled professional life brings steady, comfortable growth and appreciation for quality.",
    Gemini:      "Gemini on the 10th: Communication, media, writing, trade, and intellectual work define your career path. Mercury-ruled career excels in networking, technology, journalism, and business.",
    Cancer:      "Cancer on the 10th: Career connected to the public, hospitality, food, or nurturing professions. Moon governs your 10th — reputation fluctuates but builds through emotional connection with the masses.",
    Leo:         "Leo on the 10th: A natural leader and public figure. The Sun rules your career — you thrive in government, politics, entertainment, or any field offering authority and recognition.",
    Virgo:       "Virgo on the 10th: Career in health, medicine, analysis, accounting, or service industries. Mercury-ruled career rewards precision, systematic work, and dedication to craft.",
    Libra:       "Libra on the 10th: Career in law, arts, diplomacy, luxury, or partnerships. Venus governs your professional life — charm and fairness open doors; public reputation is harmonious.",
    Scorpio:     "Scorpio on the 10th: Careers in research, investigation, medicine, psychology, or transformation fields. Mars-ruled career operates in depth and secrecy; positions of hidden authority.",
    Sagittarius: "Sagittarius on the 10th: Career in education, law, religion, international business, or philosophy. Jupiter-ruled career brings wisdom, expansion, and ethical recognition in public life.",
    Capricorn:   "Capricorn on the 10th: Saturn directly governs your career house. Ambitious, structured, long-term career growth. Government, engineering, management, and disciplined professions excel.",
    Aquarius:    "Aquarius on the 10th: Career in technology, social reform, humanitarian work, or innovation. Saturn-ruled professional life benefits from unconventional thinking and long-term systemic impact.",
    Pisces:      "Pisces on the 10th: Career in healing, arts, spirituality, film, or charitable work. Jupiter governs your professional life — a dharmic, compassionate career path brings fulfilment.",
  },
  "Wealth & Finances": {
    Aries:       "Aries on the 2nd: Wealth is earned through boldness and initiative. Mars rules your wealth house — income comes through action, competition, or enterprise but may be spent impulsively.",
    Taurus:      "Taurus on the 2nd: Venus rules your wealth house — one of the most auspicious placements for financial prosperity, luxury, and accumulation of tangible assets. Family wealth is well-preserved.",
    Gemini:      "Gemini on the 2nd: Multiple income streams through communication, trade, and intellectual work. Mercury-ruled wealth house supports business, writing, and commerce as primary earning vehicles.",
    Cancer:      "Cancer on the 2nd: Wealth through real estate, public dealings, and family assets. Moon rules your wealth house — finances fluctuate emotionally but grow through nurturing investments.",
    Leo:         "Leo on the 2nd: Wealth through creative endeavours, government, or positions of authority. Sun rules your wealth house — status and self-expression are tied to financial identity.",
    Virgo:       "Virgo on the 2nd: Careful, analytical approach to money. Mercury-ruled wealth accumulates steadily through precision, service, and systematic saving. Health-related income is favoured.",
    Libra:       "Libra on the 2nd: Wealth through partnerships, luxury goods, arts, or trade. Venus-ruled finances bring beauty and refinement in possessions; balanced financial judgement.",
    Scorpio:     "Scorpio on the 2nd: Wealth through inheritance, joint resources, and research. Mars governs your 2nd — sudden financial gains and losses; investment in hidden or transformation-based industries.",
    Sagittarius: "Sagittarius on the 2nd: Jupiter expands your wealth house — excellent for financial growth. Income through philosophy, higher education, international business, or publishing.",
    Capricorn:   "Capricorn on the 2nd: Saturn disciplines your wealth house — slow but steady accumulation. Wealth comes through sustained effort, property, government contracts, and strategic investment.",
    Aquarius:    "Aquarius on the 2nd: Income through technology, innovation, and social networks. Saturn-ruled wealth house rewards unconventional earning strategies and long-term financial planning.",
    Pisces:      "Pisces on the 2nd: Jupiter rules your wealth house — potential for spiritual or creative wealth. Financial boundaries may be unclear; generosity can drain savings unless disciplined.",
  },
  "Health & Vitality": {
    Aries:       "Aries on the 6th: Mars rules your health house — strong physical constitution and recovery ability. Prone to inflammation, fevers, head injuries, and surgeries. Competitive sports help channel Mars energy.",
    Taurus:      "Taurus on the 6th: Venus rules your health house — generally good health but prone to throat, thyroid, and metabolic issues. Overindulgence in food or comfort is the main health risk.",
    Gemini:      "Gemini on the 6th: Mercury rules your health house — prone to respiratory conditions, nervous disorders, and skin ailments. Mental stress directly manifests as physical symptoms.",
    Cancer:      "Cancer on the 6th: Moon rules your health house — digestive sensitivity and emotional health are key. Stress and emotional fluctuations directly affect the stomach and immune system.",
    Leo:         "Leo on the 6th: Sun rules your health house — strong immunity when Sun is well-placed. Prone to heart strain, back problems, and vitality depletion from overexertion.",
    Virgo:       "Virgo on the 6th — Mercury rules this house directly. Excellent healing ability and health awareness. Prone to digestive over-sensitivity and health anxiety.",
    Libra:       "Libra on the 6th: Venus governs your health house. Kidney, lower back, and hormonal balance need attention. Harmonious relationships and beauty in surroundings support wellbeing.",
    Scorpio:     "Scorpio on the 6th: Mars and Ketu rule your health house — powerful immune system and recovery. Prone to hidden ailments, reproductive health issues, and psychosomatic disorders.",
    Sagittarius: "Sagittarius on the 6th: Jupiter governs your health house — generally good health but prone to liver issues, weight gain, and overconfidence about health. Moderation is the key.",
    Capricorn:   "Capricorn on the 6th: Saturn rules your health house — chronic ailments and slow recovery are possible. Bones, joints, and skin need care. Disciplined health routines bring lasting benefit.",
    Aquarius:    "Aquarius on the 6th: Saturn rules your health house — prone to circulatory issues, nerve disorders, and unusual ailments. Alternative healing methods may be especially effective.",
    Pisces:      "Pisces on the 6th: Jupiter rules your health house. Prone to mysterious ailments, infections, and foot-related issues. Spiritual practices and water therapies support overall health.",
  },
  "Family & Home": {
    Aries:       "Aries on the 4th: Mars rules your home and family house. Dynamic, active home environment. Possible conflicts within family requiring boundaries. Property dealings involve courage and initiative.",
    Taurus:      "Taurus on the 4th: Venus rules your 4th house — beautiful, comfortable, and stable home environment. Strong bond with mother. Property and vehicles accumulate naturally. Family brings material security.",
    Gemini:      "Gemini on the 4th: Mercury rules your home — intellectually stimulating household. Multiple residences or frequent relocations. Mother is communicative and youthful. Library or study is central to home.",
    Cancer:      "Cancer on the 4th — Moon rules this house directly. Deep emotional bonds with mother and family. Strong connection to homeland. Home is a sanctuary; property near water is favourable.",
    Leo:         "Leo on the 4th: Sun rules your family house — proud family heritage and a home that reflects status. Father is a strong figure. Property in prestigious locations. Domestic authority is important.",
    Virgo:       "Virgo on the 4th: Mercury governs your home — orderly, health-conscious household. Mother is practical and detail-oriented. Possible health-related home modifications. Precise domestic management.",
    Libra:       "Libra on the 4th: Venus rules your home — beautiful, harmonious, and aesthetically refined domestic environment. Mother is charming. Family gatherings are pleasant. Property in beautiful locations.",
    Scorpio:     "Scorpio on the 4th: Mars governs your family house — intense family dynamics and potential for hidden conflicts. Deeply loyal family bonds. Property may involve legal complexities. Ancestral karma is active.",
    Sagittarius: "Sagittarius on the 4th: Jupiter governs your home — expansive, optimistic, and philosophically enriched family environment. Mother is wise and generous. Large property or overseas family connections.",
    Capricorn:   "Capricorn on the 4th: Saturn rules your family house — structured household with high expectations. Possible emotional distance from mother. Property gains after sustained effort and mid-life.",
    Aquarius:    "Aquarius on the 4th: Saturn governs your home — unconventional household and progressive family values. Mother may be independent or intellectually ahead of her time. Technology enriches the home.",
    Pisces:      "Pisces on the 4th: Jupiter rules your home — spiritual, compassionate, and peaceful domestic environment. Mother is devotional and empathetic. Home near water or with a meditative atmosphere.",
  },
};

// ---------------------------------------------------------------------------
// House lord placement — area-specific meaning
// ---------------------------------------------------------------------------
export const HOUSE_LORD_IN_HOUSE_FOR_AREA: Record<string, Record<number, string>> = {
  "Love & Marriage": {
    1:  "7th lord in 1st: You are strongly oriented towards partnership — your identity is deeply tied to relationships. Early marriage is indicated; your partner shapes who you are.",
    2:  "7th lord in 2nd: Spouse contributes significantly to family wealth and resources. Marriage into a wealthy family is possible; financial partnership is a cornerstone of the relationship.",
    3:  "7th lord in 3rd: You may meet your partner through communication, travel, or siblings' connections. Short journeys bring romantic encounters. A communicative, courageous partner.",
    4:  "7th lord in 4th: Domestic happiness is emphasised. Spouse becomes part of your home and family circle. You may settle in your partner's hometown. A homely, property-oriented partner.",
    5:  "7th lord in 5th: Love marriage is strongly indicated — romance naturally leads to commitment. A creative, intelligent, or playful partner. Children bring the couple closer together.",
    6:  "7th lord in 6th: Partnerships may involve service, health, or conflict. Possible delays or challenges in finding a compatible partner. Marriage requires conscious effort and service-oriented mindset.",
    7:  "7th lord in 7th: Very auspicious for marriage — a devoted, high-quality partner is indicated. Partnerships in business and love both prosper. Multiple significant relationships possible.",
    8:  "7th lord in 8th: Marriage brings transformation, hidden resources, and deep bonding. Possible inheritance through spouse. Relationship challenges deepen both partners profoundly.",
    9:  "7th lord in 9th: Very fortunate marriage — spouse may be from a different culture, background, or country. A wise, philosophical, or spiritually inclined partner. Marriage brings great fortune.",
    10: "7th lord in 10th: You may meet your partner through career or professional circles. Spouse is career-oriented and successful. Business partnerships with romantic undercurrents.",
    11: "7th lord in 11th: Spouse brings financial gains and social connections. You may meet through friends or group activities. Marriage fulfils long-held desires and expands your social network.",
    12: "7th lord in 12th: Partner may be from a foreign land or a spiritual background. Private, intimate relationship that may involve sacrifice. Foreign residence after marriage is possible.",
  },
  "Career & Status": {
    1:  "10th lord in 1st: Career is strongly tied to personal identity — self-employment or individual recognition is the path. Your personality is your profession.",
    2:  "10th lord in 2nd: Career directly builds family wealth and financial stability. Income from professional status; career in banking, food, speech, or family business.",
    3:  "10th lord in 3rd: Self-made career through communication, media, or business. Frequent work-related travel. Siblings may influence or assist in professional life.",
    4:  "10th lord in 4th: Career linked to real estate, agriculture, education, or working from home. Professional success brings domestic happiness; career rooted in homeland.",
    5:  "10th lord in 5th: Career in creative arts, education, entertainment, speculation, or with children. Professional success through intelligence and creative self-expression.",
    6:  "10th lord in 6th: Career in medicine, law, competitive fields, or service industries. Professional success through overcoming obstacles; work involves problem-solving.",
    7:  "10th lord in 7th: Career through partnerships, business dealings, or foreign connections. Spouse may be a professional collaborator. Diplomatic, consultative career roles.",
    8:  "10th lord in 8th: Career in research, investigation, surgery, occult, or managing others' resources. Sudden career changes are possible; transformation is a professional theme.",
    9:  "10th lord in 9th: Highly auspicious — dharmic career in law, education, religion, or international work. Fortune, travel, and recognition through professional righteousness.",
    10: "10th lord in 10th: Very powerful — consistent, sustained career growth and public recognition throughout life. Authority and status accumulate steadily.",
    11: "10th lord in 11th: Career generates strong financial gains. Income rises with career advancement. Successful in large organisations or high-income professional fields.",
    12: "10th lord in 12th: Career in foreign lands, hospitals, ashrams, or behind-the-scenes roles. Recognition comes from service, sacrifice, or working in institutional settings.",
  },
  "Wealth & Finances": {
    1:  "2nd lord in 1st: Personal initiative and self-expression directly generate wealth. Financial identity is strong; you create income through your personality and presence.",
    2:  "2nd lord in 2nd: Excellent placement — wealth accumulates naturally. Financial skills are strong; family support is consistent. Savings and family assets grow steadily.",
    3:  "2nd lord in 3rd: Income through communication, trade, media, or short-distance business. Writing, selling, and networking are primary wealth-creation methods.",
    4:  "2nd lord in 4th: Family wealth tied to property and real estate. Inheritance from maternal side is possible. Domestic investments and land generate financial security.",
    5:  "2nd lord in 5th: Speculative gains, creative income, and earnings through children's endeavours. Intelligence and risk-taking generate wealth. Education investments pay off.",
    6:  "2nd lord in 6th: Income through service, medical work, or competitive effort. Financial challenges may arise through debt or litigation. Hard work is the primary path to wealth.",
    7:  "2nd lord in 7th: Wealth through partnerships, marriage, and business dealings. Spouse brings financial contributions. Joint ventures and foreign trade are financially productive.",
    8:  "2nd lord in 8th: Wealth through inheritance, partner's resources, or research. Unexpected financial windfalls and losses are both possible. Financial transformation is a life theme.",
    9:  "2nd lord in 9th: Fortune through father, higher education, and righteous action. Strong financial dharma. Earnings from foreign travel, publishing, or teaching.",
    10: "2nd lord in 10th: Career directly generates wealth. Professional recognition translates into consistent financial growth. Status and income are strongly linked.",
    11: "2nd lord in 11th: Excellent — wealth accumulates through multiple income streams. Financial gains are consistent and growing. Elder siblings or social networks assist financially.",
    12: "2nd lord in 12th: Expenses may exceed savings; generous financial outflows. Wealth through foreign lands or spiritual institutions. Careful financial management is essential.",
  },
  "Health & Vitality": {
    1:  "6th lord in 1st: Health challenges affect personal vitality directly. Self-awareness is the key to managing wellbeing. Competitive and disease-fighting energy is high.",
    2:  "6th lord in 2nd: Health expenses affect family finances. Dietary habits significantly impact health. Speech or dental issues may arise. Income from health-related services.",
    3:  "6th lord in 3rd: Health challenges linked to travel, stress, or communication strain. Lung and shoulder conditions may arise. Siblings may face health concerns.",
    4:  "6th lord in 4th: Health affected by home environment and emotional stress. Chest, heart, or stomach conditions possible. Mother's health may be a concern. Property litigation possible.",
    5:  "6th lord in 5th: Health concerns related to children or creative overexertion. Stomach conditions possible. Romantic relationships may bring stress affecting health.",
    6:  "6th lord in 6th: Strong ability to overcome illness and defeat disease — an excellent placement. Resilient immune system. Success in competitive health-related fields.",
    7:  "6th lord in 7th: Partner's health may be a concern. Relationship tensions can affect physical health. Digestive or urinary health requires monitoring.",
    8:  "6th lord in 8th: Chronic or hidden ailments are possible. Significant health transformations occur. Research into unconventional healing methods is beneficial.",
    9:  "6th lord in 9th: Health through pilgrimages, dharmic practices, or long travel. Father may have health concerns. Spiritual healing and alternative medicine are effective.",
    10: "6th lord in 10th: Career in health, medicine, or service industries. Work-related stress affects physical health. Competitive career environment.",
    11: "6th lord in 11th: Health gains through social networks and group activities. Recovery supported by friends. Income from health-related work.",
    12: "6th lord in 12th: Health expenses in hospitals or foreign lands. Isolated recovery periods. Spiritual practices and retreat significantly restore vitality.",
  },
  "Family & Home": {
    1:  "4th lord in 1st: Home and family are central to your identity. Strong emotional connection to mother. You carry your homeland wherever you go. Property success through personal effort.",
    2:  "4th lord in 2nd: Family wealth tied to property assets. Home is financially productive. Strong family financial traditions. Comfort and security in domestic life.",
    3:  "4th lord in 3rd: Frequent local travel related to family matters. Mother may be a communicative or commercially inclined figure. Multiple residences possible.",
    4:  "4th lord in 4th: Very auspicious — deep happiness from home, property, and family. Strong mother bond. Beautiful, secure home environment. Multiple properties are possible.",
    5:  "4th lord in 5th: Children bring great happiness to the home. Creative, joyful domestic environment. Mother is intelligent and youthful. Residential property through speculation possible.",
    6:  "4th lord in 6th: Challenges in home or with mother possible. Property disputes may arise. However, service-related professions may be conducted from home successfully.",
    7:  "4th lord in 7th: Partner becomes central to home and family life. Marriage brings domestic happiness. Possible foreign residence after marriage. Property through partnerships.",
    8:  "4th lord in 8th: Sudden changes in family circumstances. Property may involve complex inheritance. Deep ancestral karma. Home life transforms significantly at key life stages.",
    9:  "4th lord in 9th: Very fortunate domestic life blessed by good karma. Mother is wise and religiously inclined. Property in foreign or sacred lands. Home life shaped by dharma.",
    10: "4th lord in 10th: Career linked to property, home, or maternal industry. Public recognition tied to family heritage. Home office or working from homeland.",
    11: "4th lord in 11th: Property gains are consistent and growing. Family supports financial aspirations. Large, comfortable home. Mother's guidance helps fulfil long-term desires.",
    12: "4th lord in 12th: Possible residence in foreign lands. Emotional distance from mother or homeland. Home may be private, secluded, or spiritually oriented.",
  },
};

// ---------------------------------------------------------------------------
// Key planet role summary per life area
// ---------------------------------------------------------------------------
export const KEY_PLANET_ROLE: Record<string, Record<string, string>> = {
  "Love & Marriage": {
    Venus:   "Venus is the primary karaka (significator) of love and marriage. Its sign, house, and dignity directly determine the quality and joy of romantic relationships.",
    Moon:    "Moon governs emotional needs in relationships. Its placement shows what you emotionally need from a partner and how your mother's influence shapes relationships.",
    Jupiter: "Jupiter is the karaka for husband in a woman's chart. Its strength, sign, and house show the quality of the spouse and the overall fortune in marriage.",
    Mars:    "Mars (Mangala) is the karaka for husband in some traditions and drives passion. A strong Mars creates romantic intensity; affliction can indicate Mangal Dosha dynamics.",
  },
  "Career & Status": {
    Sun:     "Sun is the natural karaka for career, status, and authority. Its strength determines how easily you gain recognition and command professional respect.",
    Saturn:  "Saturn governs sustained effort, discipline, and karmic career lessons. Its placement defines where you must work hardest and what long-term professional legacy you build.",
    Mercury: "Mercury governs intellect, communication, and business acumen in career. Its placement shows where analytical or communicative skills bring professional advantages.",
    Mars:    "Mars drives career ambition, courage, and competitive instinct. Its placement in the chart shows the energy and initiative you bring to professional endeavours.",
  },
  "Wealth & Finances": {
    Jupiter: "Jupiter is the primary karaka for wealth expansion. A strong Jupiter multiplies financial opportunities and protects against major losses.",
    Venus:   "Venus governs material comforts, luxuries, and the enjoyment of wealth. Its placement shows how and where you enjoy spending and the quality of your material life.",
    Mercury: "Mercury governs trade, business, and commercial intelligence. Its placement shows where intellectual ability and networking generate the most financial return.",
    Saturn:  "Saturn teaches financial discipline and karma through wealth. Hard work and delayed gratification under Saturn transit build lasting financial structures.",
  },
  "Health & Vitality": {
    Sun:     "Sun is the karaka for vitality, immunity, and life force. A strong Sun gives robust health; its affliction or debilitation lowers constitutional strength.",
    Moon:    "Moon governs mental health, digestion, and emotional wellbeing. Stress and emotional instability under a weak Moon directly manifest as physical ailments.",
    Mars:    "Mars provides physical energy, stamina, and healing capacity. A strong Mars speeds recovery; an afflicted Mars increases accident proneness and inflammatory conditions.",
    Saturn:  "Saturn in health indicates chronic conditions, constitution, and longevity. It teaches health through discipline; neglect brings persistent ailments.",
  },
  "Family & Home": {
    Moon:    "Moon is the karaka for mother, home, and emotional security. Its strength determines the quality of maternal bond and emotional nourishment received in early life.",
    Jupiter: "Jupiter is the karaka for children and family blessings. Its placement and strength determine happiness from children and the overall fortune of the family unit.",
    Saturn:  "Saturn in family matters governs responsibility, longevity of parents, and karmic family duties. It can create distance but also teaches deep loyalty and respect.",
    Mars:    "Mars governs siblings, especially brothers. Its placement determines the relationship with siblings and whether the family dynamic is competitive or supportive.",
  },
};

// ---------------------------------------------------------------------------
// Navamsa sign meanings (D-9)
// ---------------------------------------------------------------------------
export const NAVAMSA_LAGNA_MEANINGS: Record<string, string> = {
  Aries:       "Navamsa Aries Lagna: Your soul seeks courage, independence, and pioneering experiences. In relationships, you need a partner who matches your energy and drive. Inner spiritual journey involves conquering fear.",
  Taurus:      "Navamsa Taurus Lagna: Your soul seeks stability, beauty, and sensory fulfilment. In partnerships, loyalty and material security matter deeply. Spiritual growth comes through developing contentment.",
  Gemini:      "Navamsa Gemini Lagna: Your soul seeks knowledge, variety, and communication. Relationships need intellectual stimulation. Spiritual path involves integrating dual aspects of your nature.",
  Cancer:      "Navamsa Cancer Lagna: Your soul seeks emotional connection, home, and nurturing. The ideal partner is caring and sensitive. Spiritual fulfilment comes through devotion and surrender.",
  Leo:         "Navamsa Leo Lagna: Your soul seeks creative expression and recognition. A confident, generous partner is ideal. Spiritual growth involves transcending ego to become a pure channel for divine creativity.",
  Virgo:       "Navamsa Virgo Lagna: Your soul seeks perfection, service, and discernment. A partner with practical values and intellect suits you. Spiritual path involves selfless service and purification.",
  Libra:       "Navamsa Libra Lagna: Your soul seeks harmony, justice, and beautiful relationships. You are drawn to aesthetically refined, balanced partners. Spiritual growth comes through cultivating inner equilibrium.",
  Scorpio:     "Navamsa Scorpio Lagna: Your soul seeks deep transformation and occult wisdom. Relationships involve intense bonding and power. Spiritual path involves dying to the ego and rebirth into higher consciousness.",
  Sagittarius: "Navamsa Sagittarius Lagna: Your soul seeks freedom, wisdom, and spiritual adventure. A partner who shares philosophical views brings joy. Growth comes through dharmic living and higher learning.",
  Capricorn:   "Navamsa Capricorn Lagna: Your soul seeks achievement, discipline, and karmic mastery. A practical, responsible partner is ideal. Spiritual path involves patient purification of past karma.",
  Aquarius:    "Navamsa Aquarius Lagna: Your soul seeks humanitarian service and collective awakening. An independent, progressive partner suits you. Spiritual growth through detachment and universal compassion.",
  Pisces:      "Navamsa Pisces Lagna: Your soul seeks dissolution into the divine and unconditional love. A spiritually attuned, compassionate partner is ideal. Liberation comes through surrender and devotion.",
};

// ---------------------------------------------------------------------------
// Navamsa Venus interpretation (marriage partner quality)
// ---------------------------------------------------------------------------
export const NAVAMSA_VENUS_HOUSE: Record<number, string> = {
  1:  "Venus in D-9 1st house: Your partner will have a charming, beautiful appearance and a pleasant, loving personality.",
  2:  "Venus in D-9 2nd house: Your partner will be financially supportive and value family harmony. Sweet speech and generous with resources.",
  3:  "Venus in D-9 3rd house: Your partner will be communicative, creative, and may be involved in media or the arts.",
  4:  "Venus in D-9 4th house: Your partner will be nurturing, homely, and devoted to creating a beautiful, comfortable home.",
  5:  "Venus in D-9 5th house: Your partner will be romantic, creative, and loving towards children. A joyful and affectionate companion.",
  6:  "Venus in D-9 6th house: Relationship may require service and sacrifice. Partner may be in healthcare or service-oriented profession.",
  7:  "Venus in D-9 7th house: Very auspicious — partner is deeply loving, beautiful, and relationship brings mutual joy and prosperity.",
  8:  "Venus in D-9 8th house: Deep, transformative relationship. Partner brings hidden resources or occult interests. Intense emotional bonding.",
  9:  "Venus in D-9 9th house: Fortunate marriage. Partner may be spiritual, philosophical, or from a different cultural or foreign background.",
  10: "Venus in D-9 10th house: Partner is successful and career-oriented. Marriage brings social status and public recognition.",
  11: "Venus in D-9 11th house: Partner brings gains and has a large social network. Marriage fulfils many long-held desires.",
  12: "Venus in D-9 12th house: Partner may be spiritually inclined or from a foreign land. Deep private bond; relationship involves sacrifice and transcendence.",
};

// ---------------------------------------------------------------------------
// Navamsa 7th house sign meaning (spouse characteristics)
// ---------------------------------------------------------------------------
export const NAVAMSA_7TH_SIGN: Record<string, string> = {
  Aries:       "7th in Aries (D-9): Spouse will be dynamic, courageous, and independent-minded. An action-oriented, energetic partner.",
  Taurus:      "7th in Taurus (D-9): Spouse will be stable, sensuous, and devoted. Values comfort, beauty, and material security in the relationship.",
  Gemini:      "7th in Gemini (D-9): Spouse will be intelligent, witty, and communicative. A mentally stimulating, youthful partner.",
  Cancer:      "7th in Cancer (D-9): Spouse will be nurturing, emotionally sensitive, and family-oriented. A deeply caring, devoted partner.",
  Leo:         "7th in Leo (D-9): Spouse will be charismatic, generous, and proud. A partner who enjoys being in the spotlight and gives warmly.",
  Virgo:       "7th in Virgo (D-9): Spouse will be analytical, health-conscious, and service-oriented. A devoted, practical, and detail-minded partner.",
  Libra:       "7th in Libra (D-9): Spouse will be charming, diplomatic, and aesthetically refined. A harmonious, socially graceful partner.",
  Scorpio:     "7th in Scorpio (D-9): Spouse will be intense, perceptive, and deeply loyal. A transformative partner who engages at the deepest level.",
  Sagittarius: "7th in Sagittarius (D-9): Spouse will be optimistic, philosophical, and freedom-loving. An adventurous, generous partner.",
  Capricorn:   "7th in Capricorn (D-9): Spouse will be disciplined, responsible, and career-focused. A stable, mature, and dependable partner.",
  Aquarius:    "7th in Aquarius (D-9): Spouse will be independent, intellectual, and unconventional. A progressive, friendship-based relationship.",
  Pisces:      "7th in Pisces (D-9): Spouse will be compassionate, spiritual, and emotionally deep. A dreamy, devoted, and soulful partner.",
};
