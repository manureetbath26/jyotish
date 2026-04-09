// Vimshottari Dasha Interpretation Tables
// Authentic Vedic/Jyotish astrology interpretations for mahadasha, antardasha, and house placements.

// ─── 1. DASHA_LORD_GENERAL ──────────────────────────────────────────────────────
// General themes for each planet's mahadasha period.

export const DASHA_LORD_GENERAL: Record<
  string,
  { overview: string; career: string; relationships: string; health: string; finances: string }
> = {
  Sun: {
    overview:
      "The Sun mahadasha lasts 6 years and brings themes of authority, self-expression, and recognition. This period illuminates your sense of identity and pushes you toward leadership roles. Matters related to the father, government, and personal dharma come into sharp focus.",
    career:
      "Career gains through government, politics, or authoritative positions are likely. You may receive recognition, promotions, or take on leadership responsibilities. Work involving medicine, administration, or public service is especially favored.",
    relationships:
      "Relationships take on a more ego-driven quality; you seek respect and admiration from partners. The bond with your father becomes significant, for better or worse depending on Sun's dignity. Romance may involve someone powerful or well-placed in society.",
    health:
      "The Sun governs vitality, heart, eyes, and bones. Watch for issues related to blood pressure, heart strain, or eye problems. Maintaining a disciplined routine and avoiding excessive heat exposure supports well-being during this period.",
    finances:
      "Finances can improve through government contracts, authority-based roles, or paternal inheritance. Spending may increase on status symbols and self-image. Gains are steady when the Sun is well-placed but ego-driven investments carry risk.",
  },
  Moon: {
    overview:
      "The Moon mahadasha spans 10 years and governs the mind, emotions, and public life. This is a period of heightened sensitivity, imagination, and connection to the mother. Travel, changes of residence, and fluctuating fortunes are hallmarks of this dasha.",
    career:
      "Career paths involving the public, hospitality, nursing, shipping, or creative arts gain momentum. You may find success through popularity and public favor. Frequent changes in job or work environment are possible as the Moon is inherently changeable.",
    relationships:
      "Emotional bonds deepen and the desire for nurturing connections intensifies. Relationship with the mother becomes especially prominent. Marriage or romantic life is colored by emotional needs, mood swings, and a longing for security.",
    health:
      "The Moon rules the mind, chest, lungs, and bodily fluids. Mental health, sleep disturbances, and water-related ailments may surface. Women may experience hormonal fluctuations. Meditation and emotional self-care are essential.",
    finances:
      "Finances fluctuate like the waxing and waning Moon. Income may come through liquids, dairy, agriculture, or public-facing businesses. Saving consistently is important as spending can be emotionally driven during this dasha.",
  },
  Mars: {
    overview:
      "The Mars mahadasha lasts 7 years and activates courage, ambition, and competitive drive. This is a period of action, conflict, and physical energy where initiatives are launched boldly. Property matters, siblings, and technical or martial pursuits come to the forefront.",
    career:
      "Careers in engineering, military, surgery, sports, police, or real estate are strongly activated. You may take bold risks in your profession and fight for what you want. Leadership through action rather than diplomacy defines this period.",
    relationships:
      "Relationships can become passionate but also contentious, with arguments and power struggles surfacing. The bond with siblings is highlighted. Romantic connections carry intensity and physical attraction but require managing anger and impatience.",
    health:
      "Mars governs blood, muscles, and the head. Accidents, surgeries, fevers, inflammation, and injuries are possible if Mars is afflicted. Regular physical exercise channels this energy constructively. Avoid reckless behavior and overexertion.",
    finances:
      "Finances may come through property, land, machinery, or technical ventures. Bold investments can pay off but impulsive spending is a risk. Litigation over property or inheritance may arise. Military or government service can bring steady income.",
  },
  Mercury: {
    overview:
      "The Mercury mahadasha extends for 17 years, making it one of the longer periods. Intellectual development, communication, trade, and analytical thinking dominate this phase. Education, writing, business acumen, and social networking reach their peak during Mercury's reign.",
    career:
      "Careers in writing, accounting, trade, IT, astrology, journalism, and teaching flourish. This is an excellent period for starting businesses, especially in commerce or communication. Multitasking and adaptability become your greatest professional assets.",
    relationships:
      "Relationships are cerebral and communicative rather than deeply emotional. You attract witty, youthful, or intellectual partners. Friendships expand significantly. Sibling-like bonds and platonic connections may be as important as romantic ones.",
    health:
      "Mercury rules the nervous system, skin, lungs, and speech. Skin disorders, allergies, nervous tension, and respiratory issues may arise. Mental overstimulation and anxiety are common. Pranayama and grounding practices help maintain balance.",
    finances:
      "Financial acumen sharpens considerably during Mercury dasha. Gains through trade, writing, intellectual property, and business dealings are favored. Multiple income streams are likely. Speculative investments guided by research can be profitable.",
  },
  Jupiter: {
    overview:
      "Jupiter's mahadasha lasts 16 years and is considered one of the most benefic periods in Vedic astrology. Wisdom, dharma, expansion, and good fortune pervade this dasha. Children, higher education, spirituality, and wealth accumulation are central themes.",
    career:
      "Careers in education, law, religion, finance, consulting, and philosophy prosper. Promotions, honors, and mentorship roles are likely. You may become a guide or advisor to others. Government favor and institutional support are strong possibilities.",
    relationships:
      "Jupiter blesses relationships with optimism, generosity, and growth. Marriage prospects improve and existing bonds deepen through shared values and spiritual connection. Children may be born or become a source of joy. The guru-student bond is also activated.",
    health:
      "Jupiter governs the liver, fat tissue, and arterial system. Weight gain, liver issues, diabetes, and cholesterol problems can surface if Jupiter is afflicted. Moderation in diet and a philosophical approach to health are advised.",
    finances:
      "This is often the most financially abundant dasha. Wealth accumulates through righteous means, investments, and institutional income. Jupiter favors gold, banking, and education-related earnings. Charitable giving paradoxically increases inflow.",
  },
  Venus: {
    overview:
      "Venus mahadasha is the longest at 20 years and brings themes of love, beauty, luxury, and creative fulfillment. Material comforts, artistic expression, marriage, and sensual pleasures define this period. It is a time to enjoy the fruits of past karma.",
    career:
      "Careers in arts, entertainment, fashion, beauty, hospitality, music, and luxury goods thrive. Creative professionals reach their peak. Diplomatic roles, HR, and any work involving aesthetics or pleasure industries are strongly favored.",
    relationships:
      "Venus dasha is the most favorable period for love, marriage, and romantic fulfillment. Existing relationships blossom with affection and harmony. New romantic connections carry grace and attraction. The spouse or partner plays a central role in life.",
    health:
      "Venus governs the reproductive system, kidneys, and face. Overindulgence in food, drink, and pleasure can lead to health issues. Diabetes, urinary problems, and reproductive disorders may surface. Balance between enjoyment and moderation is key.",
    finances:
      "Finances flourish through luxury goods, vehicles, real estate, arts, and entertainment. This is an excellent period for acquiring property, jewelry, and vehicles. Income flows from creative and aesthetic endeavors. Spending on comforts increases but so does earning capacity.",
  },
  Saturn: {
    overview:
      "Saturn's mahadasha spans 19 years and is often the most transformative and challenging period. Discipline, karma, responsibility, and hard-won maturity define this dasha. Delays and obstacles test your perseverance, but enduring them builds lasting structures in life.",
    career:
      "Careers involving labor, service, mining, oil, agriculture, judiciary, and administration are activated. Progress is slow but steady and built on genuine merit. You may take on heavy responsibilities or work in difficult conditions. Persistence is rewarded over time.",
    relationships:
      "Relationships undergo tests of commitment and endurance. Partnerships may feel burdensome or require sacrifice. Older or more mature partners may enter your life. Loneliness and isolation are possible, but bonds that survive Saturn's tests become unbreakable.",
    health:
      "Saturn rules bones, joints, teeth, and the aging process. Chronic conditions, joint pain, arthritis, dental problems, and depression may manifest. A disciplined health regimen, regular exercise, and adequate rest become non-negotiable during this period.",
    finances:
      "Finances require careful management and long-term planning. Sudden wealth is rare but steady accumulation through discipline is possible. Real estate, inheritance from elders, and service-based income are likely sources. Avoid risky ventures and honor debts.",
  },
  Rahu: {
    overview:
      "Rahu's mahadasha lasts 18 years and brings intense, unconventional, and often bewildering experiences. This shadowy planet drives obsession, ambition, and worldly desire. Foreign connections, technology, sudden rises and falls, and breaking social norms characterize this dasha.",
    career:
      "Careers in technology, foreign trade, aviation, media, research, and unconventional fields prosper. Rahu can give sudden and dramatic career rises, especially in worldly and materialistic domains. Working with foreigners or in foreign lands is strongly indicated.",
    relationships:
      "Relationships may involve people from different cultures, backgrounds, or unconventional arrangements. Obsessive attractions and intense desires color romantic life. Deception or misunderstanding in partnerships is possible. Clarity about true intentions is essential.",
    health:
      "Rahu creates mysterious or hard-to-diagnose illnesses. Poisoning, allergies, psychological disturbances, phobias, and addictions may surface. Mental health requires special attention. Alternative and modern medicine both play a role in healing during this period.",
    finances:
      "Rahu can bring sudden windfalls, speculation gains, or foreign income. However, financial instability and unexpected losses are equally possible. Gambling, cryptocurrency, and speculative ventures attract but carry heightened risk. Guard against fraud and deception.",
  },
  Ketu: {
    overview:
      "Ketu's mahadasha lasts 7 years and is a deeply spiritual and introspective period. Detachment, past-life karma, liberation, and mystical experiences define this dasha. Material pursuits may lose their appeal as you are drawn toward inner knowledge and renunciation.",
    career:
      "Careers may undergo sudden shifts or loss of interest in worldly ambition. Spirituality, healing, research, occult sciences, and monastic or charitable work gain appeal. Technical and analytical skills sharpen. Success comes through letting go rather than grasping.",
    relationships:
      "Relationships may feel distant or karmic in nature. Separation, detachment, or a sense of incompleteness in partnerships is common. Past-life connections may manifest. Spiritual companionship becomes more valued than romantic passion.",
    health:
      "Ketu creates mysterious ailments, especially related to the nervous system, spine, and subtle body. Surgeries, viral infections, and psychosomatic conditions are possible. Spiritual practices, yoga, and energy healing are particularly effective remedies.",
    finances:
      "Finances may become unpredictable or secondary to spiritual pursuits. Sudden losses teach non-attachment. Income through spiritual work, research, or inheritance is possible. Material wealth may decrease, but inner richness grows immensely.",
  },
};

