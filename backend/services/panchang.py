"""
Panchang (Hindu almanac) and Avakhada Chakra calculation engine.

Panchang = five limbs of the day:
  Vara (weekday), Tithi (lunar day), Nakshatra (Moon's asterism),
  Yoga (lunisolar sum), Karan (half-tithi)

Avakhada Chakra = birth details table used in Vedic matching.
"""

import swisseph as swe
import pytz
from datetime import datetime
from typing import Dict, Tuple

from services.astrology import (
    set_ayanamsha, datetime_to_jd,
    SIGN_LORDS, RASHI_NAMES, NAKSHATRA_NAMES,
)

# ---------------------------------------------------------------------------
# Lookup tables
# ---------------------------------------------------------------------------

NAKSHATRA_DATA = [
    # 0-indexed, matches NAKSHATRA_NAMES order
    {"name": "Ashwini",           "lord": "Ketu",    "varna": "Vaishya",   "vashya": "Chatushpad", "yoni": "Ashwa (Horse)",    "gan": "Deva",     "nadi": "Aadi",   "name_alphabet": ["Chu", "Che", "Cho", "La"],  "paya": "Gold"},
    {"name": "Bharani",           "lord": "Venus",   "varna": "Mleccha",   "vashya": "Manav",      "yoni": "Gaj (Elephant)",   "gan": "Manushya", "nadi": "Madhya", "name_alphabet": ["Li", "Lu", "Le", "Lo"],    "paya": "Silver"},
    {"name": "Krittika",          "lord": "Sun",     "varna": "Brahmin",   "vashya": "Chatushpad", "yoni": "Mesh (Ram)",       "gan": "Rakshasa", "nadi": "Antya",  "name_alphabet": ["A", "I", "U", "E"],        "paya": "Copper"},
    {"name": "Rohini",            "lord": "Moon",    "varna": "Shudra",    "vashya": "Chatushpad", "yoni": "Sarpa (Snake)",    "gan": "Manushya", "nadi": "Aadi",   "name_alphabet": ["O", "Va", "Vi", "Vu"],     "paya": "Gold"},
    {"name": "Mrigashira",        "lord": "Mars",    "varna": "Vaishya",   "vashya": "Chatushpad", "yoni": "Sarpa (Snake)",    "gan": "Deva",     "nadi": "Madhya", "name_alphabet": ["Ve", "Vo", "Ka", "Ki"],    "paya": "Silver"},
    {"name": "Ardra",             "lord": "Rahu",    "varna": "Mleccha",   "vashya": "Manav",      "yoni": "Shwan (Dog)",      "gan": "Manushya", "nadi": "Antya",  "name_alphabet": ["Ku", "Gha", "Ng", "Chh"], "paya": "Copper"},
    {"name": "Punarvasu",         "lord": "Jupiter", "varna": "Vaishya",   "vashya": "Chatushpad", "yoni": "Marjar (Cat)",     "gan": "Deva",     "nadi": "Aadi",   "name_alphabet": ["Ke", "Ko", "Ha", "Hi"],    "paya": "Gold"},
    {"name": "Pushya",            "lord": "Saturn",  "varna": "Kshatriya", "vashya": "Chatushpad", "yoni": "Mesh (Ram)",       "gan": "Deva",     "nadi": "Madhya", "name_alphabet": ["Hu", "He", "Ho", "Da"],    "paya": "Silver"},
    {"name": "Ashlesha",          "lord": "Mercury", "varna": "Mleccha",   "vashya": "Jalchar",    "yoni": "Marjar (Cat)",     "gan": "Rakshasa", "nadi": "Antya",  "name_alphabet": ["Di", "Du", "De", "Do"],    "paya": "Copper"},
    {"name": "Magha",             "lord": "Ketu",    "varna": "Kshatriya", "vashya": "Chatushpad", "yoni": "Mushak (Rat)",     "gan": "Rakshasa", "nadi": "Aadi",   "name_alphabet": ["Ma", "Mi", "Mu", "Me"],    "paya": "Gold"},
    {"name": "Purva Phalguni",    "lord": "Venus",   "varna": "Brahmin",   "vashya": "Manav",      "yoni": "Mushak (Rat)",     "gan": "Manushya", "nadi": "Madhya", "name_alphabet": ["Mo", "Ta", "Ti", "Tu"],    "paya": "Silver"},
    {"name": "Uttara Phalguni",   "lord": "Sun",     "varna": "Kshatriya", "vashya": "Manav",      "yoni": "Gau (Cow)",        "gan": "Manushya", "nadi": "Antya",  "name_alphabet": ["Te", "To", "Pa", "Pi"],    "paya": "Copper"},
    {"name": "Hasta",             "lord": "Moon",    "varna": "Vaishya",   "vashya": "Chatushpad", "yoni": "Mahish (Buffalo)", "gan": "Deva",     "nadi": "Aadi",   "name_alphabet": ["Pu", "Sha", "Na", "Tha"],  "paya": "Gold"},
    {"name": "Chitra",            "lord": "Mars",    "varna": "Vaishya",   "vashya": "Chatushpad", "yoni": "Vyaghra (Tiger)",  "gan": "Rakshasa", "nadi": "Madhya", "name_alphabet": ["Pe", "Po", "Ra", "Ri"],    "paya": "Silver"},
    {"name": "Swati",             "lord": "Rahu",    "varna": "Mleccha",   "vashya": "Chatushpad", "yoni": "Mahish (Buffalo)", "gan": "Deva",     "nadi": "Antya",  "name_alphabet": ["Ru", "Re", "Ro", "Ta"],    "paya": "Copper"},
    {"name": "Vishakha",          "lord": "Jupiter", "varna": "Mleccha",   "vashya": "Manav",      "yoni": "Vyaghra (Tiger)",  "gan": "Rakshasa", "nadi": "Aadi",   "name_alphabet": ["Ti", "Tu", "Te", "To"],    "paya": "Gold"},
    {"name": "Anuradha",          "lord": "Saturn",  "varna": "Shudra",    "vashya": "Jalchar",    "yoni": "Mrig (Deer)",      "gan": "Deva",     "nadi": "Madhya", "name_alphabet": ["Na", "Ni", "Nu", "Ne"],    "paya": "Silver"},
    {"name": "Jyeshtha",          "lord": "Mercury", "varna": "Vaishya",   "vashya": "Manav",      "yoni": "Mrig (Deer)",      "gan": "Rakshasa", "nadi": "Antya",  "name_alphabet": ["No", "Ya", "Yi", "Yu"],    "paya": "Copper"},
    {"name": "Mula",              "lord": "Ketu",    "varna": "Mleccha",   "vashya": "Chatushpad", "yoni": "Shwan (Dog)",      "gan": "Rakshasa", "nadi": "Aadi",   "name_alphabet": ["Ye", "Yo", "Bha", "Bhi"], "paya": "Gold"},
    {"name": "Purva Ashadha",     "lord": "Venus",   "varna": "Brahmin",   "vashya": "Manav",      "yoni": "Nar (Monkey)",     "gan": "Manushya", "nadi": "Madhya", "name_alphabet": ["Bhu", "Dha", "Pha", "Dha"],"paya": "Silver"},
    {"name": "Uttara Ashadha",    "lord": "Sun",     "varna": "Kshatriya", "vashya": "Manav",      "yoni": "Nar (Monkey)",     "gan": "Manushya", "nadi": "Antya",  "name_alphabet": ["Bhe", "Bho", "Ja", "Ji"],  "paya": "Copper"},
    {"name": "Shravana",          "lord": "Moon",    "varna": "Mleccha",   "vashya": "Manav",      "yoni": "Vanar (Monkey)",   "gan": "Deva",     "nadi": "Aadi",   "name_alphabet": ["Khi", "Khu", "Khe", "Kho"],"paya": "Gold"},
    {"name": "Dhanishtha",        "lord": "Mars",    "varna": "Vaishya",   "vashya": "Chatushpad", "yoni": "Simha (Lion)",     "gan": "Rakshasa", "nadi": "Madhya", "name_alphabet": ["Ga", "Gi", "Gu", "Ge"],    "paya": "Silver"},
    {"name": "Shatabhisha",       "lord": "Rahu",    "varna": "Mleccha",   "vashya": "Jalchar",    "yoni": "Ashwa (Horse)",    "gan": "Rakshasa", "nadi": "Antya",  "name_alphabet": ["Go", "Sa", "Si", "Su"],    "paya": "Copper"},
    {"name": "Purva Bhadrapada",  "lord": "Jupiter", "varna": "Brahmin",   "vashya": "Manav",      "yoni": "Simha (Lion)",     "gan": "Manushya", "nadi": "Aadi",   "name_alphabet": ["Se", "So", "Da", "Di"],    "paya": "Gold"},
    {"name": "Uttara Bhadrapada", "lord": "Saturn",  "varna": "Kshatriya", "vashya": "Manav",      "yoni": "Gau (Cow)",        "gan": "Manushya", "nadi": "Madhya", "name_alphabet": ["Du", "Tha", "Jha", "Da"],  "paya": "Silver"},
    {"name": "Revati",            "lord": "Mercury", "varna": "Shudra",    "vashya": "Jalchar",    "yoni": "Gaj (Elephant)",   "gan": "Deva",     "nadi": "Antya",  "name_alphabet": ["De", "Do", "Cha", "Chi"],  "paya": "Copper"},
]

