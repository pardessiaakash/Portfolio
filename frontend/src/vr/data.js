// What the VR lab shows: the same case studies, About Me and contact
// details as the website, read from the site's own data files.
import { SC_TOPICS, FA_TOPICS, PF_TOPICS, MV_TOPICS } from "../caseStudyText";
import { experiences, yearsInDesign, SKILLS, CERTIFICATION } from "../profileData";
import { SITE } from "../siteConfig";

const asset = (p) => `${process.env.PUBLIC_URL || ""}${p}`;
const slides = (folder, n) => Array.from({ length: n }, (_, i) =>
  asset(`/assets/images/projects/${folder}/${String(i + 1).padStart(2, "0")}.webp`));

export const STUDIES = {
  "UI/UX": [
    { title: "SwiftConnect", line: "AI-assisted support desk", slides: slides("swiftconnect", SC_TOPICS.length), topics: SC_TOPICS },
    { title: "Chicora", line: "Fashion shopping app", slides: slides("chicora", FA_TOPICS.length), topics: FA_TOPICS },
    { title: "Portfolio", line: "This immersive site", slides: slides("portfolio", PF_TOPICS.length), topics: PF_TOPICS },
  ],
  Immersive: [
    { title: "Mandala Vision Pro", line: "Design system for Vision Pro", slides: slides("mandala-vision-pro", MV_TOPICS.length), topics: MV_TOPICS },
  ],
  "Social Media": [],
  Videos: [],
};
export const CATEGORIES = ["UI/UX", "Social Media", "Videos", "Immersive"];

export const PROFILE = {
  name: SITE.name,
  role: "UI/UX Designer, Art Director",
  years: yearsInDesign(),
  experiences,
  skills: SKILLS,
  cert: CERTIFICATION,
  email: SITE.email,
};

export const FONT = {
  regular: asset("/assets/vr/fonts/montserrat-latin-400-normal.woff"),
  semibold: asset("/assets/vr/fonts/montserrat-latin-600-normal.woff"),
  bold: asset("/assets/vr/fonts/montserrat-latin-700-normal.woff"),
};
export const LAB_MODEL = asset("/assets/vr/lab.glb");