// ─── 2. DASHA_LORD_IN_HOUSE ─────────────────────────────────────────────────────
// What the dasha means when the dasha lord is placed in each of the 12 houses.

export const DASHA_LORD_IN_HOUSE: Record<string, Record<number, string>> = {
  // ── Sun ──
  Sun: {
    1: "Sun dasha with the lord in the 1st house brings a powerful surge of confidence, leadership, and self-assertion. You become highly visible and may take on authoritative roles in your community.",
    2: "Sun dasha activating the 2nd house focuses on family wealth, speech, and accumulated resources. Income through government or authority figures is likely, and your voice carries weight.",
    3: "Sun in the 3rd house during its dasha boosts courage, initiative, and communication skills. Siblings and short journeys play an important role, and you may excel in writing or media.",
    4: "Sun dasha with the lord in the 4th house highlights home, property, and the mother. You may acquire property or vehicles, but tensions with the mother or domestic authority struggles can arise.",
    5: "Sun in the 5th house during its dasha activates creativity, children, and speculative intelligence. Political involvement, romance, and recognition for creative talents are highlighted.",
    6: "Sun dasha with the lord in the 6th house strengthens your ability to overcome enemies, debts, and diseases. Service in government, law enforcement, or healthcare brings recognition.",
    7: "Sun in the 7th house during its dasha spotlights partnerships and marriage. You may attract a powerful or authoritative spouse, but ego clashes in relationships require careful management.",
    8: "Sun dasha activating the 8th house can bring transformations, inheritance matters, and hidden power struggles. Government entanglements or health crises related to vitality may arise.",
    9: "Sun in the 9th house during its dasha strongly favors dharma, higher learning, and fortune. The father's influence is prominent, and pilgrimages or connection with mentors brings blessings.",
    10: "Sun dasha with the lord in the 10th house is one of the strongest placements for career success and public recognition. Authority, government roles, and professional prestige reach their peak.",
    11: "Sun in the 11th house during its dasha brings gains through influential networks, elder siblings, and fulfilled ambitions. Large organizations and government contracts are sources of income.",
    12: "Sun dasha activating the 12th house may bring foreign travel, spiritual retreats, or a period of relative obscurity. Expenses through government or authority-related matters are possible.",
  },
  // ── Moon ──
  Moon: {
    1: "Moon dasha with the lord in the 1st house makes emotions, appearance, and public image highly prominent. You become more sensitive, nurturing, and attractive to the masses.",
    2: "Moon in the 2nd house during its dasha emphasizes family, food, and wealth accumulation. Income flows through nurturing professions, and speech becomes emotionally persuasive.",
    3: "Moon dasha activating the 3rd house stimulates creative communication, short travels, and sibling bonds. Emotional courage drives new initiatives and artistic expression.",
    4: "Moon in the 4th house during its dasha is a deeply comforting placement bringing domestic happiness, property gains, and closeness with the mother. Emotional contentment is a hallmark.",
    5: "Moon dasha with the lord in the 5th house enhances creativity, romance, and the birth or joy of children. Emotional intelligence guides speculative and romantic decisions.",
    6: "Moon in the 6th house during its dasha can bring emotional turbulence through conflicts, health issues, or service obligations. Success comes through caregiving, nursing, or healing professions.",
    7: "Moon dasha activating the 7th house focuses intensely on marriage and partnerships. Emotional bonding deepens, and you may meet a nurturing, sensitive partner or strengthen an existing union.",
    8: "Moon in the 8th house during its dasha can bring emotional upheavals, psychic sensitivity, and transformative inner experiences. Inheritance or sudden changes in family wealth are possible.",
    9: "Moon dasha with the lord in the 9th house blesses you with emotional wisdom, spiritual travels, and connection to teachers. The mother may play a guru-like role, and fortune flows through faith.",
    10: "Moon in the 10th house during its dasha brings public prominence and a career connected to the masses. Professions in hospitality, real estate, or public welfare gain momentum.",
    11: "Moon dasha activating the 11th house brings fulfillment of desires through social networks and community involvement. Gains through women, the public, and nurturing enterprises are indicated.",
    12: "Moon in the 12th house during its dasha may lead to foreign settlement, spiritual introspection, or periods of emotional withdrawal. Sleep disturbances and hidden sorrows may surface.",
  },
  // ── Mars ──
  Mars: {
    1: "Mars dasha with the lord in the 1st house ignites tremendous physical energy, courage, and assertiveness. You become action-oriented and may take on athletic, martial, or competitive endeavors.",
    2: "Mars in the 2nd house during its dasha can create heated family dynamics and aggressive speech patterns. Wealth may come through engineering, property, or military service.",
    3: "Mars dasha activating the 3rd house is one of the best placements for courage, adventure, and sibling support. Short travels, sports, and bold communication ventures succeed.",
    4: "Mars in the 4th house during its dasha may bring property acquisition but also domestic conflicts. Renovation, construction, or land-related activities dominate this period.",
    5: "Mars dasha with the lord in the 5th house activates competitive sports, speculative courage, and passionate romance. Children may be a source of both pride and challenge.",
    6: "Mars in the 6th house during its dasha is excellent for defeating enemies, winning legal battles, and excelling in competitive environments. Military, surgery, and athletic careers thrive.",
    7: "Mars dasha activating the 7th house brings passionate but potentially volatile partnerships. Business partnerships involve competition, and marriage requires managing anger and dominance.",
    8: "Mars in the 8th house during its dasha can bring surgeries, accidents, or intense transformative experiences. Research into hidden matters and occult sciences may attract you.",
    9: "Mars dasha with the lord in the 9th house channels energy toward righteous battles, pilgrimages, and defending principles. The father may be a source of conflict or martial inspiration.",
    10: "Mars in the 10th house during its dasha is a powerful placement for career advancement through bold action. Engineering, military command, surgery, and law enforcement roles bring success.",
    11: "Mars dasha activating the 11th house brings gains through competitive endeavors, elder siblings, and technical ventures. Large ambitions are achieved through persistent effort.",
    12: "Mars in the 12th house during its dasha may bring hospitalization, foreign travel, or hidden conflicts. Energy may be drained through secret enemies or excessive expenditure.",
  },
  // ── Mercury ──
  Mercury: {
    1: "Mercury dasha with the lord in the 1st house sharpens intellect, communication, and youthful appearance. You become articulate, adaptable, and drawn to learning and social interaction.",
    2: "Mercury in the 2nd house during its dasha enhances speech, writing income, and family communication. Wealth accumulates through trade, intellectual work, and multiple income sources.",
    3: "Mercury dasha activating the 3rd house is one of the best placements for writers, journalists, and communicators. Siblings, short trips, and media ventures bring success.",
    4: "Mercury in the 4th house during its dasha brings intellectual stimulation at home, educational achievements, and possible real estate dealings. The home may become a study or workspace.",
    5: "Mercury dasha with the lord in the 5th house favors education, creative writing, speculative intelligence, and mentoring children. Romance is light-hearted and intellectually stimulating.",
    6: "Mercury in the 6th house during its dasha helps overcome enemies through wit and legal acumen. Health issues related to nerves or skin may arise, but analytical problem-solving excels.",
    7: "Mercury dasha activating the 7th house brings communicative partnerships and business alliances. You may attract a youthful, witty partner or excel in consulting and negotiation.",
    8: "Mercury in the 8th house during its dasha stimulates research, investigation, and occult study. Hidden knowledge, insurance matters, and transformative intellectual experiences arise.",
    9: "Mercury dasha with the lord in the 9th house favors higher education, publishing, and philosophical inquiry. Travel for learning and connection with scholarly mentors are highlighted.",
    10: "Mercury in the 10th house during its dasha brings career success through communication, trade, or technology. You become known for your intellect and may manage multiple professional ventures.",
    11: "Mercury dasha activating the 11th house brings gains through networks, intellectual circles, and diverse income streams. Friendships with knowledgeable people become profitable.",
    12: "Mercury in the 12th house during its dasha may bring foreign communication ventures, writing in isolation, or scattered mental energy. Expenses on education or travel abroad are likely.",
  },
  // ── Jupiter ──
  Jupiter: {
    1: "Jupiter dasha with the lord in the 1st house brings wisdom, optimism, and physical expansion. You radiate generosity and others look to you for guidance and moral direction.",
    2: "Jupiter in the 2nd house during its dasha brings substantial family wealth, eloquent speech, and accumulation of resources. Income through teaching, banking, or advisory roles is favored.",
    3: "Jupiter dasha activating the 3rd house channels wisdom into communication, publishing, and mentoring siblings. Short pilgrimages and courageous spiritual initiatives bear fruit.",
    4: "Jupiter in the 4th house during its dasha blesses domestic life with happiness, property expansion, and spiritual peace at home. Educational achievements and maternal blessings are strong.",
    5: "Jupiter dasha with the lord in the 5th house is exceptional for children, higher learning, creative expression, and spiritual practice. This is one of the most auspicious placements overall.",
    6: "Jupiter in the 6th house during its dasha helps overcome obstacles through wisdom and dharma. Legal victories, healing abilities, and service to others define this period, though watch for weight gain.",
    7: "Jupiter dasha activating the 7th house strongly favors marriage, partnerships, and legal agreements. You may attract a wise, generous partner or expand through business alliances.",
    8: "Jupiter in the 8th house during its dasha brings deep transformative wisdom, longevity, and possible inheritance. Interest in mysticism, tantra, and esoteric knowledge intensifies.",
    9: "Jupiter dasha with the lord in the 9th house is the most auspicious placement for spiritual growth, higher education, and fortune. The guru's blessings manifest powerfully in all areas of life.",
    10: "Jupiter in the 10th house during its dasha activates your career house strongly. Expect professional growth, recognition from superiors, and possibly a role involving teaching, law, or advisory.",
    11: "Jupiter dasha activating the 11th house brings abundant gains, fulfilled desires, and expansion of social networks. Elder siblings prosper, and large organizations become sources of wealth.",
    12: "Jupiter in the 12th house during its dasha favors spiritual liberation, foreign travels, and charitable giving. Ashram life, meditation retreats, and moksha-oriented pursuits are highlighted.",
  },
  // ── Venus ──
  Venus: {
    1: "Venus dasha with the lord in the 1st house enhances beauty, charm, and social grace. You attract luxury, romance, and artistic opportunities effortlessly during this period.",
    2: "Venus in the 2nd house during its dasha brings wealth through beauty, arts, and luxury goods. Family life is harmonious, speech becomes sweet, and fine dining and aesthetics are enjoyed.",
    3: "Venus dasha activating the 3rd house stimulates artistic communication, creative hobbies, and pleasant short travels. Siblings may be involved in artistic or romantic matters.",
    4: "Venus in the 4th house during its dasha brings domestic luxury, beautiful home environments, and vehicle acquisition. The mother's influence is gentle, and emotional comfort is abundant.",
    5: "Venus dasha with the lord in the 5th house is highly romantic and creative. Love affairs, artistic achievements, entertainment ventures, and joy through children define this period.",
    6: "Venus in the 6th house during its dasha may bring challenges in relationships or health issues related to overindulgence. However, creative service professions and beauty-related work can thrive.",
    7: "Venus dasha activating the 7th house is one of the strongest placements for marriage, love, and partnership. A beautiful, harmonious union or major business alliance is very likely.",
    8: "Venus in the 8th house during its dasha can bring hidden romances, joint financial gains through the spouse, and transformative sensual experiences. Occult beauty practices may attract you.",
    9: "Venus dasha with the lord in the 9th house combines pleasure with dharma. Spiritual art, devotional music, pilgrimage to beautiful places, and a cultured mentor or father figure are themes.",
    10: "Venus in the 10th house during its dasha brings career success through arts, diplomacy, fashion, or entertainment. Public image is enhanced, and professional life carries grace and charm.",
    11: "Venus dasha activating the 11th house brings gains through artistic ventures, social connections, and women in your network. Desires for luxury and comfort are fulfilled generously.",
    12: "Venus in the 12th house during its dasha favors foreign luxury, bedroom pleasures, and spiritual devotion through art. Expenses on comfort are high, but so is the enjoyment of life's finer things.",
  },
  // ── Saturn ──
  Saturn: {
    1: "Saturn dasha with the lord in the 1st house brings a serious, disciplined demeanor and possible health challenges. Life demands self-reliance, and character is forged through hardship.",
    2: "Saturn in the 2nd house during its dasha can restrict family wealth initially but builds it slowly over time. Speech becomes measured, and financial discipline leads to long-term security.",
    3: "Saturn dasha activating the 3rd house builds courage through persistent effort. Siblings may face hardships, and communication requires discipline. Writing and media work improve steadily.",
    4: "Saturn in the 4th house during its dasha may bring domestic responsibilities, property challenges, or distance from the mother. Eventually, real estate and land investments yield results.",
    5: "Saturn dasha with the lord in the 5th house can delay children or create educational obstacles. Speculative ventures require caution, but disciplined study and serious creative work bear fruit.",
    6: "Saturn in the 6th house during its dasha is excellent for defeating enemies and overcoming chronic diseases through sustained effort. Service-oriented careers and legal matters favor you.",
    7: "Saturn dasha activating the 7th house tests partnerships with responsibility and commitment. Marriage may feel heavy, but enduring relationships gain profound depth and stability.",
    8: "Saturn in the 8th house during its dasha can bring chronic health issues, inheritance delays, and deep karmic transformations. Longevity is indicated, and occult study deepens.",
    9: "Saturn dasha with the lord in the 9th house may challenge faith and create obstacles in higher education. Pilgrimage through hardship teaches profound lessons, and the father faces difficulties.",
    10: "Saturn in the 10th house during its dasha is powerful for career building through discipline and persistence. Authority comes slowly but is deeply respected. Government or corporate roles stabilize.",
    11: "Saturn dasha activating the 11th house brings steady gains through older networks, large organizations, and persistent effort. Long-term financial goals are achieved through patient labor.",
    12: "Saturn in the 12th house during its dasha may bring isolation, foreign residence, or spiritual austerity. Expenses are high and losses are possible, but deep spiritual insight emerges from solitude.",
  },
  // ── Rahu ──
  Rahu: {
    1: "Rahu dasha with the lord in the 1st house creates a magnetic, unconventional personality. You may reinvent yourself dramatically, and worldly ambitions drive intense self-promotion.",
    2: "Rahu in the 2nd house during its dasha can bring wealth through unconventional or foreign means. Speech may be manipulative, and family dynamics involve unusual or cross-cultural elements.",
    3: "Rahu dasha activating the 3rd house amplifies courage, media presence, and unconventional communication. Technology-driven ventures and bold, boundary-pushing creative projects succeed.",
    4: "Rahu in the 4th house during its dasha may bring unusual domestic situations, foreign property, or psychological restlessness at home. Unconventional vehicles or homes may be acquired.",
    5: "Rahu dasha with the lord in the 5th house brings speculative obsessions, unconventional romance, and unique creative talents. Children may have unusual characteristics or interests.",
    6: "Rahu in the 6th house during its dasha is powerful for overcoming enemies through unconventional strategies. Foreign diseases, unusual legal matters, and competitive victories through cunning are themes.",
    7: "Rahu dasha activating the 7th house may bring a foreign or unconventional spouse and intense partnership dynamics. Business with foreigners prospers, but deception in relationships is a risk.",
    8: "Rahu in the 8th house during its dasha intensifies occult interest, sudden transformations, and mysterious experiences. Inheritance from unusual sources and deep psychological breakthroughs occur.",
    9: "Rahu dasha with the lord in the 9th house may challenge traditional beliefs and connect you with foreign philosophies. Pilgrimage to distant lands and unconventional gurus shape your worldview.",
    10: "Rahu in the 10th house during its dasha can bring sudden career elevation, fame, and success in technology or foreign markets. Public image may be unconventional but powerfully magnetic.",
    11: "Rahu dasha activating the 11th house is one of the best placements for material gains, fulfilled desires, and networking with influential foreigners. Large, unconventional income sources open up.",
    12: "Rahu in the 12th house during its dasha may bring foreign settlement, hidden obsessions, or spiritual confusion. Expenses through unusual channels and psychic disturbances are possible.",
  },
  // ── Ketu ──
  Ketu: {
    1: "Ketu dasha with the lord in the 1st house brings spiritual introspection, detachment from identity, and possible health mysteries. You may appear withdrawn but are gaining profound inner wisdom.",
    2: "Ketu in the 2nd house during its dasha may disrupt family harmony and reduce attachment to wealth. Speech becomes cryptic or spiritually oriented, and past-life family karma surfaces.",
    3: "Ketu dasha activating the 3rd house can diminish worldly courage but heighten intuitive communication. Siblings may drift away, and interest in mystical writing or subtle arts grows.",
    4: "Ketu in the 4th house during its dasha may create emotional detachment from home and mother. Property matters are uncertain, but inner peace through meditation and spiritual practice deepens.",
    5: "Ketu dasha with the lord in the 5th house can create challenges with children or formal education but enhances spiritual intelligence. Past-life talents and intuitive creative gifts emerge.",
    6: "Ketu in the 6th house during its dasha is excellent for overcoming enemies and diseases through spiritual means. Chronic conditions may resolve unexpectedly, and service becomes selfless.",
    7: "Ketu dasha activating the 7th house brings detachment or separation in partnerships. Relationships may feel karmically incomplete, but spiritual companionship and inner union are deepened.",
    8: "Ketu in the 8th house during its dasha intensifies spiritual transformation, mystical experiences, and past-life revelations. This is a powerful placement for moksha and occult mastery.",
    9: "Ketu dasha with the lord in the 9th house creates a deep, unconventional spiritual path. Formal religion may lose appeal while direct mystical experience and past-life dharmic connections awaken.",
    10: "Ketu in the 10th house during its dasha may bring sudden career changes or loss of worldly ambition. Success comes through spiritual vocation, healing work, or detachment from status.",
    11: "Ketu dasha activating the 11th house reduces attachment to material gains and social networks. Spiritual friendships replace worldly ones, and unexpected gains through past karma may manifest.",
    12: "Ketu in the 12th house during its dasha is the most powerful placement for spiritual liberation and moksha. Foreign ashrams, deep meditation, and dissolution of worldly attachments define this period.",
  },
};