TITHI_DATA = [
    {"num": 1,  "name": "Pratipada",  "lord": "Agni",      "paksha": "Shukla"},
    {"num": 2,  "name": "Dwitiya",    "lord": "Brahma",    "paksha": "Shukla"},
    {"num": 3,  "name": "Tritiya",    "lord": "Gauri",     "paksha": "Shukla"},
    {"num": 4,  "name": "Chaturthi",  "lord": "Ganesha",   "paksha": "Shukla"},
    {"num": 5,  "name": "Panchami",   "lord": "Naga",      "paksha": "Shukla"},
    {"num": 6,  "name": "Shashthi",   "lord": "Kartika",   "paksha": "Shukla"},
    {"num": 7,  "name": "Saptami",    "lord": "Surya",     "paksha": "Shukla"},
    {"num": 8,  "name": "Ashtami",    "lord": "Shiva",     "paksha": "Shukla"},
    {"num": 9,  "name": "Navami",     "lord": "Durga",     "paksha": "Shukla"},
    {"num": 10, "name": "Dashami",    "lord": "Yama",      "paksha": "Shukla"},
    {"num": 11, "name": "Ekadashi",   "lord": "Vishnu",    "paksha": "Shukla"},
    {"num": 12, "name": "Dwadashi",   "lord": "Hari",      "paksha": "Shukla"},
    {"num": 13, "name": "Trayodashi", "lord": "Kama",      "paksha": "Shukla"},
    {"num": 14, "name": "Chaturdashi","lord": "Shiva",     "paksha": "Shukla"},
    {"num": 15, "name": "Purnima",    "lord": "Chandra",   "paksha": "Shukla"},
    {"num": 16, "name": "Pratipada",  "lord": "Agni",      "paksha": "Krishna"},
    {"num": 17, "name": "Dwitiya",    "lord": "Brahma",    "paksha": "Krishna"},
    {"num": 18, "name": "Tritiya",    "lord": "Gauri",     "paksha": "Krishna"},
    {"num": 19, "name": "Chaturthi",  "lord": "Ganesha",   "paksha": "Krishna"},
    {"num": 20, "name": "Panchami",   "lord": "Naga",      "paksha": "Krishna"},
    {"num": 21, "name": "Shashthi",   "lord": "Kartika",   "paksha": "Krishna"},
    {"num": 22, "name": "Saptami",    "lord": "Surya",     "paksha": "Krishna"},
    {"num": 23, "name": "Ashtami",    "lord": "Shiva",     "paksha": "Krishna"},
    {"num": 24, "name": "Navami",     "lord": "Durga",     "paksha": "Krishna"},
    {"num": 25, "name": "Dashami",    "lord": "Yama",      "paksha": "Krishna"},
    {"num": 26, "name": "Ekadashi",   "lord": "Vishnu",    "paksha": "Krishna"},
    {"num": 27, "name": "Dwadashi",   "lord": "Hari",      "paksha": "Krishna"},
    {"num": 28, "name": "Trayodashi", "lord": "Kama",      "paksha": "Krishna"},
    {"num": 29, "name": "Chaturdashi","lord": "Shiva",     "paksha": "Krishna"},
    {"num": 30, "name": "Amavasya",   "lord": "Pitru",     "paksha": "Krishna"},
]

