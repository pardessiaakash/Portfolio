// Answers Nova can give without the AI server: the suggestion chips, the
// "Ask AI" button on each slide, and simple questions about Akash. Built
// only from what's already on the site (About Me, the case-study slides),
// so nothing here is invented. Returns null when there's no good answer.

import { SC_TEXT, FA_TEXT, PF_TEXT, SC_TOPICS, FA_TOPICS, PF_TOPICS } from "../caseStudyText";
import { experiences, yearsInDesign } from "../AboutMe";
import { SITE } from "../siteConfig";

const STUDIES = [
  { name: "SwiftConnect", re: /swift/i, topics: SC_TOPICS, text: SC_TEXT },
  { name: "Chicora", re: /chicora|fashion/i, topics: FA_TOPICS, text: FA_TEXT },
  { name: "Portfolio", re: /portfolio|design lab/i, topics: PF_TOPICS, text: PF_TEXT },
];

const about = () => {
  const now = experiences[0];
  return `${SITE.name} is a ${SITE.role}, currently ${now.role} at ${now.company} (${now.period}). ` +
    `Before that: ${experiences.slice(1).map((e) => `${e.role} at ${e.company} (${e.period})`).join("; ")}. ` +
    "He completed UI/UX Design with Generative AI at IIIT Bangalore, and turns complex problems into clear, human-centred experiences.";
};
const caseStudies = () =>
  "Three UI/UX case studies are ready under Work → UI/UX:\n\n" +
  "• SwiftConnect: an AI-assisted support desk that removes handover delays for support agents.\n" +
  "• Chicora: a personalised, trustworthy fashion shopping app.\n" +
  "• Portfolio: how this immersive site was designed, tested, audited and improved on the road to VR.\n\n" +
  "Open one, and use Ask AI on any slide to learn more about it.";
// "Why Hire Akash": only what the site itself shows
const whyHire = () => {
  const yrs = yearsInDesign();
  return `${yrs} years in design, from junior graphic designer to art director (now at ${experiences[0].company}), so he owns both the UX and the visual craft.\n\n` +
    "• UX method you can check: the SwiftConnect and Chicora case studies walk through research, synthesis, IA & flows, hi-fi UI and usability testing, and say honestly what's validated and what isn't.\n" +
    "• Designing with AI: certified in UI/UX Design with Generative AI at IIIT Bangalore, and SwiftConnect is an AI-assisted product.\n" +
    "• Art direction: years of leading visual quality and teams before moving into UX.\n\n" +
    "Open Work → UI/UX for the case studies, or download his resume.";
};
const process = () =>
  "Both case studies follow the same path: understand the problem (brief, research, interviews), " +
  "synthesise it (affinity mapping, empathy maps, a clear problem statement), choose one primary solution " +
  "with supporting features, then design, test and say honestly what's validated and what still needs proof. " +
  "SwiftConnect, for example, went from a 50-person agent survey to an AI briefing that fixes context loss at handover.";

export function offlineAnswer(query) {
  const q = (query || "").trim();
  // "Tell me about the <topic> of the <name> case study." (Ask AI on a slide)
  const m = q.match(/^Tell me about the (.+) of the (.+) case study\.?$/i);
  if (m) {
    const s = STUDIES.find((x) => x.re.test(m[2]));
    const i = s ? s.topics.findIndex((t) => t.toLowerCase() === m[1].toLowerCase()) : -1;
    if (s && i >= 0) return `${s.text[i][0]}\n\n${s.text[i][1]}`;
  }
  const o = q.match(/^Give me an overview of the (.+) case study\.?$/i);
  if (o) {
    const s = STUDIES.find((x) => x.re.test(o[1]));
    if (s) return `${s.text[0][0]}\n\n${s.text[0][1]}`;
  }
  if (/^((view|best) case stud(y|ies)|case stud(y|ies)|projects?|work)$/i.test(q)) return caseStudies();
  if (/^why hire( akash)?\??$/i.test(q)) return whyHire();
  if (/^(about akash|who is akash\??|about)$/i.test(q)) return about();
  if (/^how i design$|design process/i.test(q)) return process();
  if (/^(start chat|(start )?guided tour|hi|hello|hey)$/i.test(q))
    return "Happy to help. Open Work → UI/UX for the SwiftConnect, Chicora and Portfolio case studies; on any slide, the Ask AI button tells you more about it. To talk to Akash directly, use the email or phone buttons.";
  return null;
}