// ─── 3. ANTARDASHA_COMBINATIONS ─────────────────────────────────────────────────
// Sub-period themes: mahadasha lord -> antardasha lord.

export const ANTARDASHA_COMBINATIONS: Record<string, Record<string, string>> = {
  // ── Sun Mahadasha ──
  Sun: {
    Sun:
      "Sun-Sun period intensifies ego, authority, and vitality. Government dealings, father-related matters, and personal recognition reach their peak. Health requires monitoring for heat-related issues.",
    Moon:
      "Moon antardasha in Sun mahadasha blends authority with emotional sensitivity. Public recognition, maternal influence, and travel for official purposes are highlighted. Mind and heart seek alignment.",
    Mars:
      "Mars antardasha in Sun mahadasha creates a powerful combination of authority and action. Military, surgical, or competitive career gains are likely. Courage to lead boldly manifests strongly.",
    Mercury:
      "Mercury antardasha in Sun mahadasha sharpens administrative intellect and communication. Government paperwork, official speeches, and strategic thinking bring success. Education under authority figures is favored.",
    Jupiter:
      "Jupiter antardasha in Sun mahadasha is highly auspicious, combining authority with wisdom. Promotions, spiritual recognition, and blessings from the father or guru manifest. This is a period of righteous power.",
    Venus:
      "Venus antardasha in Sun mahadasha blends authority with creativity and luxury. Government-related social events, diplomatic roles, and romantic connections with influential people are highlighted.",
    Saturn:
      "Saturn antardasha in Sun mahadasha creates tension between authority and discipline. Career responsibilities increase heavily, and conflicts with seniors or father figures may arise. Patience is essential.",
    Rahu:
      "Rahu antardasha in Sun mahadasha brings unconventional power dynamics and foreign government connections. Sudden rises in authority are possible, but ego inflation and deception must be guarded against.",
    Ketu:
      "Ketu antardasha in Sun mahadasha may diminish worldly authority and turn focus inward. Spiritual retreats, detachment from power, and past-life leadership karma surface for resolution.",
  },
  // ── Moon Mahadasha ──
  Moon: {
    Sun:
      "Sun antardasha in Moon mahadasha brings clarity and confidence to an emotional period. Government support, paternal influence, and public recognition temporarily stabilize fluctuating fortunes.",
    Moon:
      "Moon-Moon period heightens emotional sensitivity, imagination, and psychic receptivity to their maximum. Domestic matters, the mother's health, and mental well-being need careful attention.",
    Mars:
      "Mars antardasha in Moon mahadasha creates emotional intensity and impulsive actions. Property matters, family conflicts, and passionate outbursts require channeling through physical activity.",
    Mercury:
      "Mercury antardasha in Moon mahadasha enhances emotional intelligence and creative communication. Writing, counseling, and business ventures driven by intuition bring success.",
    Jupiter:
      "Jupiter antardasha in Moon mahadasha is one of the most benefic combinations. Emotional wisdom, fertility, spiritual devotion, and material abundance flow harmoniously together.",
    Venus:
      "Venus antardasha in Moon mahadasha brings romantic fulfillment, artistic inspiration, and domestic beauty. Emotional connections deepen, and luxury comforts are enjoyed in the home.",
    Saturn:
      "Saturn antardasha in Moon mahadasha can bring emotional heaviness, depression, and domestic challenges. The mother's health may suffer. Disciplined emotional practices provide stability.",
    Rahu:
      "Rahu antardasha in Moon mahadasha creates mental restlessness, unusual emotional experiences, and possible foreign travels. Confusion and anxiety are risks; grounding practices are essential.",
    Ketu:
      "Ketu antardasha in Moon mahadasha brings emotional detachment and spiritual introspection. The mind withdraws from worldly concerns, and past-life emotional patterns surface for healing.",
  },
  // ── Mars Mahadasha ──
  Mars: {
    Sun:
      "Sun antardasha in Mars mahadasha combines action with authority. Military promotions, government-backed property ventures, and courageous leadership opportunities emerge powerfully.",
    Moon:
      "Moon antardasha in Mars mahadasha brings emotional fuel to competitive drive. Property related to the mother, domestic renovation, and passionate family involvement become prominent.",
    Mars:
      "Mars-Mars period maximizes physical energy, aggression, and competitive intensity. Accidents, surgeries, and conflicts are most likely now, but so are bold victories and property gains.",
    Mercury:
      "Mercury antardasha in Mars mahadasha blends strategy with action. Technical communication, engineering projects, and calculated competitive moves bring measurable results.",
    Jupiter:
      "Jupiter antardasha in Mars mahadasha channels aggressive energy into righteous action. Property blessed by dharma, protective courage, and victory through ethical means define this sub-period.",
    Venus:
      "Venus antardasha in Mars mahadasha creates passionate romance and luxurious property ventures. The combination of desire and action brings intense love affairs and vehicle acquisitions.",
    Saturn:
      "Saturn antardasha in Mars mahadasha is one of the most challenging combinations. Accidents, legal troubles, property disputes, and conflicts with authority demand extreme caution and patience.",
    Rahu:
      "Rahu antardasha in Mars mahadasha intensifies unconventional aggression and foreign property ventures. Sudden conflicts, technology-driven competition, and boundary-pushing courage emerge.",
    Ketu:
      "Ketu antardasha in Mars mahadasha can bring surgical interventions, spiritual warrior energy, and sudden detachment from competitive pursuits. Past-life martial karma surfaces for resolution.",
  },
  // ── Mercury Mahadasha ──
  Mercury: {
    Sun:
      "Sun antardasha in Mercury mahadasha brings government or official communication opportunities. Intellectual authority, administrative writing, and recognition for mental acuity are highlighted.",
    Moon:
      "Moon antardasha in Mercury mahadasha enhances creative writing, emotional storytelling, and public communication. Business related to women, liquids, or nurturing products gains momentum.",
    Mars:
      "Mars antardasha in Mercury mahadasha sharpens analytical thinking and technical communication. Engineering calculations, competitive business strategies, and assertive negotiations succeed.",
    Mercury:
      "Mercury-Mercury period maximizes intellectual output, business acumen, and communicative ability. Multiple ventures, educational achievements, and networking reach their peak simultaneously.",
    Jupiter:
      "Jupiter antardasha in Mercury mahadasha beautifully combines intellect with wisdom. Academic achievements, publishing, consulting, and teaching bring both knowledge and financial reward.",
    Venus:
      "Venus antardasha in Mercury mahadasha blends creative intelligence with aesthetic refinement. Arts, music, fashion design, and entertainment business ventures flourish with commercial success.",
    Saturn:
      "Saturn antardasha in Mercury mahadasha slows communication but deepens analytical rigor. Serious research, disciplined study, and methodical business planning yield long-term intellectual achievements.",
    Rahu:
      "Rahu antardasha in Mercury mahadasha amplifies unconventional thinking and technology-driven communication. Software development, foreign trade, and innovative business models bring breakthroughs.",
    Ketu:
      "Ketu antardasha in Mercury mahadasha may scatter mental focus but deepen intuitive knowledge. Interest in ancient languages, spiritual texts, and past-life intellectual skills awakens.",
  },
  // ── Jupiter Mahadasha ──
  Jupiter: {
    Sun:
      "Sun antardasha in Jupiter mahadasha combines wisdom with authority magnificently. Government honors, spiritual leadership, and the guru's blessing through the father create a powerful period.",
    Moon:
      "Moon antardasha in Jupiter mahadasha brings emotional wisdom, fertility blessings, and public spiritual engagement. The mother's influence aligns with dharmic growth and domestic prosperity.",
    Mars:
      "Mars antardasha in Jupiter mahadasha channels expansive energy into righteous action. Property acquisition, courageous dharmic stands, and protective leadership are strongly indicated.",
    Mercury:
      "Mercury antardasha in Jupiter mahadasha excels for education, publishing, and philosophical writing. Teaching and consulting reach their intellectual and financial peak during this sub-period.",
    Jupiter:
      "Jupiter-Jupiter period is among the most auspicious in the entire Vimshottari system. Wisdom, wealth, children, dharma, and spiritual advancement reach their highest potential simultaneously.",
    Venus:
      "Venus antardasha in Jupiter mahadasha brings a beautiful blend of wisdom and pleasure. Marriage blessings, artistic spirituality, and luxurious generosity define this harmonious sub-period.",
    Saturn:
      "Saturn antardasha in Jupiter mahadasha tests faith through responsibility and delays. Karmic lessons around dharma and discipline emerge, but perseverance through difficulty builds lasting spiritual foundations.",
    Rahu:
      "Rahu antardasha in Jupiter mahadasha may challenge traditional beliefs with foreign or unconventional philosophies. Expansion through international channels is possible, but spiritual confusion requires vigilance.",
    Ketu:
      "Ketu antardasha in Jupiter mahadasha deepens spiritual realization and detachment from material expansion. Past-life wisdom emerges, and interest in moksha intensifies beyond worldly dharma.",
  },
  // ── Venus Mahadasha ──
  Venus: {
    Sun:
      "Sun antardasha in Venus mahadasha brings creative authority and government-linked artistic opportunities. Recognition for aesthetic talent and diplomatic charm enhances public standing.",
    Moon:
      "Moon antardasha in Venus mahadasha creates deeply romantic and emotionally nurturing experiences. Domestic beauty, maternal love, and artistic sensitivity reach a harmonious crescendo.",
    Mars:
      "Mars antardasha in Venus mahadasha ignites passionate desires and luxurious property acquisitions. Romantic intensity peaks, and vehicle or real estate purchases are driven by pleasure.",
    Mercury:
      "Mercury antardasha in Venus mahadasha favors creative business ventures, fashion, and artistic communication. Entertainment industry success and intellectually charming social connections thrive.",
    Jupiter:
      "Jupiter antardasha in Venus mahadasha is supremely auspicious for marriage, wealth, and refined pleasures. Spiritual art, devotional music, and generous romantic love define this blessed period.",
    Venus:
      "Venus-Venus period maximizes all Venusian themes: love, luxury, beauty, and creative fulfillment. Marriage, artistic mastery, and material enjoyment reach their absolute zenith.",
    Saturn:
      "Saturn antardasha in Venus mahadasha brings a mix of discipline and pleasure. Relationships, creative pursuits, and financial matters come into focus, but require patience and realistic expectations.",
    Rahu:
      "Rahu antardasha in Venus mahadasha brings foreign romance, unconventional artistic ventures, and obsessive desires. Luxury through technology or international connections manifests intensely.",
    Ketu:
      "Ketu antardasha in Venus mahadasha may bring detachment from romantic pleasures and material luxury. Spiritual art, renunciation of vanity, and past-life relationship karma surface for resolution.",
  },
  // ── Saturn Mahadasha ──
  Saturn: {
    Sun:
      "Sun antardasha in Saturn mahadasha creates friction between discipline and authority. Conflicts with government or father figures arise, but earned recognition for persistent effort eventually comes.",
    Moon:
      "Moon antardasha in Saturn mahadasha may bring emotional heaviness and domestic restrictions. The mother's health or mental well-being requires attention. Emotional resilience is tested and strengthened.",
    Mars:
      "Mars antardasha in Saturn mahadasha is one of the most difficult combinations, potentially bringing accidents, legal troubles, and intense frustration. Extreme caution in physical activities is warranted.",
    Mercury:
      "Mercury antardasha in Saturn mahadasha supports disciplined intellectual work, serious research, and methodical business building. Communication may be slow but carries weight and authority.",
    Jupiter:
      "Jupiter antardasha in Saturn mahadasha eases karmic pressure through wisdom and dharma. Spiritual discipline yields results, and a balance between material duty and higher purpose is achieved.",
    Venus:
      "Venus antardasha in Saturn mahadasha gradually introduces comfort and pleasure into a period of hardship. Relationships mature, creative discipline bears fruit, and financial stability slowly improves.",
    Saturn:
      "Saturn-Saturn period intensifies all Saturnian themes: karma, delays, discipline, and transformation through hardship. This is the deepest test of patience, but emerging from it brings unshakeable strength.",
    Rahu:
      "Rahu antardasha in Saturn mahadasha brings foreign hardships, unconventional karmic experiences, and sudden structural changes. Discipline is tested by chaotic circumstances requiring adaptability.",
    Ketu:
      "Ketu antardasha in Saturn mahadasha can bring spiritual austerity, detachment from worldly structures, and resolution of deep karmic debts. Past-life patterns of suffering are finally released.",
  },
  // ── Rahu Mahadasha ──
  Rahu: {
    Sun:
      "Sun antardasha in Rahu mahadasha brings conflicts with authority and ego-driven ambitions. Foreign government connections and unconventional power moves define this sub-period.",
    Moon:
      "Moon antardasha in Rahu mahadasha creates mental confusion, foreign emotional experiences, and unusual domestic situations. Anxiety and restlessness require mindful emotional management.",
    Mars:
      "Mars antardasha in Rahu mahadasha is an explosive combination bringing sudden conflicts, technological competition, and aggressive foreign ventures. Accidents through recklessness are a key risk.",
    Mercury:
      "Mercury antardasha in Rahu mahadasha strongly favors technology, foreign trade, and innovative communication. Software, digital business, and unconventional intellectual ventures bring significant gains.",
    Jupiter:
      "Jupiter antardasha in Rahu mahadasha provides a stabilizing influence of wisdom within chaos. Foreign spiritual teachers, expansion through dharma, and philosophical clarity emerge amid worldly turbulence.",
    Venus:
      "Venus antardasha in Rahu mahadasha brings intense foreign romance, luxury obsessions, and unconventional artistic expression. Entertainment industry success in international markets is possible.",
    Saturn:
      "Saturn antardasha in Rahu mahadasha is deeply challenging, bringing structural upheaval and karmic confusion. Foreign hardships and unexpected responsibilities test endurance to its limits.",
    Rahu:
      "Rahu-Rahu period maximizes all Rahu themes: obsession, foreign involvement, sudden changes, and worldly ambition at their most intense. Material gains are possible but come with significant instability.",
    Ketu:
      "Ketu antardasha in Rahu mahadasha brings a sudden shift from worldly obsession to spiritual detachment. Past-life patterns clash with present desires, creating confusion that ultimately leads to insight.",
  },
  // ── Ketu Mahadasha ──
  Ketu: {
    Sun:
      "Sun antardasha in Ketu mahadasha may create conflicts between spiritual detachment and worldly authority. The ego dissolves, and past-life leadership karma requires conscious integration.",
    Moon:
      "Moon antardasha in Ketu mahadasha brings emotional withdrawal, psychic sensitivity, and spiritual introspection. The mother's influence wanes, and inner emotional healing takes priority over outer connection.",
    Mars:
      "Mars antardasha in Ketu mahadasha can bring sudden surgeries, spiritual warrior energy, and detachment from competitive pursuits. Past-life martial debts are resolved through courageous surrender.",
    Mercury:
      "Mercury antardasha in Ketu mahadasha may scatter intellectual focus while awakening intuitive perception. Ancient knowledge, past-life languages, and mystical communication abilities surface.",
    Jupiter:
      "Jupiter antardasha in Ketu mahadasha combines spiritual liberation with wisdom. This is an excellent sub-period for moksha, deep meditation, and understanding the higher purpose behind detachment.",
    Venus:
      "Venus antardasha in Ketu mahadasha creates tension between sensual desires and spiritual renunciation. Past-life relationship karma surfaces, and devotional art becomes a bridge between worlds.",
    Saturn:
      "Saturn antardasha in Ketu mahadasha is a deeply austere period of karmic completion. Chronic issues may surface and resolve, and the deepest layers of past-life suffering are finally transcended.",
    Rahu:
      "Rahu antardasha in Ketu mahadasha brings a bewildering clash between worldly obsession and spiritual detachment. This axis of the lunar nodes creates maximum internal tension but also the potential for profound awakening.",
    Ketu:
      "Ketu-Ketu period is the most intensely spiritual sub-period in the entire Vimshottari system. Complete detachment, mystical experiences, and dissolution of worldly identity characterize this transformative time.",
  },
};