CHARA_KARANA = [
    {"name": "Bava",    "lord": "Indra",   "type": "Chara"},
    {"name": "Balava",  "lord": "Brahma",  "type": "Chara"},
    {"name": "Kaulava", "lord": "Mitra",   "type": "Chara"},
    {"name": "Taitila", "lord": "Aryama",  "type": "Chara"},
    {"name": "Gara",    "lord": "Bhumi",   "type": "Chara"},
    {"name": "Vanija",  "lord": "Lakshmi", "type": "Chara"},
    {"name": "Vishti",  "lord": "Yama",    "type": "Chara"},  # Bhadra — inauspicious
]
STHIRA_KARANA = {
    0:  {"name": "Kimstughna",  "lord": "Vishnu", "type": "Sthira"},  # 1st half of Shukla Pratipada
    57: {"name": "Shakuni",     "lord": "Indra",  "type": "Sthira"},
    58: {"name": "Chatushpada", "lord": "Mahesh", "type": "Sthira"},
    59: {"name": "Naga",        "lord": "Naga",   "type": "Sthira"},
}

YOGA_DATA = [
    {"name": "Vishkambha",  "nature": "Inauspicious"},
    {"name": "Priti",       "nature": "Auspicious"},
    {"name": "Ayushman",    "nature": "Auspicious"},
    {"name": "Saubhagya",   "nature": "Auspicious"},
    {"name": "Shobhana",    "nature": "Auspicious"},
    {"name": "Atiganda",    "nature": "Inauspicious"},
    {"name": "Sukarman",    "nature": "Auspicious"},
    {"name": "Dhriti",      "nature": "Auspicious"},
    {"name": "Shula",       "nature": "Inauspicious"},
    {"name": "Ganda",       "nature": "Inauspicious"},
    {"name": "Vriddhi",     "nature": "Auspicious"},
    {"name": "Dhruva",      "nature": "Auspicious"},
    {"name": "Vyaghata",    "nature": "Inauspicious"},
    {"name": "Harshana",    "nature": "Auspicious"},
    {"name": "Vajra",       "nature": "Inauspicious"},
    {"name": "Siddhi",      "nature": "Auspicious"},
    {"name": "Vyatipata",   "nature": "Highly Inauspicious"},
    {"name": "Variyana",    "nature": "Auspicious"},
    {"name": "Parigha",     "nature": "Inauspicious"},
    {"name": "Shiva",       "nature": "Auspicious"},
    {"name": "Siddha",      "nature": "Auspicious"},
    {"name": "Sadhya",      "nature": "Auspicious"},
    {"name": "Shubha",      "nature": "Auspicious"},
    {"name": "Shukla",      "nature": "Auspicious"},
    {"name": "Brahma",      "nature": "Auspicious"},
    {"name": "Indra",       "nature": "Auspicious"},
    {"name": "Vaidhriti",   "nature": "Highly Inauspicious"},
]

