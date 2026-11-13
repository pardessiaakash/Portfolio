// Facts about Akash shown on the site (About Me, home screen) in one plain
// data module, so Nova's AI server can read the same facts the page shows.
// No React here: the serverless function in /nova imports this file.

export const experiences = [
  { company: "Publicis Sapient", role: "Art Director", period: "2022 – Present" },
  { company: "Evonix", role: "Art Director", period: "2019 – 2022" },
  { company: "Creative Studio", role: "Project Manager", period: "2018 – 2019" },
  { company: "SRV Media", role: "Assistant Manager", period: "2015 – 2018" },
  { company: "Affinity Express", role: "Sr. Designer", period: "2012 – 2015" },
  // first role (offer letter dated 1 January 2011)
  { company: "Mancers Info Services", role: "Jr. Graphic Designer", period: "2011 – 2012" },
];

/* ── About Me content (what a UX hiring manager / HR scans for first) ──
   Built only from facts already on the site: the roles above, the IIIT-B
   certification, and the methods shown in the case studies. */
// first day in design: Jr. Graphic Designer at Mancers Info Services
export const CAREER_START = 2011;
const CAREER_START_DATE = new Date(2011, 0, 1);
// full years completed (15 on 1 Jan 2026, 16 on 1 Jan 2027, …)
export const yearsInDesign = () => {
  const now = new Date();
  let y = now.getFullYear() - CAREER_START_DATE.getFullYear();
  if (now < new Date(now.getFullYear(), CAREER_START_DATE.getMonth(), CAREER_START_DATE.getDate())) y -= 1;
  return y;
};
// role line under the header (replaces "Welcome to the Portfolio!")
export const ROLE_LINE = "UI/UX Designer, Art Director";
export const WORK_COPY = "Each case study shows the problem, my decisions and the outcome. Start with UI/UX work.";
export const aboutBio = () =>
  `${yearsInDesign()} years in design, from art direction to UX. I simplify complex products with generative AI.`;
export const snapshot = () => [
  { value: `${yearsInDesign()} years`, label: `In design, since ${CAREER_START}` },
  { value: "UX + Visual", label: "Research to final pixel" },
  { value: "Open to roles", label: "UX & Product Design" },
];
// the methods the case studies walk through, plus the craft from art direction
export const SKILLS = ["Research", "Synthesis", "IA & flows", "Hi-fi UI", "Usability testing", "Art direction", "Design with GenAI"];
// recent roles in full; the early years folded into one line
export const EARLIER = {
  company: "2011 – 2019",
  role: "Graphic Designer → Project Manager",
  period: "Mancers, Affinity Express, SRV Media, Creative Studio",
};
export const SELECTED_WORK = [
  { title: "SwiftConnect", text: "AI-assisted support desk", path: `/portfolio/${encodeURIComponent("UI/UX")}?project=swiftconnect` },
  { title: "Chicora", text: "Fashion shopping app", path: `/portfolio/${encodeURIComponent("UI/UX")}?project=chicora` },
  { title: "Portfolio", text: "This immersive site", path: `/portfolio/${encodeURIComponent("UI/UX")}?project=portfolio` },
  { title: "Mandala Vision Pro", text: "Design system for Vision Pro", path: `/portfolio/Immersive?project=mandala-vision-pro` },
];
export const RESUME_LINE = "Every role and project, in detail.";

// certification shown on About Me
export const CERTIFICATION = {
  title: "UI/UX Design with Generative AI",
  school: "International Institute of Information Technology Bangalore (IIIT-B)",
};
