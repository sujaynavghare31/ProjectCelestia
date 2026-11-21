export interface HoraryQuestion {
  key: string;
  label: string;
  cusp: number;
  secondaryCusp?: number;
  favourable: readonly number[];
  negative: readonly number[];
  keywords: readonly string[];
}

export const HORARY_QUESTION_GROUPS = [
  { group: "Marriage & Relationship", questions: [
    { key: "marriage", label: "Marriage (will I marry?)", cusp: 7, favourable: [2, 7, 11], negative: [1, 6, 10], keywords: ["marry", "marriage", "shaadi", "vivah"] },
    { key: "love_marriage", label: "Love marriage", cusp: 7, secondaryCusp: 5, favourable: [2, 5, 7, 11], negative: [1, 6, 10, 12], keywords: ["love marriage", "love"] },
    { key: "marriage_specific", label: "Marriage with a specific person", cusp: 7, favourable: [2, 7, 11], negative: [1, 6, 10], keywords: ["marry him", "marry her", "with this person"] },
    { key: "engagement", label: "Engagement", cusp: 7, favourable: [2, 7, 11], negative: [1, 6, 10], keywords: ["engagement", "sagai", "roka"] },
    { key: "second_marriage", label: "Second marriage", cusp: 7, favourable: [2, 7, 9, 11], negative: [1, 6, 10], keywords: ["second marriage", "remarry", "remarriage"] },
    { key: "divorce", label: "Separation / divorce", cusp: 7, favourable: [1, 6, 10, 12], negative: [2, 7, 11], keywords: ["divorce", "separation", "separate", "talaq"] },
    { key: "reunion", label: "Reunion after separation", cusp: 7, favourable: [2, 7, 11], negative: [1, 6, 10, 12], keywords: ["reunite", "come back", "patch up"] },
    { key: "love_affair", label: "Love affair success", cusp: 5, favourable: [5, 7, 11], negative: [1, 6, 10, 12], keywords: ["relationship", "affair", "proposal"] },
  ] },
  { group: "Job & Career", questions: [
    { key: "job", label: "Get a job", cusp: 10, secondaryCusp: 6, favourable: [2, 6, 10, 11], negative: [1, 5, 9, 12], keywords: ["job", "employment", "naukri", "get job"] },
    { key: "offer_letter", label: "Offer letter / appointment", cusp: 10, secondaryCusp: 3, favourable: [2, 3, 6, 10, 11], negative: [1, 5, 9, 12], keywords: ["offer letter", "appointment letter", "joining"] },
    { key: "interview", label: "Interview selection", cusp: 10, secondaryCusp: 6, favourable: [2, 6, 10, 11], negative: [5, 8, 12], keywords: ["interview", "selection", "shortlist"] },
    { key: "government_job", label: "Government job", cusp: 10, favourable: [2, 6, 10, 11], negative: [5, 8, 12], keywords: ["government job", "sarkari", "psc", "upsc"] },
    { key: "promotion", label: "Promotion", cusp: 10, favourable: [2, 6, 10, 11], negative: [5, 8, 12], keywords: ["promotion", "raise post"] },
    { key: "salary_hike", label: "Salary hike", cusp: 6, favourable: [2, 6, 11], negative: [5, 8, 12], keywords: ["salary", "hike", "increment"] },
    { key: "transfer", label: "Transfer", cusp: 10, secondaryCusp: 3, favourable: [3, 10, 12], negative: [4, 11], keywords: ["transfer", "relocation"] },
    { key: "job_loss", label: "Job loss / termination", cusp: 10, favourable: [1, 5, 9, 12], negative: [2, 6, 10, 11], keywords: ["job loss", "fired", "termination", "layoff", "lose job"] },
    { key: "resignation", label: "Resignation / job change", cusp: 10, favourable: [5, 9, 10, 11], negative: [2, 6], keywords: ["resign", "change job", "switch"] },
  ] },
  { group: "Business & Finance", questions: [
    { key: "business", label: "Start a business", cusp: 7, secondaryCusp: 10, favourable: [7, 10, 11, 2], negative: [5, 8, 12], keywords: ["business", "startup", "venture"] },
    { key: "partnership", label: "Partnership", cusp: 7, favourable: [2, 7, 11], negative: [6, 8, 12], keywords: ["partner", "partnership"] },
    { key: "profit", label: "Profit in business / deal", cusp: 11, favourable: [2, 6, 10, 11], negative: [5, 8, 12], keywords: ["profit", "deal", "contract"] },
    { key: "money", label: "Money / loan received", cusp: 11, secondaryCusp: 6, favourable: [2, 6, 11], negative: [5, 8, 12], keywords: ["money", "loan", "finance"] },
    { key: "money_recovery", label: "Recovery of money lent", cusp: 6, favourable: [2, 6, 11], negative: [5, 8, 12], keywords: ["money back", "recover money", "lent"] },
    { key: "speculation", label: "Speculation / shares / lottery", cusp: 5, favourable: [2, 5, 11], negative: [8, 12], keywords: ["shares", "stock", "lottery", "trading", "crypto"] },
  ] },
  { group: "Travel & Foreign", questions: [
    { key: "short_travel", label: "Short travel", cusp: 3, favourable: [3, 9, 11], negative: [2, 4, 8], keywords: ["trip", "travel", "journey", "tour"] },
    { key: "foreign_travel", label: "Foreign travel", cusp: 12, secondaryCusp: 9, favourable: [3, 9, 12], negative: [4, 8], keywords: ["abroad", "foreign", "travel abroad", "overseas"] },
    { key: "visa", label: "Visa approval", cusp: 12, favourable: [3, 9, 11, 12], negative: [4, 8], keywords: ["visa"] },
    { key: "settle_abroad", label: "Settle abroad / PR", cusp: 12, favourable: [3, 9, 12], negative: [2, 4, 11], keywords: ["settle abroad", "pr", "green card", "immigration"] },
    { key: "return_traveller", label: "Return of a traveller", cusp: 4, favourable: [2, 4, 11], negative: [3, 9, 12], keywords: ["return home", "come back home"] },
    { key: "pilgrimage", label: "Pilgrimage", cusp: 9, favourable: [3, 9, 12], negative: [4, 8], keywords: ["pilgrimage", "yatra", "tirth"] },
  ] },
  { group: "Education", questions: [
    { key: "exam_pass", label: "Exam pass", cusp: 4, secondaryCusp: 9, favourable: [4, 9, 11], negative: [3, 8, 12], keywords: ["exam", "pass", "result"] },
    { key: "admission", label: "Admission", cusp: 4, favourable: [4, 9, 11], negative: [3, 5, 8], keywords: ["admission", "college", "university"] },
    { key: "higher_studies", label: "Higher studies", cusp: 9, favourable: [4, 9, 11], negative: [3, 8, 12], keywords: ["masters", "phd", "higher studies"] },
    { key: "study_abroad", label: "Study abroad", cusp: 9, secondaryCusp: 12, favourable: [4, 9, 11, 12], negative: [3, 8], keywords: ["study abroad"] },
    { key: "competitive_exam", label: "Competitive exam / rank", cusp: 6, favourable: [4, 6, 9, 11], negative: [5, 8, 12], keywords: ["competitive", "neet", "jee", "cat", "gate"] },
  ] },
  { group: "Children", questions: [
    { key: "pregnancy", label: "Conception / pregnancy", cusp: 5, favourable: [2, 5, 11], negative: [1, 4, 10], keywords: ["pregnant", "conceive", "child"] },
    { key: "childbirth", label: "Safe child birth", cusp: 5, favourable: [2, 5, 11], negative: [1, 4, 8, 10, 12], keywords: ["delivery", "childbirth"] },
    { key: "adoption", label: "Adoption", cusp: 5, favourable: [5, 11], negative: [1, 4, 10], keywords: ["adopt", "adoption"] },
  ] },
  { group: "Property & Vehicle", questions: [
    { key: "buy_property", label: "Buy property / house", cusp: 4, favourable: [4, 11, 12], negative: [3, 5, 10], keywords: ["buy house", "property", "flat", "plot"] },
    { key: "sell_property", label: "Sell property", cusp: 4, secondaryCusp: 10, favourable: [3, 10, 11], negative: [4, 12], keywords: ["sell house", "sell property"] },
    { key: "buy_vehicle", label: "Buy vehicle", cusp: 4, favourable: [4, 11, 12], negative: [3, 8], keywords: ["car", "bike", "vehicle"] },
    { key: "rent", label: "Get on rent / tenant", cusp: 4, favourable: [4, 11], negative: [3, 12], keywords: ["rent", "tenant"] },
  ] },
  { group: "Health", questions: [
    { key: "recovery", label: "Recovery from illness", cusp: 1, favourable: [1, 5, 11], negative: [6, 8, 12], keywords: ["recover", "recovery", "illness", "cure"] },
    { key: "surgery", label: "Surgery success", cusp: 1, secondaryCusp: 8, favourable: [1, 5, 11], negative: [6, 8, 12], keywords: ["surgery", "operation"] },
    { key: "hospitalisation", label: "Hospitalisation", cusp: 12, favourable: [6, 8, 12], negative: [1, 5, 11], keywords: ["hospital", "admitted"] },
  ] },
  { group: "Legal", questions: [
    { key: "win_court_case", label: "Win court case", cusp: 6, favourable: [1, 6, 11], negative: [5, 7, 8, 12], keywords: ["case", "court", "litigation", "lawsuit", "win the case"] },
    { key: "bail", label: "Bail / release from jail", cusp: 12, favourable: [1, 5, 11], negative: [8, 12], keywords: ["bail", "jail", "release"] },
    { key: "police", label: "Police matter resolved", cusp: 6, favourable: [6, 11], negative: [8, 12], keywords: ["police", "fir"] },
  ] },
  { group: "Lost & Found", questions: [
    { key: "lost_article", label: "Lost article found", cusp: 2, favourable: [2, 6, 11], negative: [5, 8, 12], keywords: ["lost", "missing item", "find"] },
    { key: "theft_recovery", label: "Theft recovery", cusp: 2, favourable: [2, 6, 11], negative: [5, 8, 12], keywords: ["theft", "stolen"] },
    { key: "missing_person", label: "Missing person returns", cusp: 4, favourable: [2, 4, 11], negative: [3, 8, 12], keywords: ["missing person", "run away"] },
  ] },
  { group: "Others", questions: [
    { key: "election", label: "Win election", cusp: 10, favourable: [6, 10, 11], negative: [5, 8, 12], keywords: ["election", "vote"] },
    { key: "competition", label: "Win competition / sports", cusp: 6, favourable: [3, 6, 10, 11], negative: [5, 8, 12], keywords: ["match", "competition", "tournament"] },
    { key: "government_approval", label: "Government favour / approval", cusp: 10, favourable: [10, 11], negative: [5, 9, 12], keywords: ["approval", "sanction", "licence"] },
  ] },
] as const satisfies readonly { group: string; questions: readonly HoraryQuestion[] }[];

export type HoraryQuestionKey = (typeof HORARY_QUESTION_GROUPS)[number]["questions"][number]["key"];
export const HORARY_QUESTIONS = Object.fromEntries(
  HORARY_QUESTION_GROUPS.flatMap(({ questions }) => questions.map((question) => [question.key, question])),
) as unknown as Record<HoraryQuestionKey, HoraryQuestion>;

export function detectQuestionCategory(text: string): HoraryQuestionKey | null {
  const normalized = text.toLocaleLowerCase().trim();
  if (!normalized) return null;

  let match: { key: HoraryQuestionKey; length: number } | null = null;
  for (const { questions } of HORARY_QUESTION_GROUPS) {
    for (const question of questions) {
      for (const keyword of question.keywords) {
        const normalizedKeyword = keyword.toLocaleLowerCase();
        if (normalized.includes(normalizedKeyword) && (!match || normalizedKeyword.length > match.length)) {
          match = { key: question.key, length: normalizedKeyword.length };
        }
      }
    }
  }
  return match?.key ?? null;
}