VARA_DATA = [
    {"name": "Sunday",    "lord": "Sun"},
    {"name": "Monday",    "lord": "Moon"},
    {"name": "Tuesday",   "lord": "Mars"},
    {"name": "Wednesday", "lord": "Mercury"},
    {"name": "Thursday",  "lord": "Jupiter"},
    {"name": "Friday",    "lord": "Venus"},
    {"name": "Saturday",  "lord": "Saturn"},
]

RASHI_TATVA = {
    1: "Fire", 2: "Earth", 3: "Air",   4: "Water",
    5: "Fire", 6: "Earth", 7: "Air",   8: "Water",
    9: "Fire", 10: "Earth", 11: "Air", 12: "Water",
}

RASHI_VARNA = {
    1: "Kshatriya", 2: "Vaishya",   3: "Shudra",    4: "Brahmin",
    5: "Kshatriya", 6: "Vaishya",   7: "Shudra",    8: "Brahmin",
    9: "Kshatriya", 10: "Vaishya",  11: "Shudra",   12: "Brahmin",
}

# ---------------------------------------------------------------------------
# Interpretation strings
# ---------------------------------------------------------------------------

TITHI_INTERP = {
    "Pratipada":   "Pratipada (1st lunar day) is auspicious for new beginnings, starting ventures, and initiating auspicious work. It is governed by Agni (fire), symbolising energy and transformation.",
    "Dwitiya":     "Dwitiya (2nd lunar day) favours creative work, travel, and diplomacy. Governed by Brahma, it is an excellent day for building, planning, and laying foundations.",
    "Tritiya":     "Tritiya (3rd lunar day) is ruled by Gauri and is considered highly auspicious for ceremonies, celebrations, and beautification. Good for weddings and social activities.",
    "Chaturthi":   "Chaturthi (4th lunar day) is sacred to Ganesha, the remover of obstacles. Prayers and spiritual practices on this day are especially powerful for overcoming challenges.",
    "Panchami":    "Panchami (5th lunar day) is ruled by Naga (serpent deity). Favours learning, the arts, and healing activities. Nagas represent wisdom and transformation.",
    "Shashthi":    "Shashthi (6th lunar day) is associated with Kartika (Skanda). Favours activities related to children, courage, and leadership. Generally auspicious for health matters.",
    "Saptami":     "Saptami (7th lunar day) is ruled by Surya (Sun). Excellent for activities involving fire, leadership, government, and father figures. Good for health routines.",
    "Ashtami":     "Ashtami (8th lunar day) is sacred to Shiva and associated with Durga. It carries transformative energy — powerful for spiritual practice but challenges need care.",
    "Navami":      "Navami (9th lunar day) is ruled by Durga. Highly energetic and intense. Good for spiritual pursuits and worship but can bring confrontations if not handled mindfully.",
    "Dashami":     "Dashami (10th lunar day) is ruled by Yama and is considered auspicious for ancestors, dharmic activities, and honouring elders. Good for completion of tasks.",
    "Ekadashi":    "Ekadashi (11th lunar day) is sacred to Vishnu and is one of the most spiritually significant tithis. Fasting and devotion on Ekadashi is believed to bestow liberation.",
    "Dwadashi":    "Dwadashi (12th lunar day) is ruled by Hari (Vishnu). Breaking Ekadashi fast on Dwadashi is auspicious. Good for charity, service, and spiritual merit.",
    "Trayodashi":  "Trayodashi (13th lunar day) is ruled by Kama and is associated with joy, love, and prosperity. Good for romantic endeavours, artistic expression, and celebrations.",
    "Chaturdashi":  "Chaturdashi (14th lunar day) is ruled by Shiva and carries intense spiritual energy. The day before new/full moon is powerful for worship but needs caution for new ventures.",
    "Purnima":     "Purnima (Full Moon) is one of the most auspicious tithis. The Moon is at full strength, amplifying emotions, intuition, and spiritual power. Excellent for meditation and gratitude.",
    "Amavasya":    "Amavasya (New Moon) is sacred for ancestor worship (Pitru Tarpan). A day of introspection, rest, and deep spirituality. New beginnings are best avoided.",
}

KARAN_INTERP = {
    "Bava":         "Bava Karan is ruled by Indra and is generally auspicious. Activities started during this karan tend to bring success, especially in leadership and social endeavours.",
    "Balava":       "Balava Karan is ruled by Brahma and is very auspicious for creative, educational, and spiritual activities. Good for starting new projects.",
    "Kaulava":      "Kaulava Karan is ruled by Mitra (a solar deity). Favours social harmony, partnerships, and diplomatic activities. Good for forming agreements.",
    "Taitila":      "Taitila Karan is ruled by Aryama and is auspicious for most activities. Good for travel, commerce, and all kinds of worldly pursuits.",
    "Gara":         "Gara Karan is ruled by Bhumi (Earth) and is auspicious for agricultural work, property matters, and grounding activities. Stable and productive.",
    "Vanija":       "Vanija Karan is ruled by Lakshmi (goddess of wealth) and is highly auspicious for trade, business, and financial activities. Excellent for commercial ventures.",
    "Vishti":       "Vishti (Bhadra) Karan is ruled by Yama and is considered inauspicious. Starting important activities should be avoided during this half-tithi.",
    "Shakuni":      "Shakuni Karan is a fixed (Sthira) karan occurring at the 2nd half of Krishna Chaturdashi. It is generally considered inauspicious for auspicious ceremonies.",
    "Chatushpada":  "Chatushpada Karan is a fixed karan occurring at the 1st half of Amavasya (New Moon). Associated with quadruped animals; considered inauspicious for important ventures.",
    "Naga":         "Naga Karan is a fixed karan occurring at the 2nd half of Amavasya. Associated with serpent deities. Deeply spiritual energy; good for occult practices but not worldly matters.",
    "Kimstughna":   "Kimstughna is the fixed karan of the 1st half of Shukla Pratipada (just after New Moon). It signifies the very beginning of the lunar cycle — auspicious for fresh starts.",
}

