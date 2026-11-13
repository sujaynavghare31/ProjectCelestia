/**
 * Reference tables extracted from Numerology_Calculator_Chaldean_Pythagorean.xlsx
 * (sheets Ref, Horary_Ref, Business_Office, Vehicle, Cities).
 * This is DATA, not logic - keep it in a DB / CMS / JSON file so astrologers can edit it.
 * Regenerate with scripts/extract_tables.py if the workbook tables change.
 */
import type { Tables } from "../types";

export const TABLES: Tables = {
  "chaldean": {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 8,
    "G": 3,
    "H": 5,
    "I": 1,
    "J": 1,
    "K": 2,
    "L": 3,
    "M": 4,
    "N": 5,
    "O": 7,
    "P": 8,
    "Q": 1,
    "R": 2,
    "S": 3,
    "T": 4,
    "U": 6,
    "V": 6,
    "W": 6,
    "X": 5,
    "Y": 1,
    "Z": 7
  },
  "pythagorean": {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 6,
    "G": 7,
    "H": 8,
    "I": 9,
    "J": 1,
    "K": 2,
    "L": 3,
    "M": 4,
    "N": 5,
    "O": 6,
    "P": 7,
    "Q": 8,
    "R": 9,
    "S": 1,
    "T": 2,
    "U": 3,
    "V": 4,
    "W": 5,
    "X": 6,
    "Y": 7,
    "Z": 8
  },
  "vowels": "AEIOU",
  "chaldeanLettersByValue": {
    "1": "A, I, J, Q, Y",
    "2": "B, K, R",
    "3": "C, G, L, S",
    "4": "D, M, T",
    "5": "E, H, N, X",
    "6": "U, V, W",
    "7": "O, Z",
    "8": "F, P",
    "9": "(none – 9 is sacred in Chaldean)"
  },
  "compatibility": {
    "1": {
      "1": "Friend",
      "2": "Friend",
      "3": "Friend",
      "4": "Neutral",
      "5": "Friend",
      "6": "Enemy",
      "7": "Neutral",
      "8": "Enemy",
      "9": "Friend"
    },
    "2": {
      "1": "Friend",
      "2": "Friend",
      "3": "Friend",
      "4": "Enemy",
      "5": "Friend",
      "6": "Neutral",
      "7": "Neutral",
      "8": "Enemy",
      "9": "Neutral"
    },
    "3": {
      "1": "Friend",
      "2": "Friend",
      "3": "Friend",
      "4": "Neutral",
      "5": "Friend",
      "6": "Enemy",
      "7": "Friend",
      "8": "Neutral",
      "9": "Neutral"
    },
    "4": {
      "1": "Friend",
      "2": "Enemy",
      "3": "Neutral",
      "4": "Neutral",
      "5": "Friend",
      "6": "Friend",
      "7": "Friend",
      "8": "Neutral",
      "9": "Enemy"
    },
    "5": {
      "1": "Friend",
      "2": "Friend",
      "3": "Friend",
      "4": "Neutral",
      "5": "Friend",
      "6": "Friend",
      "7": "Neutral",
      "8": "Neutral",
      "9": "Neutral"
    },
    "6": {
      "1": "Neutral",
      "2": "Neutral",
      "3": "Enemy",
      "4": "Friend",
      "5": "Friend",
      "6": "Friend",
      "7": "Friend",
      "8": "Neutral",
      "9": "Neutral"
    },
    "7": {
      "1": "Friend",
      "2": "Neutral",
      "3": "Friend",
      "4": "Friend",
      "5": "Friend",
      "6": "Friend",
      "7": "Neutral",
      "8": "Neutral",
      "9": "Neutral"
    },
    "8": {
      "1": "Enemy",
      "2": "Enemy",
      "3": "Friend",
      "4": "Neutral",
      "5": "Friend",
      "6": "Friend",
      "7": "Neutral",
      "8": "Neutral",
      "9": "Neutral"
    },
    "9": {
      "1": "Friend",
      "2": "Friend",
      "3": "Friend",
      "4": "Enemy",
      "5": "Friend",
      "6": "Neutral",
      "7": "Neutral",
      "8": "Enemy",
      "9": "Neutral"
    }
  },
  "numberInfo": {
    "1": {
      "planet": "Sun",
      "keyword": "Leader",
      "personality": "Independent, ambitious, original and self-driven; natural authority.",
      "strengths": "Leadership, confidence, initiative, determination, creativity",
      "weaknesses": "Ego, stubbornness, impatience, dominating nature, dislikes advice",
      "health": "Heart, blood pressure, eyes, spine, circulation; avoid over-exertion",
      "professions": "Government/administration, management, entrepreneurship, politics, medicine, senior executive roles",
      "luckyDays": "Sunday, Monday",
      "luckyColours": "Golden, yellow, orange, light brown",
      "avoidColours": "Black, dark blue",
      "gemstone": "Ruby (Manik)",
      "direction": "East",
      "remedies": "Offer water to the rising Sun (Surya arghya), recite Aditya Hridayam / Gayatri, respect father, donate wheat & jaggery on Sundays",
      "tradingText": "Moderate–Good: decisive, but ego can block stop-losses",
      "tradingScore": 2,
      "houseMeaning": "Independence & recognition; good for leaders/entrepreneurs, can feel lonely for large families",
      "placeVibration": "Career growth, government & leadership opportunities"
    },
    "2": {
      "planet": "Moon",
      "keyword": "Diplomat",
      "personality": "Sensitive, intuitive, gentle, imaginative and cooperative.",
      "strengths": "Empathy, diplomacy, creativity, intuition, teamwork",
      "weaknesses": "Mood swings, indecision, over-sensitivity, low confidence, worry",
      "health": "Stomach/digestion, chest & lungs, fluid balance, anxiety & sleep",
      "professions": "Arts, music, nursing, counselling, hospitality, dairy/liquids, HR, interior design",
      "luckyDays": "Monday, Friday",
      "luckyColours": "White, cream, silver, light green",
      "avoidColours": "Red, black, very dark shades",
      "gemstone": "Pearl (Moti)",
      "direction": "North-West",
      "remedies": "Offer water/milk on Shivling on Mondays, respect mother, wear silver, meditate near water, donate rice/milk",
      "tradingText": "Low: emotional decisions – prefer long-term investing over intraday",
      "tradingScore": 0,
      "houseMeaning": "Harmony & partnership; good for couples and families",
      "placeVibration": "Peaceful living, relationships, creative work"
    },
    "3": {
      "planet": "Jupiter",
      "keyword": "Guru / Expansion",
      "personality": "Optimistic, disciplined, knowledgeable, ambitious and expressive.",
      "strengths": "Wisdom, communication, teaching ability, honesty, organising",
      "weaknesses": "Over-confidence, preaching, extravagance, scattered energy, bossiness",
      "health": "Liver, thighs, weight gain, sugar/diabetes, skin allergies",
      "professions": "Teaching, consulting, law, banking/finance, religion, writing, advisory, academia",
      "luckyDays": "Thursday, Tuesday",
      "luckyColours": "Yellow, orange, pink, violet",
      "avoidColours": "Black, dark grey",
      "gemstone": "Yellow Sapphire (Pukhraj)",
      "direction": "North-East",
      "remedies": "Respect teachers/elders, donate yellow items/turmeric/chana dal on Thursdays, saffron/turmeric tilak, feed cows",
      "tradingText": "Good: analytical & disciplined – best for swing/positional trades",
      "tradingScore": 2,
      "houseMeaning": "Growth, learning and social life; good for families & students",
      "placeVibration": "Learning, expansion, good fortune"
    },
    "4": {
      "planet": "Rahu",
      "keyword": "Rebel / Builder",
      "personality": "Practical, hard-working, unconventional, systematic, sometimes rebellious.",
      "strengths": "Discipline, technical skill, loyalty, out-of-box thinking, persistence",
      "weaknesses": "Sudden ups & downs, argumentative, secretive, rigid, stress & isolation",
      "health": "Nerves, unusual/hard-to-diagnose ailments, headaches, urinary issues, back pain",
      "professions": "Technology/IT, engineering, research, electricals, politics, aviation, import-export, data/analytics",
      "luckyDays": "Saturday, Sunday",
      "luckyColours": "Grey, electric blue, khaki, light blue",
      "avoidColours": "Black, deep red",
      "gemstone": "Hessonite (Gomed)",
      "direction": "South-West",
      "remedies": "Donate to sweepers/needy on Saturdays, feed stray dogs, recite Durga Chalisa / Hanuman Chalisa, keep promises, avoid alcohol",
      "tradingText": "Risky: sudden gains & losses – strict stop-loss essential",
      "tradingScore": 1,
      "houseMeaning": "Hard work & stability but delays/sudden events; usually avoided unless 4 is your number",
      "placeVibration": "Technology hubs; struggle before stability"
    },
    "5": {
      "planet": "Mercury",
      "keyword": "Communicator / Trader",
      "personality": "Quick-witted, versatile, adaptable, adventurous and sociable.",
      "strengths": "Communication, business acumen, calculation, adaptability, networking",
      "weaknesses": "Restlessness, impatience, nervousness, inconsistency, excessive risk-taking",
      "health": "Nervous system, skin, speech, shoulders/arms, insomnia from over-thinking",
      "professions": "Business/trading, stock market, sales & marketing, media, accounting, travel, IT, communication",
      "luckyDays": "Wednesday, Friday",
      "luckyColours": "Green, light grey, white, light shades",
      "avoidColours": "Dark/dull colours",
      "gemstone": "Emerald (Panna)",
      "direction": "North",
      "remedies": "Feed green fodder to cows on Wednesdays, worship Ganesha, donate green moong, keep plants, respect sisters/aunts",
      "tradingText": "Very Good: natural trader with quick decisions – guard against over-trading",
      "tradingScore": 3,
      "houseMeaning": "Lively, social and business-friendly; very good for traders",
      "placeVibration": "Commerce, trade, travel, networking"
    },
    "6": {
      "planet": "Venus",
      "keyword": "Harmoniser",
      "personality": "Charming, loving, artistic, responsible and comfort-loving.",
      "strengths": "Creativity, aesthetics, family care, magnetism, balance",
      "weaknesses": "Luxury-loving, jealousy, possessiveness, stubbornness, indulgence",
      "health": "Throat, kidneys, reproductive system, sugar, skin, hormones",
      "professions": "Fashion, beauty, films/media, hospitality, luxury goods, interior design, real estate, art",
      "luckyDays": "Friday, Wednesday",
      "luckyColours": "White, light blue, pink, cream",
      "avoidColours": "Black",
      "gemstone": "Diamond / Opal / White Sapphire",
      "direction": "South-East",
      "remedies": "Worship Lakshmi on Fridays, donate white sweets/rice, respect women, keep home clean & fragrant",
      "tradingText": "Good: patient investor – prefers steady gains over intraday",
      "tradingScore": 2,
      "houseMeaning": "Comfort, love & beauty; excellent for families",
      "placeVibration": "Comfort, prosperity, relationships, arts"
    },
    "7": {
      "planet": "Ketu",
      "keyword": "Seeker",
      "personality": "Analytical, spiritual, introspective, intuitive and research-minded.",
      "strengths": "Deep thinking, intuition, research, originality, calmness",
      "weaknesses": "Isolation, suspicion, aloofness, confusion, pessimism",
      "health": "Skin, digestion, joints, mental stress, unusual ailments",
      "professions": "Research, science, occult, spirituality, coding, medicine, investigation, writing",
      "luckyDays": "Monday, Sunday",
      "luckyColours": "Light green, white, light yellow, pastels",
      "avoidColours": "Black, dark red",
      "gemstone": "Cat's eye (Lehsunia)",
      "direction": "West",
      "remedies": "Daily meditation, feed stray dogs, worship Ganesha, donate blankets, keep a spiritual practice",
      "tradingText": "Low–Moderate: good research but doubt causes late entries – better long-term",
      "tradingScore": 1,
      "houseMeaning": "Spiritual & quiet; suits researchers, may feel isolating",
      "placeVibration": "Spiritual growth, research, solitude"
    },
    "8": {
      "planet": "Saturn",
      "keyword": "Karma / Endurance",
      "personality": "Serious, ambitious, patient, hard-working, often misunderstood.",
      "strengths": "Perseverance, responsibility, organising power, long-term vision, justice",
      "weaknesses": "Delays, pessimism, loneliness, rigidity, workaholism",
      "health": "Bones, joints, teeth, knees/legs, chronic ailments, depression",
      "professions": "Law/judiciary, real estate, mining, oil, heavy industry, banking, manpower, administration",
      "luckyDays": "Saturday, Friday",
      "luckyColours": "Dark blue, black, purple, dark grey",
      "avoidColours": "Red, bright colours",
      "gemstone": "Blue Sapphire (Neelam) – only after trial & expert advice",
      "direction": "West",
      "remedies": "Serve elderly & labourers, donate black sesame/mustard oil on Saturdays, recite Shani / Hanuman Chalisa, stay honest",
      "tradingText": "Risky for intraday: slow & karmic – suited to long-term investing",
      "tradingScore": 1,
      "houseMeaning": "Delays & struggle; generally avoided except by 8-born people",
      "placeVibration": "Hard work, industry; results come slowly"
    },
    "9": {
      "planet": "Mars",
      "keyword": "Warrior",
      "personality": "Energetic, courageous, humanitarian, passionate and determined.",
      "strengths": "Courage, energy, crisis leadership, generosity, protectiveness",
      "weaknesses": "Anger, impulsiveness, aggression, accident-proneness, impatience",
      "health": "Blood, fevers, injuries/cuts, BP, inflammation, surgeries",
      "professions": "Defence, police, sports, surgery, engineering, real estate, energy, social service",
      "luckyDays": "Tuesday, Thursday",
      "luckyColours": "Red, crimson, pink, coral",
      "avoidColours": "Black, dark blue",
      "gemstone": "Red Coral (Moonga)",
      "direction": "South",
      "remedies": "Recite Hanuman Chalisa on Tuesdays, donate red lentils (masoor), control anger, donate blood",
      "tradingText": "Moderate: bold but impulsive – must follow strict rules",
      "tradingScore": 2,
      "houseMeaning": "Energetic and social; good for active people",
      "placeVibration": "Energy, ambition, completion"
    }
  },
  "compound": {
    "1": {
      "rating": "Lucky",
      "keyword": "Sun – leadership, success"
    },
    "2": {
      "rating": "Neutral",
      "keyword": "Moon – partnership, sensitivity"
    },
    "3": {
      "rating": "Lucky",
      "keyword": "Jupiter – expansion, wisdom"
    },
    "4": {
      "rating": "Caution",
      "keyword": "Rahu – sudden change, struggle"
    },
    "5": {
      "rating": "Lucky",
      "keyword": "Mercury – business, communication"
    },
    "6": {
      "rating": "Lucky",
      "keyword": "Venus – love, comfort"
    },
    "7": {
      "rating": "Neutral",
      "keyword": "Ketu – spirituality, research"
    },
    "8": {
      "rating": "Caution",
      "keyword": "Saturn – delays, karma"
    },
    "9": {
      "rating": "Neutral",
      "keyword": "Mars – energy, courage"
    },
    "10": {
      "rating": "Lucky",
      "keyword": "Wheel of Fortune – honour, self-confidence"
    },
    "11": {
      "rating": "Caution",
      "keyword": "Lion Muzzled – hidden dangers, trials"
    },
    "12": {
      "rating": "Avoid",
      "keyword": "The Sacrifice – suffering, anxiety"
    },
    "13": {
      "rating": "Caution",
      "keyword": "Change of plans – upheaval, transformation"
    },
    "14": {
      "rating": "Neutral",
      "keyword": "Movement – good for business, risk via others"
    },
    "15": {
      "rating": "Lucky",
      "keyword": "The Magician – money, charisma"
    },
    "16": {
      "rating": "Avoid",
      "keyword": "Shattered Citadel – sudden fall, accidents"
    },
    "17": {
      "rating": "Lucky",
      "keyword": "Star of the Magi – fame, peace"
    },
    "18": {
      "rating": "Avoid",
      "keyword": "Conflict – deception, quarrels"
    },
    "19": {
      "rating": "Lucky",
      "keyword": "Prince of Heaven – success, esteem"
    },
    "20": {
      "rating": "Neutral",
      "keyword": "Awakening – new purpose, judgement"
    },
    "21": {
      "rating": "Lucky",
      "keyword": "Crown of the Magi – victory, advancement"
    },
    "22": {
      "rating": "Avoid",
      "keyword": "The Fool – illusion, false judgement"
    },
    "23": {
      "rating": "Lucky",
      "keyword": "Royal Star of the Lion – help from superiors, success"
    },
    "24": {
      "rating": "Lucky",
      "keyword": "Love & money – favour of rank"
    },
    "25": {
      "rating": "Lucky",
      "keyword": "Strength through experience"
    },
    "26": {
      "rating": "Avoid",
      "keyword": "Partnership troubles, ruin through others"
    },
    "27": {
      "rating": "Lucky",
      "keyword": "The Sceptre – authority, creative command"
    },
    "28": {
      "rating": "Avoid",
      "keyword": "Contradictions – losses through trust in others"
    },
    "29": {
      "rating": "Avoid",
      "keyword": "Grace under pressure – treachery, deception"
    },
    "30": {
      "rating": "Neutral",
      "keyword": "Thoughtful retrospection – mental superiority"
    },
    "31": {
      "rating": "Neutral",
      "keyword": "Isolation – self-contained, lonely"
    },
    "32": {
      "rating": "Lucky",
      "keyword": "Communication – magical, mass appeal"
    },
    "33": {
      "rating": "Lucky",
      "keyword": "Same as 24 – love & money"
    },
    "34": {
      "rating": "Lucky",
      "keyword": "Same as 25 – strength via experience"
    },
    "35": {
      "rating": "Avoid",
      "keyword": "Same as 26 – partnership troubles"
    },
    "36": {
      "rating": "Lucky",
      "keyword": "Same as 27 – authority"
    },
    "37": {
      "rating": "Lucky",
      "keyword": "Good friendships & love, partnerships"
    },
    "38": {
      "rating": "Avoid",
      "keyword": "Same as 29 – treachery"
    },
    "39": {
      "rating": "Neutral",
      "keyword": "Same as 30 – retrospection"
    },
    "40": {
      "rating": "Neutral",
      "keyword": "Same as 31 – isolation"
    },
    "41": {
      "rating": "Lucky",
      "keyword": "Same as 32 – magical communication"
    },
    "42": {
      "rating": "Lucky",
      "keyword": "Same as 24 – love & money"
    },
    "43": {
      "rating": "Avoid",
      "keyword": "Revolution – upheaval, failure"
    },
    "44": {
      "rating": "Avoid",
      "keyword": "Same as 26 – danger through others"
    },
    "45": {
      "rating": "Lucky",
      "keyword": "Same as 27 – sceptre"
    },
    "46": {
      "rating": "Lucky",
      "keyword": "Same as 37 – friendship, love"
    },
    "47": {
      "rating": "Caution",
      "keyword": "Same as 29 – trials"
    },
    "48": {
      "rating": "Caution",
      "keyword": "Same as 30 – isolation risk"
    },
    "49": {
      "rating": "Neutral",
      "keyword": "Same as 31 – reserved"
    },
    "50": {
      "rating": "Lucky",
      "keyword": "Same as 32 – communication"
    },
    "51": {
      "rating": "Lucky",
      "keyword": "The Warrior – sudden advancement"
    },
    "52": {
      "rating": "Avoid",
      "keyword": "Same as 43 – revolution"
    }
  },
  "compoundScore": {
    "Lucky": 2,
    "Neutral": 1,
    "Caution": 0.5,
    "Avoid": 0
  },
  "loShu": {
    "1": {
      "elementDirection": "Water / North",
      "missingEffect": "Weak self-expression & communication; career obstacles",
      "remedy": "Offer water to Sun daily, wear a copper bracelet, keep a water feature/blue item in North",
      "excessEffect": "Over-talkative, self-centred"
    },
    "2": {
      "elementDirection": "Earth / South-West",
      "missingEffect": "Low sensitivity & intuition; relationship friction",
      "remedy": "Wear silver or pearl (after advice), keep an earthen pot/crystal in South-West, respect mother",
      "excessEffect": "Over-sensitive, emotional, easily hurt"
    },
    "3": {
      "elementDirection": "Wood / East",
      "missingEffect": "Weak imagination & planning; low family support",
      "remedy": "Wear yellow, turmeric tilak, keep healthy green plants in East, respect teachers",
      "excessEffect": "Day-dreaming, scattered thinking"
    },
    "4": {
      "elementDirection": "Wood / South-East",
      "missingEffect": "Disorganised, unstable finances, lack of discipline",
      "remedy": "Money plant/green plants in South-East, follow a fixed routine, donate to needy on Saturdays",
      "excessEffect": "Rigid, workaholic, materialistic"
    },
    "5": {
      "elementDirection": "Earth / Centre",
      "missingEffect": "Imbalance, lack of focus & grounding",
      "remedy": "Keep the centre of home clutter-free, wear green, worship Ganesha, donate green moong on Wednesdays",
      "excessEffect": "Restless, impulsive, over-emotional swings"
    },
    "6": {
      "elementDirection": "Metal / North-West",
      "missingEffect": "Lack of home harmony, comforts & luxuries",
      "remedy": "Keep North-West clean, wear white/silver, use pleasant fragrances, Lakshmi puja on Fridays",
      "excessEffect": "Over-possessive, worrier about family"
    },
    "7": {
      "elementDirection": "Metal / West",
      "missingEffect": "Disappointments, lack of spiritual depth, struggles in luck",
      "remedy": "Daily meditation, metal wind-chime in West, feed stray dogs",
      "excessEffect": "Loss & repeated disappointments, detachment"
    },
    "8": {
      "elementDirection": "Earth / North-East",
      "missingEffect": "Poor money management, instability, carelessness",
      "remedy": "Keep North-East clean & light, help elderly/labourers, donate black sesame on Saturdays",
      "excessEffect": "Stubborn, over-cautious, delays"
    },
    "9": {
      "elementDirection": "Fire / South",
      "missingEffect": "Low energy, ambition & recognition",
      "remedy": "Wear a red thread, recite Hanuman Chalisa, red lamp/light in South",
      "excessEffect": "Aggression, anger, over-idealism"
    }
  },
  "pythMeanings": {
    "1": {
      "keyword": "The Leader",
      "strengths": "Independent, pioneering, driven",
      "challenges": "Ego, impatience, isolation",
      "career": "Entrepreneur, manager, inventor"
    },
    "2": {
      "keyword": "The Peacemaker",
      "strengths": "Cooperative, diplomatic, sensitive",
      "challenges": "Over-sensitivity, dependency",
      "career": "Mediator, counsellor, HR, artist"
    },
    "3": {
      "keyword": "The Communicator",
      "strengths": "Creative, expressive, joyful",
      "challenges": "Scattered, superficial",
      "career": "Writer, speaker, designer, media"
    },
    "4": {
      "keyword": "The Builder",
      "strengths": "Practical, organised, reliable",
      "challenges": "Rigid, stubborn, overworked",
      "career": "Engineer, accountant, manager, builder"
    },
    "5": {
      "keyword": "The Freedom Seeker",
      "strengths": "Adaptable, curious, dynamic",
      "challenges": "Restless, impulsive, inconsistent",
      "career": "Sales, travel, trading, marketing"
    },
    "6": {
      "keyword": "The Nurturer",
      "strengths": "Responsible, caring, harmonious",
      "challenges": "Over-controlling, perfectionist",
      "career": "Teacher, healer, designer, hospitality"
    },
    "7": {
      "keyword": "The Seeker",
      "strengths": "Analytical, intuitive, wise",
      "challenges": "Aloof, sceptical, isolated",
      "career": "Researcher, scientist, analyst, spiritual guide"
    },
    "8": {
      "keyword": "The Powerhouse",
      "strengths": "Ambitious, authoritative, abundant",
      "challenges": "Materialism, workaholism",
      "career": "Executive, finance, law, real estate"
    },
    "9": {
      "keyword": "The Humanitarian",
      "strengths": "Compassionate, generous, idealistic",
      "challenges": "Martyrdom, emotional distance",
      "career": "NGO, medicine, arts, teaching"
    },
    "11": {
      "keyword": "Master Intuitive (11/2)",
      "strengths": "Inspired, visionary, spiritual",
      "challenges": "Nervous tension, self-doubt",
      "career": "Spiritual teacher, counsellor, artist"
    },
    "22": {
      "keyword": "Master Builder (22/4)",
      "strengths": "Visionary achiever, practical idealist",
      "challenges": "Pressure, overwhelm",
      "career": "Large-scale builder, leader, architect"
    },
    "33": {
      "keyword": "Master Teacher (33/6)",
      "strengths": "Selfless healer, compassionate guide",
      "challenges": "Self-sacrifice, burnout",
      "career": "Healer, teacher, humanitarian leader"
    }
  },
  "planes": [
    {
      "name": "Mental plane (top row)",
      "digits": [
        4,
        9,
        2
      ],
      "meaning": "Sharp intellect, memory & planning"
    },
    {
      "name": "Emotional plane (middle row)",
      "digits": [
        3,
        5,
        7
      ],
      "meaning": "Emotional balance & spiritual strength"
    },
    {
      "name": "Practical plane (bottom row)",
      "digits": [
        8,
        1,
        6
      ],
      "meaning": "Material success, practicality"
    },
    {
      "name": "Thought plane (left column)",
      "digits": [
        4,
        3,
        8
      ],
      "meaning": "Strong planning & ideas"
    },
    {
      "name": "Will plane (middle column)",
      "digits": [
        9,
        5,
        1
      ],
      "meaning": "Determination & persistence"
    },
    {
      "name": "Action plane (right column)",
      "digits": [
        2,
        7,
        6
      ],
      "meaning": "Turns ideas into action"
    },
    {
      "name": "Golden Raj Yog (diagonal)",
      "digits": [
        4,
        5,
        6
      ],
      "meaning": "Wealth, success & property"
    },
    {
      "name": "Silver Raj Yog (diagonal)",
      "digits": [
        2,
        5,
        8
      ],
      "meaning": "Property, stability & family success"
    }
  ],
  "loShuGridLayout": [
    [
      4,
      9,
      2
    ],
    [
      3,
      5,
      7
    ],
    [
      8,
      1,
      6
    ]
  ],
  "horaryCategories": [
    {
      "group": "Career",
      "question": "Will I get a job?",
      "yes": "1,3,5,6",
      "no": "7,8",
      "speed": "Medium",
      "yesMeans": "Yes = job will come",
      "advice": "Apply widely on your lucky weekday; Sun/Surya arghya for career"
    },
    {
      "group": "Career",
      "question": "Will I receive a new job offer?",
      "yes": "1,3,5,6,9",
      "no": "7,8",
      "speed": "Fast",
      "yesMeans": "Yes = offer will come",
      "advice": "Follow up on Wednesdays/Thursdays"
    },
    {
      "group": "Career",
      "question": "Should I accept this new job offer?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = accept; No = decline/negotiate",
      "advice": "Check the company name number on the Cities/Name tools too"
    },
    {
      "group": "Career",
      "question": "Will joining the new job go smoothly?",
      "yes": "1,3,5,6,9",
      "no": "4,8",
      "speed": "Fast",
      "yesMeans": "Yes = smooth joining",
      "advice": "Join on a date whose root is friendly to you"
    },
    {
      "group": "Career",
      "question": "Layoff – is my job safe?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = job safe; No = risk of layoff",
      "advice": "Upgrade skills, keep CV ready; Shani remedies if 8 shows"
    },
    {
      "group": "Career",
      "question": "Job loss – will I get back to work soon?",
      "yes": "1,3,5,9",
      "no": "7,8",
      "speed": "Medium",
      "yesMeans": "Yes = re-employed soon",
      "advice": "Network actively; Hanuman Chalisa for courage"
    },
    {
      "group": "Career",
      "question": "Will I get a promotion?",
      "yes": "1,3,5,9",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = promotion indicated",
      "advice": "Sun remedies; respect seniors"
    },
    {
      "group": "Career",
      "question": "Demotion – am I safe from demotion?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = safe",
      "advice": "Avoid conflicts with superiors"
    },
    {
      "group": "Career",
      "question": "Will my transfer happen?",
      "yes": "2,4,5,9",
      "no": "8",
      "speed": "Medium",
      "yesMeans": "Yes = transfer happens",
      "advice": ""
    },
    {
      "group": "Career",
      "question": "Will I succeed in the interview?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = selected",
      "advice": "Wear lucky colour; start on lucky hora"
    },
    {
      "group": "Career",
      "question": "Result of interview / exam / application – positive?",
      "yes": "1,3,5",
      "no": "7,8",
      "speed": "Fast",
      "yesMeans": "Yes = positive result",
      "advice": ""
    },
    {
      "group": "Career",
      "question": "Will the project succeed?",
      "yes": "1,3,5,6,9",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = project succeeds",
      "advice": ""
    },
    {
      "group": "Career",
      "question": "Will I win the competition / election?",
      "yes": "1,3,9",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = win",
      "advice": ""
    },
    {
      "group": "Career",
      "question": "Government work / licence / approval – will it be done?",
      "yes": "1,3,9",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = approved",
      "advice": "Sun remedies, respect officials"
    },
    {
      "group": "Business",
      "question": "Should I start a business?",
      "yes": "1,3,5,6,9",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = start; see 'Business ideas'",
      "advice": "Start on a favourable date & hora"
    },
    {
      "group": "Business",
      "question": "Will my current business grow?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = growth",
      "advice": ""
    },
    {
      "group": "Business",
      "question": "Is this partnership good?",
      "yes": "2,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = good partnership",
      "advice": "Check partner's numbers on Partner tab"
    },
    {
      "group": "Business",
      "question": "Will this deal / contract be good?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = good deal",
      "advice": "Sign on Mercury/Jupiter hora"
    },
    {
      "group": "Education",
      "question": "Will I / child get admission in school / college?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = admission",
      "advice": "Jupiter & Ganesha remedies"
    },
    {
      "group": "Education",
      "question": "Will I pass / succeed in the exam?",
      "yes": "1,3,5,9",
      "no": "7,8",
      "speed": "Medium",
      "yesMeans": "Yes = success",
      "advice": "Saraswati / Ganesha worship"
    },
    {
      "group": "Education",
      "question": "Will I get admission / study abroad?",
      "yes": "2,3,4,5",
      "no": "8",
      "speed": "Slow",
      "yesMeans": "Yes = abroad study happens",
      "advice": ""
    },
    {
      "group": "Finance",
      "question": "Will I get the bank loan?",
      "yes": "1,3,5,6",
      "no": "7,8",
      "speed": "Medium",
      "yesMeans": "Yes = loan sanctioned",
      "advice": ""
    },
    {
      "group": "Finance",
      "question": "Should I take the loan – will I be able to repay?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = safe to take & repay",
      "advice": "Avoid loans on Tuesday; repay first EMI on Tuesday"
    },
    {
      "group": "Finance",
      "question": "Will I be able to clear my existing debt?",
      "yes": "1,3,5,9",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = debt cleared",
      "advice": "Repay on Tuesdays; Hanuman worship"
    },
    {
      "group": "Finance",
      "question": "Will I recover money lent to someone?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = money comes back",
      "advice": ""
    },
    {
      "group": "Finance",
      "question": "Will I get money / help from someone?",
      "yes": "2,3,5,6",
      "no": "7,8",
      "speed": "Fast",
      "yesMeans": "Yes = money/help comes",
      "advice": ""
    },
    {
      "group": "Finance",
      "question": "Should I open this bank account now?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = open",
      "advice": "Use Bank_Account tab to test the number"
    },
    {
      "group": "Finance",
      "question": "Is this investment good (general)?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = good investment",
      "advice": ""
    },
    {
      "group": "Finance",
      "question": "Mutual fund / SIP – good investment?",
      "yes": "3,5,6,8",
      "no": "4,7",
      "speed": "Slow",
      "yesMeans": "Yes = good for long term",
      "advice": ""
    },
    {
      "group": "Finance",
      "question": "Will this share rise?",
      "yes": "1,3,5,9",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = rise expected",
      "advice": "Not financial advice"
    },
    {
      "group": "Finance",
      "question": "Intraday trade today – favourable?",
      "yes": "1,3,5,9",
      "no": "2,4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = trade with stop-loss",
      "advice": "Not financial advice"
    },
    {
      "group": "Finance",
      "question": "Insurance policy – should I take it?",
      "yes": "3,5,6,8",
      "no": "4,7",
      "speed": "Medium",
      "yesMeans": "Yes = take",
      "advice": ""
    },
    {
      "group": "Finance",
      "question": "Will my insurance claim be settled?",
      "yes": "1,3,5",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = claim settled",
      "advice": ""
    },
    {
      "group": "Finance",
      "question": "Is donation / charity beneficial now?",
      "yes": "1,3,7,8,9",
      "no": "4",
      "speed": "Fast",
      "yesMeans": "Yes = donate now",
      "advice": "Donate items of your weak planet"
    },
    {
      "group": "Property",
      "question": "Should I buy property (general)?",
      "yes": "3,6,8,9",
      "no": "4,7",
      "speed": "Slow",
      "yesMeans": "Yes = buy",
      "advice": "Check flat number on House_Flat tab"
    },
    {
      "group": "Property",
      "question": "Buy land / plot – good?",
      "yes": "3,8,9",
      "no": "4,7",
      "speed": "Slow",
      "yesMeans": "Yes = buy land",
      "advice": ""
    },
    {
      "group": "Property",
      "question": "Buy flat / apartment – good?",
      "yes": "3,6,8,9",
      "no": "4,7",
      "speed": "Slow",
      "yesMeans": "Yes = buy flat",
      "advice": ""
    },
    {
      "group": "Property",
      "question": "Ready-to-move property – good?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = buy",
      "advice": ""
    },
    {
      "group": "Property",
      "question": "Under-construction property – good (timely delivery)?",
      "yes": "3,6,8,9",
      "no": "4,7",
      "speed": "Slow",
      "yesMeans": "Yes = good, delivery OK",
      "advice": ""
    },
    {
      "group": "Property",
      "question": "Will my property sell?",
      "yes": "1,3,5,9",
      "no": "7,8",
      "speed": "Medium",
      "yesMeans": "Yes = sells",
      "advice": ""
    },
    {
      "group": "Property",
      "question": "Will I get a good tenant / rent?",
      "yes": "2,3,5,6",
      "no": "7,8",
      "speed": "Fast",
      "yesMeans": "Yes = tenant comes",
      "advice": ""
    },
    {
      "group": "Property",
      "question": "Should I shift / change house?",
      "yes": "2,4,5,6",
      "no": "7,8",
      "speed": "Medium",
      "yesMeans": "Yes = shift",
      "advice": ""
    },
    {
      "group": "Vehicle",
      "question": "Should I buy the car / vehicle?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = buy",
      "advice": "Check plate on Vehicle tab"
    },
    {
      "group": "Relationship",
      "question": "Will marriage happen?",
      "yes": "2,3,5,6",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = marriage indicated",
      "advice": "Venus & Jupiter remedies"
    },
    {
      "group": "Relationship",
      "question": "Will this love affair succeed?",
      "yes": "2,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = success",
      "advice": ""
    },
    {
      "group": "Relationship",
      "question": "Will love lead to marriage?",
      "yes": "2,3,6",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = love marriage",
      "advice": ""
    },
    {
      "group": "Relationship",
      "question": "Will a second marriage happen?",
      "yes": "2,4,5,6",
      "no": "7,8",
      "speed": "Slow",
      "yesMeans": "Yes = second marriage indicated",
      "advice": ""
    },
    {
      "group": "Relationship",
      "question": "Will a third (or further) marriage happen?",
      "yes": "4,5,6",
      "no": "7,8",
      "speed": "Slow",
      "yesMeans": "Yes = indicated",
      "advice": ""
    },
    {
      "group": "Relationship",
      "question": "Separation – will the relationship be saved?",
      "yes": "2,3,5,6",
      "no": "4,7,8,9",
      "speed": "Medium",
      "yesMeans": "Yes = reconciliation",
      "advice": "Moon & Venus remedies; counselling"
    },
    {
      "group": "Relationship",
      "question": "Will the divorce be granted?",
      "yes": "4,7,8,9",
      "no": "2,6",
      "speed": "Slow",
      "yesMeans": "Yes = divorce granted",
      "advice": ""
    },
    {
      "group": "Relationship",
      "question": "Will reconciliation with family happen?",
      "yes": "2,3,5,6",
      "no": "4,8,9",
      "speed": "Medium",
      "yesMeans": "Yes = reconcile",
      "advice": ""
    },
    {
      "group": "Children",
      "question": "Will we be blessed with a child?",
      "yes": "2,3,5,6",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = child indicated",
      "advice": "Jupiter worship (Santan Gopal)"
    },
    {
      "group": "Children",
      "question": "Is the child's future / education bright?",
      "yes": "1,3,5",
      "no": "7,8",
      "speed": "Slow",
      "yesMeans": "Yes = bright",
      "advice": ""
    },
    {
      "group": "Children",
      "question": "Will child's marriage happen soon?",
      "yes": "2,3,6",
      "no": "7,8",
      "speed": "Slow",
      "yesMeans": "Yes = soon",
      "advice": ""
    },
    {
      "group": "Health",
      "question": "Will my health improve?",
      "yes": "1,2,3,6",
      "no": "4,7,8,9",
      "speed": "Medium",
      "yesMeans": "Yes = improvement",
      "advice": "Follow doctor's advice; remedies are supportive only"
    },
    {
      "group": "Health",
      "question": "Will the disease be cured?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = cure indicated",
      "advice": ""
    },
    {
      "group": "Health",
      "question": "Will I / patient recover fully?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = recovery",
      "advice": ""
    },
    {
      "group": "Health",
      "question": "Is the current treatment working?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = continue treatment",
      "advice": ""
    },
    {
      "group": "Health",
      "question": "Should I change the doctor / hospital?",
      "yes": "1,4,5,9",
      "no": "3,6,8",
      "speed": "Fast",
      "yesMeans": "Yes = change; No = continue",
      "advice": ""
    },
    {
      "group": "Health",
      "question": "Will the surgery be successful?",
      "yes": "1,3,6,9",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = success",
      "advice": "Choose Mars/Sun hora for surgery date if possible"
    },
    {
      "group": "Health",
      "question": "Will discharge from hospital be soon?",
      "yes": "1,2,3,5",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = discharge soon",
      "advice": ""
    },
    {
      "group": "Health",
      "question": "Critical illness – will the patient pass safely through it?",
      "yes": "1,2,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = safe; No = high-risk period – medical care first",
      "advice": "Mahamrityunjaya jaap; rely on doctors"
    },
    {
      "group": "Health",
      "question": "Is the pregnancy safe?",
      "yes": "2,3,6",
      "no": "4,7,8,9",
      "speed": "Medium",
      "yesMeans": "Yes = safe",
      "advice": ""
    },
    {
      "group": "Health",
      "question": "Mother's health – will it be fine?",
      "yes": "1,2,3,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = fine",
      "advice": "Moon remedies"
    },
    {
      "group": "Health",
      "question": "Father's health – will it be fine?",
      "yes": "1,3,5,9",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = fine",
      "advice": "Sun remedies"
    },
    {
      "group": "Health",
      "question": "Sibling's health – will it be fine?",
      "yes": "1,3,5,9",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = fine",
      "advice": "Mars/Mercury remedies"
    },
    {
      "group": "Health",
      "question": "Fear / anxiety – will it go away?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = relief",
      "advice": "Meditation, Hanuman Chalisa"
    },
    {
      "group": "Spiritual",
      "question": "Am I free of negative energy / black magic?",
      "yes": "1,3,5,6,9",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = clear; No = do protection remedies",
      "advice": "Hanuman Chalisa, Durga Kavach, camphor & sea-salt cleansing"
    },
    {
      "group": "Spiritual",
      "question": "Will the pilgrimage / religious trip happen?",
      "yes": "2,3,7,9",
      "no": "4,8",
      "speed": "Medium",
      "yesMeans": "Yes = happens",
      "advice": ""
    },
    {
      "group": "Spiritual",
      "question": "Will the puja / remedy work?",
      "yes": "1,3,7,9",
      "no": "4",
      "speed": "Medium",
      "yesMeans": "Yes = works",
      "advice": ""
    },
    {
      "group": "Spiritual",
      "question": "Which deity should I worship?",
      "yes": "1,2,3,4,5,6,7,8,9",
      "no": "",
      "speed": "Fast",
      "yesMeans": "See 'Deity to worship'",
      "advice": "Answer is the deity shown below"
    },
    {
      "group": "Travel",
      "question": "Will the trip happen and go well?",
      "yes": "2,3,5,9",
      "no": "8",
      "speed": "Fast",
      "yesMeans": "Yes = good trip",
      "advice": ""
    },
    {
      "group": "Travel",
      "question": "Will foreign travel happen?",
      "yes": "2,4,5,7,9",
      "no": "8",
      "speed": "Medium",
      "yesMeans": "Yes = foreign travel",
      "advice": ""
    },
    {
      "group": "Travel",
      "question": "Will my visa be approved?",
      "yes": "1,2,3,4,5",
      "no": "7,8",
      "speed": "Fast",
      "yesMeans": "Yes = approved",
      "advice": ""
    },
    {
      "group": "Travel",
      "question": "Will immigration / PR be approved?",
      "yes": "2,3,4,5,7",
      "no": "8",
      "speed": "Slow",
      "yesMeans": "Yes = approved",
      "advice": ""
    },
    {
      "group": "Travel",
      "question": "Will I settle abroad / get a foreign job?",
      "yes": "2,4,5,7",
      "no": "8",
      "speed": "Slow",
      "yesMeans": "Yes = settle abroad",
      "advice": ""
    },
    {
      "group": "Travel",
      "question": "Should I relocate to another city?",
      "yes": "2,4,5,9",
      "no": "7,8",
      "speed": "Medium",
      "yesMeans": "Yes = relocate",
      "advice": "Check the city on Cities tab"
    },
    {
      "group": "Legal",
      "question": "Will I win the court case?",
      "yes": "1,3,5,9",
      "no": "4,7,8",
      "speed": "Slow",
      "yesMeans": "Yes = win",
      "advice": "Sun & Jupiter remedies"
    },
    {
      "group": "Legal",
      "question": "Will the case be settled out of court?",
      "yes": "2,3,5,6",
      "no": "4,8,9",
      "speed": "Medium",
      "yesMeans": "Yes = settlement",
      "advice": ""
    },
    {
      "group": "Legal",
      "question": "Will I / they be safe from arrest / jail?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = safe",
      "advice": "Shani & Hanuman remedies"
    },
    {
      "group": "Legal",
      "question": "Will bail be granted?",
      "yes": "1,3,5",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = bail granted",
      "advice": ""
    },
    {
      "group": "Legal",
      "question": "Will the police matter / dispute be resolved?",
      "yes": "1,3,5,9",
      "no": "4,8",
      "speed": "Medium",
      "yesMeans": "Yes = resolved",
      "advice": ""
    },
    {
      "group": "Lost & Found",
      "question": "Lost item – will it be found? (car, keys, clothes, pendrive, money, gold, silver…)",
      "yes": "1,2,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = will be found",
      "advice": "See direction, distance & where to look"
    },
    {
      "group": "Theft",
      "question": "Stolen item – will it be recovered?",
      "yes": "1,3,5,9",
      "no": "2,4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = recovered",
      "advice": "See thief description & direction"
    },
    {
      "group": "Missing",
      "question": "Missing person (child, spouse, sibling…) – will they return / be found?",
      "yes": "1,2,3,5",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = will return / be found",
      "advice": "Inform police immediately – this is only supportive"
    },
    {
      "group": "Missing",
      "question": "Missing pet – will it return?",
      "yes": "2,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = returns",
      "advice": ""
    },
    {
      "group": "General",
      "question": "Is today good to start this work?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = start today",
      "advice": ""
    },
    {
      "group": "General",
      "question": "Will I get help / favour from this person?",
      "yes": "1,2,3,5",
      "no": "4,7,8",
      "speed": "Fast",
      "yesMeans": "Yes = help comes",
      "advice": ""
    },
    {
      "group": "General",
      "question": "Will my wish / desire be fulfilled?",
      "yes": "1,3,5,6",
      "no": "4,7,8",
      "speed": "Medium",
      "yesMeans": "Yes = fulfilled",
      "advice": ""
    },
    {
      "group": "General",
      "question": "Will I get recognition / fame?",
      "yes": "1,3,6,9",
      "no": "7,8",
      "speed": "Slow",
      "yesMeans": "Yes = recognition",
      "advice": ""
    }
  ],
  "horaryNumbers": {
    "1": {
      "planet": "Sun",
      "direction": "East",
      "distance": "Near – inside home / workplace",
      "whereToLook": "Near light, windows, important/official papers, father's or elder's things, east side",
      "personDescription": "Authority figure, male, known person, confident, elder or official",
      "deity": "Surya / Lord Rama",
      "mantra": "Om Suryaya Namah / Aditya Hridayam",
      "timingUnit": "Weeks",
      "weekday": "Sunday",
      "significations": "Govt, father, authority, heart, eyes, promotion, fame, gold",
      "businessIdeas": "Govt contracts, administration, pharma, gold, consultancy, events"
    },
    "2": {
      "planet": "Moon",
      "direction": "North-West",
      "distance": "Near – inside home",
      "whereToLook": "Near water, kitchen, bathroom, fridge, white objects, mother's room, laundry",
      "personDescription": "Woman or soft-natured person, fair, emotional, family member",
      "deity": "Lord Shiva / Parvati",
      "mantra": "Om Namah Shivaya / Om Som Somaya Namah",
      "timingUnit": "Days",
      "weekday": "Monday",
      "significations": "Mother, mind, travel by water, liquids, silver, public, emotions",
      "businessIdeas": "Dairy, liquids, hospitality, travel, silver, food, healthcare support"
    },
    "3": {
      "planet": "Jupiter",
      "direction": "North-East",
      "distance": "Moderate – within locality / relative's place",
      "whereToLook": "Near books, prayer room, study table, bank/papers, with a teacher or elder relative",
      "personDescription": "Elder, respectable, well-educated, religious person, relative",
      "deity": "Lord Vishnu / Guru Dattatreya / Brihaspati",
      "mantra": "Om Gram Grim Graum Sah Gurave Namah",
      "timingUnit": "Months",
      "weekday": "Thursday",
      "significations": "Children, husband (for women), wealth, education, religion, law, banking",
      "businessIdeas": "Education, finance, banking, law, consulting, religious goods"
    },
    "4": {
      "planet": "Rahu",
      "direction": "South-West",
      "distance": "Far – outside / hard to trace",
      "whereToLook": "Hidden under things, electrical/electronic area, cluttered corners, may be taken by an outsider",
      "personDescription": "Outsider, unexpected or deceptive person, tech-savvy, unconventional",
      "deity": "Maa Durga / Bhairav",
      "mantra": "Om Ram Rahave Namah / Durga Kavach",
      "timingUnit": "Months",
      "weekday": "Saturday",
      "significations": "Foreign, sudden events, deception, theft, technology, speculation, confinement",
      "businessIdeas": "IT, electronics, import-export, foreign trade, research, aviation"
    },
    "5": {
      "planet": "Mercury",
      "direction": "North",
      "distance": "Near – recently moved by someone",
      "whereToLook": "Near phone, desk, vehicle, bag, documents, pockets; moved/misplaced by a family member",
      "personDescription": "Young person, talkative, clever, sibling/friend/known person",
      "deity": "Lord Ganesha / Vishnu",
      "mantra": "Om Gam Ganapataye Namah / Om Budhaya Namah",
      "timingUnit": "Days",
      "weekday": "Wednesday",
      "significations": "Business, communication, documents, siblings, trade, interviews, short trips",
      "businessIdeas": "Trading, sales, media, accounting, IT services, travel agency"
    },
    "6": {
      "planet": "Venus",
      "direction": "South-East",
      "distance": "Near – inside home",
      "whereToLook": "Bedroom, wardrobe, clothes, cosmetics/jewellery box, vehicle, with a woman",
      "personDescription": "Woman, well-dressed, charming, someone close / in the household",
      "deity": "Maa Lakshmi",
      "mantra": "Om Shreem Mahalakshmiyei Namah / Om Shukraya Namah",
      "timingUnit": "Weeks",
      "weekday": "Friday",
      "significations": "Marriage, love, vehicles, luxury, arts, women, home comforts",
      "businessIdeas": "Fashion, beauty, jewellery, films/media, hospitality, real estate, vehicles"
    },
    "7": {
      "planet": "Ketu",
      "direction": "West",
      "distance": "Far – may remain lost / confusing",
      "whereToLook": "Hidden inside clothes/bags, religious place, forgotten spot; confusion – may stay lost",
      "personDescription": "Hidden/unknown person, servant-like, secretive, spiritual looking",
      "deity": "Lord Ganesha / Lord Shiva",
      "mantra": "Om Ketave Namah / Ganesha Atharvashirsha",
      "timingUnit": "Weeks",
      "weekday": "Tuesday",
      "significations": "Spirituality, loss, detachment, hospital, separation, mystery, surgery",
      "businessIdeas": "Research, healing, occult, astrology, coding, NGOs"
    },
    "8": {
      "planet": "Saturn",
      "direction": "West",
      "distance": "Far – delayed find",
      "whereToLook": "Dark place, under heavy furniture, storeroom, basement, garage; with servant/worker",
      "personDescription": "Servant, worker, labourer, older, dark-complexioned, slow person",
      "deity": "Shani Dev / Lord Hanuman",
      "mantra": "Om Sham Shanaishcharaya Namah / Hanuman Chalisa",
      "timingUnit": "Months",
      "weekday": "Saturday",
      "significations": "Delays, land, debt, chronic disease, servants, layoffs, longevity, courts",
      "businessIdeas": "Real estate, construction, mining, oil, manpower, law, iron/steel"
    },
    "9": {
      "planet": "Mars",
      "direction": "South",
      "distance": "Moderate – in locality",
      "whereToLook": "Kitchen/fire area, near red items, tools, south side; taken in a hurry",
      "personDescription": "Aggressive young man, police/army type, sibling or relative, hasty",
      "deity": "Lord Hanuman / Kartikeya",
      "mantra": "Om Hanumate Namah / Om Kram Krim Kraum Sah Bhaumaya Namah",
      "timingUnit": "Days",
      "weekday": "Tuesday",
      "significations": "Property, courage, siblings, surgery, police, conflict, accidents, energy",
      "businessIdeas": "Real estate, engineering, security, sports, surgery, metals, fire/energy"
    }
  },
  "horaOrder": [
    8,
    3,
    9,
    1,
    6,
    5,
    2
  ],
  "horaDayStart": [
    3,
    6,
    2,
    5,
    1,
    4,
    0
  ],
  "weekdayLord": [
    1,
    2,
    9,
    5,
    3,
    6,
    8
  ],
  "industries": [
    {
      "industry": "IT / Software / Technology",
      "roots": "1,4,5"
    },
    {
      "industry": "Finance / Banking / Investment",
      "roots": "3,5,8"
    },
    {
      "industry": "Trading / Stock market / Commodities",
      "roots": "3,5"
    },
    {
      "industry": "Real estate / Construction / Infrastructure",
      "roots": "6,8,9"
    },
    {
      "industry": "Hospitality / Hotel / Restaurant / Food",
      "roots": "2,6"
    },
    {
      "industry": "Fashion / Beauty / Jewellery / Luxury",
      "roots": "6,3"
    },
    {
      "industry": "Media / Films / Advertising / Arts",
      "roots": "3,5,6"
    },
    {
      "industry": "Healthcare / Hospital / Pharma",
      "roots": "1,3,9"
    },
    {
      "industry": "Education / Coaching / Training",
      "roots": "3,5"
    },
    {
      "industry": "Consulting / Professional services",
      "roots": "1,3,5"
    },
    {
      "industry": "Manufacturing / Heavy industry / Steel",
      "roots": "4,8,9"
    },
    {
      "industry": "Travel / Tourism / Transport",
      "roots": "2,4,5"
    },
    {
      "industry": "Logistics / Courier / Supply chain",
      "roots": "4,5,8"
    },
    {
      "industry": "Legal / Law firm / Compliance",
      "roots": "3,8"
    },
    {
      "industry": "Retail / Shop / E-commerce",
      "roots": "3,5,6"
    },
    {
      "industry": "Import–export / Foreign trade",
      "roots": "4,5,7"
    },
    {
      "industry": "Automobile / Vehicles / Spares",
      "roots": "6,8,9"
    },
    {
      "industry": "Agriculture / Dairy / Liquids",
      "roots": "2,6,8"
    },
    {
      "industry": "Research / Spiritual / NGO / Astrology",
      "roots": "3,7,9"
    },
    {
      "industry": "Security / Defence / Sports / Engineering",
      "roots": "1,9"
    },
    {
      "industry": "Telecom / Electronics",
      "roots": "4,5"
    }
  ],
  "commercialMeaning": {
    "1": "Head office, leadership, govt dealings – strong brand authority",
    "2": "Service, partnerships, hospitality – calm but needs teamwork",
    "3": "Consulting, finance, education – growth & good reputation",
    "4": "Tech/R&D works; otherwise disputes, sudden ups & downs",
    "5": "Trade, sales, retail, communication – excellent cash flow",
    "6": "Luxury, retail, hospitality, design – attracts clients & comfort",
    "7": "Research, healing, spiritual – slow sales, isolation",
    "8": "Heavy industry, long-term projects – slow, delays, needs discipline",
    "9": "Manufacturing, real estate, energy – dynamic but conflicts"
  },
  "fancyVehicleNumbers": [
    "0001",
    "0007",
    "0009",
    "0786",
    "1008",
    "1111",
    "1212",
    "1234",
    "1313",
    "1515",
    "1818",
    "2020",
    "2222",
    "2727",
    "3030",
    "3333",
    "3636",
    "4141",
    "4444",
    "4545",
    "5050",
    "5555",
    "6006",
    "6060",
    "6666",
    "7007",
    "7070",
    "7777",
    "8080",
    "8888",
    "9009",
    "9090",
    "9999"
  ],
  "presetCities": [
    "Delhi",
    "New Delhi",
    "Mumbai",
    "Bengaluru",
    "Bangalore",
    "Chennai",
    "Kolkata",
    "Hyderabad",
    "Pune",
    "Ahmedabad",
    "Jaipur",
    "Lucknow",
    "Chandigarh",
    "Noida",
    "Gurugram",
    "Indore",
    "Bhopal",
    "Kochi",
    "Goa",
    "Nagpur",
    "Surat",
    "Vadodara",
    "Coimbatore",
    "Mysuru",
    "Dehradun",
    "Varanasi",
    "Patna",
    "Bhubaneswar",
    "Visakhapatnam",
    "Dubai",
    "Abu Dhabi",
    "Singapore",
    "London",
    "New York",
    "Toronto",
    "Sydney",
    "Melbourne",
    "Tel Aviv",
    "Berlin",
    "Frankfurt",
    "Amsterdam",
    "Paris",
    "San Francisco",
    "Tokyo",
    "Hong Kong"
  ]
};
