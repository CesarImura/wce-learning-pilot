// Mentors appear as a byline on courses; the topic coin, not their photo, identifies the content.

export type Mentor = { name: string; title: string; photo?: string }

export const MENTORS: Record<string, Mentor> = {
  "Andrea Cimitan": { name: "Andrea Cimitan", title: "Pro Trader & Founder of DeepCharts", photo: "/wce/mentors/andrea-cimitan.jpg" },
  "Fabio Valentini": { name: "Fabio Valentini", title: "Multiple Vice World Champion in Trading" },
}

export const mentorOf = (name?: string): Mentor | undefined =>
  name ? (MENTORS[name] ?? { name, title: "WCE Mentor" }) : undefined