YOGA_INTERP = {
    "Vishkambha":  "Vishkambha Yoga is generally inauspicious. Activities initiated during this yoga may face obstacles. It is, however, suitable for charitable work and spiritual practice.",
    "Priti":       "Priti (love) Yoga is auspicious for relationships, romantic activities, and social bonding. Those born under this yoga are affectionate and popular.",
    "Ayushman":    "Ayushman (long life) Yoga brings vitality and longevity. Excellent for health-related activities and for people seeking longevity and physical wellbeing.",
    "Saubhagya":   "Saubhagya (good fortune) Yoga is very auspicious, bringing luck, prosperity, and happiness. Activities begun under this yoga tend to be blessed.",
    "Shobhana":    "Shobhana (splendour) Yoga brings beauty, radiance, and auspiciousness. Excellent for ceremonies, artistic endeavours, and all beautiful things.",
    "Atiganda":    "Atiganda Yoga can bring sudden events and challenges. One should proceed cautiously with new ventures. Beneficial for courage and resolving conflicts.",
    "Sukarman":    "Sukarman (good deeds) Yoga is highly auspicious for performing righteous acts, charitable work, and spiritual activities. Karma is especially powerful here.",
    "Dhriti":      "Dhriti (courage and determination) Yoga gives strength, resolve, and leadership. People born under this yoga are resilient and determined.",
    "Shula":       "Shula (thorn) Yoga brings challenges and requires patience. Not ideal for new ventures, but good for facing obstacles with determination and resolving disputes.",
    "Ganda":       "Ganda Yoga is inauspicious for auspicious beginnings. It can bring stress and complications. Suitable for persistence and for addressing long-standing problems.",
    "Vriddhi":     "Vriddhi (growth) Yoga promotes increase, expansion, and abundance. Excellent for business growth, investments, and all activities involving expansion.",
    "Dhruva":      "Dhruva (fixed, steadfast) Yoga brings stability and permanence. Good for foundations, long-term projects, property, and activities requiring lasting results.",
    "Vyaghata":    "Vyaghata Yoga can bring sudden and unexpected events. Proceed cautiously with new beginnings; good for overcoming challenges with bold action.",
    "Harshana":    "Harshana (joy and delight) Yoga brings happiness, celebration, and pleasurable experiences. Auspicious for social events, entertainment, and romance.",
    "Vajra":       "Vajra Yoga carries lightning-like energy — powerful but potentially disruptive. Good for bold action but challenging for delicate or peaceful endeavours.",
    "Siddhi":      "Siddhi (accomplishment) Yoga is highly auspicious, bringing success and the achievement of goals. One of the best yogas for initiating important work.",
    "Vyatipata":   "Vyatipata is one of the most inauspicious yogas. Activities started during this yoga are said to be destroyed. Spiritual practice, however, is greatly amplified.",
    "Variyana":    "Variyana Yoga brings comfort, rest, and enjoyment. Good for recreation, healing, and rejuvenation. Auspicious for pleasurable activities.",
    "Parigha":     "Parigha Yoga creates barriers and delays. Patience is required for tasks begun now. Suitable for spiritual retreat and addressing obstacles.",
    "Shiva":       "Shiva Yoga is highly auspicious, associated with the blessings of Lord Shiva. Excellent for worship, meditation, and profound spiritual transformation.",
    "Siddha":      "Siddha Yoga brings the power of accomplishment and spiritual attainment. Highly favourable for new ventures, spiritual practice, and all auspicious work.",
    "Sadhya":      "Sadhya Yoga is favourable for goal-setting, study, and all activities aimed at self-improvement and achievement. Good for learning and mastery.",
    "Shubha":      "Shubha (auspicious) Yoga is very favourable for all auspicious activities, ceremonies, marriages, and celebrations. Good fortune accompanies activities begun now.",
    "Shukla":      "Shukla (bright, pure) Yoga brings clarity, purity, and brightness. Good for learning, spiritual practice, and activities requiring clear thinking.",
    "Brahma":      "Brahma Yoga bestows the blessings of Brahma (the creator). Highly auspicious for learning, teaching, creative work, and all kinds of auspicious beginnings.",
    "Indra":       "Indra Yoga brings power, success, wealth, and authority. Blessed by the king of the gods, activities under this yoga tend towards victory and recognition.",
    "Vaidhriti":   "Vaidhriti Yoga is highly inauspicious. Important activities should be avoided. It is, however, a powerful time for deep spiritual practice and letting go.",
}

