// Everything about the site owner and the live deployment in one place.
// Values that differ per deployment come from environment variables set on
// the host (Vercel / Netlify: Project settings → Environment variables),
// so nothing here needs editing when they change.

const env = (k) => (process.env[k] || "").trim();

export const SITE = {
  name: "Akash P",
  role: "UI/UX Designer & Art Director",
  email: "pardessiaakash@gmail.com",
  phone: "+919011566393",
  behance: "https://www.behance.net/pardessiaaec66",
  dribbble: "https://dribbble.com/pardessiaakash",
  // Your LinkedIn profile, e.g. https://www.linkedin.com/in/your-name
  linkedin: env("REACT_APP_LINKEDIN_URL"),
  // Put the PDF in frontend/public under this name, or point this at a
  // hosted copy (e.g. a Google Drive download link).
  resumeUrl: env("REACT_APP_RESUME_URL") || "/Akash-P-Resume.pdf",
  resumeFileName: "Akash-P-Resume.pdf",
  // Optional booking link for "Let's talk" (e.g. a Calendly page); without
  // it, "Let's talk" opens a pre-filled email.
  contactUrl: env("REACT_APP_CONTACT_URL"),
};

// Pre-filled email for the "Let's talk" call to action.
export const contactMailto = (topic) => {
  const subject = topic ? `Let's talk: ${topic}` : "Let's talk";
  const body = "Hi Akash,\n\nI saw your portfolio and would like to talk about ";
  return `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const letsTalkHref = (topic) => SITE.contactUrl || contactMailto(topic);

export const resumeRequestMailto = () =>
  `mailto:${SITE.email}?subject=${encodeURIComponent("Resume request")}&body=${encodeURIComponent("Hi Akash,\n\nCould you send me your latest resume?\n\nThanks,")}`;

// Web links open in a new tab (and say so to screen readers); phone and
// email links open the app directly, without an empty tab.
export const externalLinkProps = (href, label) => /^https?:/.test(href)
  ? { target: "_blank", rel: "noopener noreferrer", "aria-label": `${label} (opens in a new tab)` }
  : { "aria-label": label };