VARA_INTERP = {
    "Sunday":    "Sunday (Ravivara) is ruled by the Sun. Auspicious for government work, authority matters, health, and activities involving the father or employer. Gold-coloured items and eastern direction are favoured.",
    "Monday":    "Monday (Somavara) is ruled by the Moon. Excellent for emotional, nurturing activities, water-related matters, travel, and spiritual practice. White items and north-western direction are favoured.",
    "Tuesday":   "Tuesday (Mangalavara) is ruled by Mars. Good for courage, physical work, sports, surgery, and resolving conflicts. Red items and southern direction are favoured.",
    "Wednesday": "Wednesday (Budhavara) is ruled by Mercury. Excellent for trade, education, writing, communication, and intellectual activities. Green items and northern direction are favoured.",
    "Thursday":  "Thursday (Guruvara) is ruled by Jupiter. The most auspicious day for religious ceremonies, spiritual learning, marriage, and all dharmic activities. Yellow items and north-eastern direction are favoured.",
    "Friday":    "Friday (Shukravara) is ruled by Venus. Excellent for romance, marriage, creative arts, luxury, and beauty-related activities. White or multi-coloured items and south-eastern direction are favoured.",
    "Saturday":  "Saturday (Shanivara) is ruled by Saturn. Good for disciplined work, service, and long-term projects. Some traditions consider it challenging for auspicious beginnings. Black or blue items and western direction are favoured.",
}

AVAKHADA_INTERP = {
    "varna": {
        "Brahmin":   "Brahmin Varna indicates a soul oriented towards knowledge, spirituality, teaching, and wisdom. The native is naturally inclined towards learning, philosophy, and the sacred arts.",
        "Kshatriya": "Kshatriya Varna indicates a soul oriented towards courage, leadership, protection, and honour. The native is naturally inclined towards authority, athletics, and righteous action.",
        "Vaishya":   "Vaishya Varna indicates a soul oriented towards commerce, prosperity, and material wellbeing. The native is naturally inclined towards trade, agriculture, and building wealth.",
        "Shudra":    "Shudra Varna indicates a soul oriented towards service, craftsmanship, and practical work. The native finds fulfilment in skilled work, community service, and supporting others.",
        "Mleccha":   "Mleccha in the Avakhada context indicates unconventional or non-traditional tendencies. The native may have independent, boundary-crossing qualities that don't fit standard categories.",
    },
    "gan": {
        "Deva":     "Deva Gan (divine temperament) indicates a noble, gentle, and virtuous nature. The native tends toward godliness — being generous, truthful, pure-hearted, and spiritually inclined. In compatibility, Deva Gan is compatible with Deva and Manushya partners.",
        "Manushya": "Manushya Gan (human temperament) indicates a balanced, practical, and worldly nature. The native is emotionally complex, driven by human desires and ambitions. Compatible with both Deva and Manushya partners in general.",
        "Rakshasa":  "Rakshasa Gan (forceful temperament) indicates a strong, intense, and powerful nature. The native is bold, passionate, and determined — sometimes unconventional or forceful. Ideal in compatibility with another Rakshasa partner.",
    },
    "nadi": {
        "Aadi":   "Aadi Nadi (Vata/Air constitution) indicates a Vata body type — quick, creative, mobile, and sensitive. In Nadi Dosha assessment, two people with the same Nadi should avoid marriage as it can create health and progeny challenges.",
        "Madhya":  "Madhya Nadi (Pitta/Fire constitution) indicates a Pitta body type — passionate, sharp, and transformative. Nadi compatibility is a key factor in marriage matching; same Nadi is traditionally considered inauspicious.",
        "Antya":   "Antya Nadi (Kapha/Water-Earth constitution) indicates a Kapha body type — stable, nurturing, and enduring. In compatibility, the same Nadi between partners is traditionally a significant concern.",
    },
    "yoni": {
        "Ashwa (Horse)":    "Ashwa Yoni (horse) indicates a high-energy, free-spirited, and adventurous nature. The native is dynamic, quick, and loves freedom. In compatibility, compatible with Ashwa and neutral with others.",
        "Gaj (Elephant)":   "Gaj Yoni (elephant) indicates a regal, powerful, and patient nature. The native is wise, dignified, and protective — a natural leader who values loyalty.",
        "Mesh (Ram)":       "Mesh Yoni (ram) indicates a bold, determined, and pioneering nature. The native is headstrong, courageous, and driven — willing to push through obstacles.",
        "Sarpa (Snake)":    "Sarpa Yoni (snake) indicates a sharp, intuitive, and transformative nature. The native is perceptive, resourceful, and can be deeply spiritual or intensely worldly.",
        "Shwan (Dog)":      "Shwan Yoni (dog) indicates a loyal, protective, and devoted nature. The native is faithful, service-oriented, and values deep connections and belonging.",
        "Marjar (Cat)":     "Marjar Yoni (cat) indicates an independent, graceful, and adaptable nature. The native values autonomy, has sharp instincts, and is both self-reliant and charming.",
        "Mahish (Buffalo)": "Mahish Yoni (buffalo) indicates a strong, grounded, and patient nature. The native is hardworking, reliable, and persevering — built for endurance.",
        "Vyaghra (Tiger)":  "Vyaghra Yoni (tiger) indicates a powerful, commanding, and passionate nature. The native is bold, intense, and natural-born leader with great presence.",
        "Nar (Monkey)":     "Nar Yoni (monkey) indicates a clever, curious, and adaptable nature. The native is intelligent, sociable, and enjoys variety, learning, and mental stimulation.",
        "Simha (Lion)":     "Simha Yoni (lion) indicates a regal, courageous, and dignified nature. The native carries natural authority, pride, and a generous, big-hearted spirit.",
        "Mrig (Deer)":      "Mrig Yoni (deer) indicates a gentle, sensitive, and graceful nature. The native is kind, artistic, and perceptive — they thrive in peaceful, beautiful environments.",
        "Gau (Cow)":        "Gau Yoni (cow) indicates a nurturing, patient, and abundant nature. The native is generous, giving, and naturally supportive — associated with fertility and prosperity.",
        "Vanar (Monkey)":   "Vanar Yoni indicates playfulness, curiosity, and social intelligence. Similar to Nar, it brings adaptability and wit.",
        "Mushak (Rat)":     "Mushak Yoni (rat) indicates a resourceful, enterprising, and shrewd nature. The native is clever, finds opportunities others miss, and is often lucky in practical matters.",
    },
    "paya": {
        "Gold":   "Gold Paya (Swarna Paya) is the most auspicious. Natives born under Gold Paya are believed to be blessed with prosperity, good health, and noble qualities. Life tends to bring genuine happiness and spiritual growth.",
        "Silver": "Silver Paya (Rajat Paya) is auspicious. Natives are generally content, socially harmonious, and enjoy material comforts. Life has a pleasant and balanced quality.",
        "Copper": "Copper Paya (Tamra Paya) is moderate. Natives may face certain challenges but are resilient and industrious. Hard work leads to solid results.",
        "Iron":   "Iron Paya (Loha Paya) indicates a life requiring effort, discipline, and patience. Challenges build character and strength; the native develops resilience through experience.",
    },
}

# ---------------------------------------------------------------------------
# Calculation helpers
# ---------------------------------------------------------------------------

_TITHI_NATURE = {
    1: "Nanda", 2: "Bhadra", 3: "Jaya", 4: "Rikta", 5: "Purna",
    6: "Nanda", 7: "Bhadra", 8: "Jaya", 9: "Rikta", 10: "Purna",
    11: "Nanda", 12: "Bhadra", 13: "Jaya", 14: "Rikta", 15: "Purna",
    16: "Nanda", 17: "Bhadra", 18: "Jaya", 19: "Rikta", 20: "Purna",
    21: "Nanda", 22: "Bhadra", 23: "Jaya", 24: "Rikta", 25: "Purna",
    26: "Nanda", 27: "Bhadra", 28: "Jaya", 29: "Rikta", 30: "Purna",
}


def _calculate_tithi(sun_lon: float, moon_lon: float) -> dict:
    diff = (moon_lon - sun_lon) % 360
    tithi_num = int(diff / 12) + 1
    tithi_num = max(1, min(30, tithi_num))
    entry = TITHI_DATA[tithi_num - 1]
    return {
        "number": tithi_num,
        "name": entry["name"],
        "paksha": entry["paksha"],
        "nature": _TITHI_NATURE.get(tithi_num, ""),
        "deity": entry["lord"],
        "interpretation": TITHI_INTERP.get(entry["name"], ""),
    }


def _calculate_karan(sun_lon: float, moon_lon: float) -> dict:
    diff = (moon_lon - sun_lon) % 360
    half_num = int(diff / 6)  # 0–59
    half_num = min(half_num, 59)

    if half_num in STHIRA_KARANA:
        entry = STHIRA_KARANA[half_num]
        is_chara = False
    else:
        entry = CHARA_KARANA[(half_num - 1) % 7]
        is_chara = True

    nature = "Inauspicious" if entry["name"] == "Vishti" else "Auspicious"
    return {
        "name": entry["name"],
        "number": half_num + 1,
        "is_chara": is_chara,
        "nature": nature,
        "interpretation": KARAN_INTERP.get(entry["name"], ""),
    }


def _calculate_yoga(sun_lon: float, moon_lon: float) -> dict:
    yoga_lon = (sun_lon + moon_lon) % 360
    yoga_index = min(int(yoga_lon / (360 / 27)), 26)
    entry = YOGA_DATA[yoga_index]
    return {
        "number": yoga_index + 1,
        "name": entry["name"],
        "nature": entry["nature"],
        "interpretation": YOGA_INTERP.get(entry["name"], ""),
    }


def _calculate_nakshatra(moon_lon: float) -> Tuple[dict, int, int]:
    """Returns (nakshatra_result_dict, nak_index, pada)."""
    nak_size = 360.0 / 27
    nak_index = min(int(moon_lon / nak_size), 26)
    remainder = moon_lon - nak_index * nak_size
    pada = min(int(remainder / (nak_size / 4)) + 1, 4)
    data = NAKSHATRA_DATA[nak_index]
    return {
        "name": data["name"],
        "number": nak_index + 1,
        "lord": data["lord"],
        "pada": pada,
        "interpretation": (
            f"{data['name']} nakshatra is ruled by {data['lord']}. "
            f"It belongs to the {data['gan']} Gan with {data['nadi']} Nadi. "
            f"The Yoni is {data['yoni']}, reflecting the soul's instinctual nature. "
            f"The name alphabet suggested for this pada ({pada}) is '{data['name_alphabet'][pada - 1]}'."
        ),
    }, nak_index, pada


def _calculate_vara(jd: float) -> dict:
    weekday = int(jd + 1.5) % 7  # 0=Sunday
    entry = VARA_DATA[weekday]
    return {
        "name": entry["name"],
        "lord": entry["lord"],
        "number": weekday,
        "interpretation": VARA_INTERP.get(entry["name"], ""),
    }


def _calculate_sunrise_sunset(jd: float, lat: float, lng: float, tz_str: str) -> dict:
    try:
        geopos = (lng, lat, 0.0)
        atpress, attemp = 1013.25, 15.0

        ret_rise, t_rise = swe.rise_trans(
            jd - 0.5, swe.SUN, swe.CALC_RISE, geopos, atpress, attemp, swe.FLG_SWIEPH
        )
        ret_set, t_set = swe.rise_trans(
            jd - 0.5, swe.SUN, swe.CALC_SET, geopos, atpress, attemp, swe.FLG_SWIEPH
        )

        def jd_to_times(jd_ut: float):
            tz = pytz.timezone(tz_str)
            y, mo, d, h, mn, s = swe.jdut1_to_utc(jd_ut, 1)
            dt_utc = datetime(y, mo, d, h, mn, tzinfo=pytz.utc)
            dt_local = dt_utc.astimezone(tz)
            return dt_utc.strftime("%H:%M"), dt_local.strftime("%H:%M")

        if ret_rise == 0:
            sunrise_utc, sunrise_local = jd_to_times(t_rise[0])
        else:
            sunrise_utc = sunrise_local = None

        if ret_set == 0:
            sunset_utc, sunset_local = jd_to_times(t_set[0])
        else:
            sunset_utc = sunset_local = None

        return {
            "sunrise_utc": sunrise_utc,
            "sunset_utc": sunset_utc,
            "sunrise_local": sunrise_local,
            "sunset_local": sunset_local,
        }
    except Exception:
        return {"sunrise_utc": None, "sunset_utc": None, "sunrise_local": None, "sunset_local": None}


def _yunja(nak_index: int) -> str:
    if nak_index < 9:   return "Aadi"
    if nak_index < 18:  return "Madhya"
    return "Antya"


def _calculate_avakhada(
    moon_lon: float, nak_index: int, moon_rashi_num: int, pada: int,
    tithi_name: str, karan_name: str, yoga_name: str,
) -> dict:
    nak = NAKSHATRA_DATA[nak_index]
    return {
        "varna":            RASHI_VARNA[moon_rashi_num],
        "vashya":           nak["vashya"],
        "yoni":             nak["yoni"],
        "gan":              nak["gan"],
        "nadi":             nak["nadi"],
        "moon_sign":        RASHI_NAMES[moon_rashi_num - 1],
        "sign_lord":        SIGN_LORDS[moon_rashi_num],
        "nakshatra":        nak["name"],
        "nakshatra_charan": pada,
        "yoga":             yoga_name,
        "karan":            karan_name,
        "tithi":            tithi_name,
        "yunja":            _yunja(nak_index),
        "tatva":            RASHI_TATVA[moon_rashi_num],
        "name_alphabet":    [nak["name_alphabet"][pada - 1]],
        "paya":             nak["paya"],
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def calculate_panchang(
    utc_dt: datetime,
    lat: float,
    lng: float,
    tz_str: str,
    ayanamsha: str = "lahiri",
) -> dict:
    jd = datetime_to_jd(utc_dt)
    set_ayanamsha(ayanamsha)

    flag = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    sun_result, _ = swe.calc_ut(jd, swe.SUN, flag)
    moon_result, _ = swe.calc_ut(jd, swe.MOON, flag)
    sun_lon = sun_result[0] % 360
    moon_lon = moon_result[0] % 360

    moon_rashi_num = int(moon_lon // 30) + 1

    tithi = _calculate_tithi(sun_lon, moon_lon)
    karan = _calculate_karan(sun_lon, moon_lon)
    yoga = _calculate_yoga(sun_lon, moon_lon)
    nakshatra, nak_index, pada = _calculate_nakshatra(moon_lon)
    vara = _calculate_vara(jd)
    sun_times = _calculate_sunrise_sunset(jd, lat, lng, tz_str)
    avakhada = _calculate_avakhada(
        moon_lon, nak_index, moon_rashi_num, pada,
        tithi_name=tithi["name"],
        karan_name=karan["name"],
        yoga_name=yoga["name"],
    )

    avakhada_interpretations = {
        "varna": AVAKHADA_INTERP["varna"].get(avakhada["varna"], ""),
        "gan":   AVAKHADA_INTERP["gan"].get(avakhada["gan"], ""),
        "nadi":  AVAKHADA_INTERP["nadi"].get(avakhada["nadi"], ""),
        "yoni":  AVAKHADA_INTERP["yoni"].get(avakhada["yoni"], ""),
        "paya":  AVAKHADA_INTERP["paya"].get(avakhada["paya"], ""),
    }

    return {
        "tithi":                    tithi,
        "karan":                    karan,
        "yoga":                     yoga,
        "nakshatra":                nakshatra,
        "vara":                     vara,
        "sun_times":                sun_times,
        "avakhada":                 avakhada,
        "avakhada_interpretations": avakhada_interpretations,
    }
