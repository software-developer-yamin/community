/*
 * AceFluency / Illustrative trainer-marketplace data
 *
 * Illustrative until the trainer-marketplace endpoint lands
 * (ARCHITECTURE.md §2.4, Phase 2). Shapes and values are calibrated against
 * real copy in docs/screenshots.md (entries 30, 35-38, 52-53) so the UI is
 * built against realistic fidelity, not placeholder lorem ipsum.
 *
 * Centralized here (rather than duplicated per-screen like `classes/index.tsx`'s
 * `TRIAL_TUTOR`) because the trainer marketplace spans many screens
 * (discovery, search, profile, booking, chat) that all need the same
 * trainer identities to stay consistent across a single illustrative flow.
 */

export interface Trainer {
  available: boolean;
  bio: string;
  experienceYears: number;
  id: string;
  languages: string[];
  name: string;
  nextSlot: string;
  photoUri?: string;
  rating: number;
  sessionsCount: number;
  specialties: string[];
  verified: boolean;
}

export const ILLUSTRATIVE_TRAINERS: Trainer[] = [
  {
    id: "raj",
    name: "Raj",
    rating: 4.8,
    sessionsCount: 19_101,
    verified: true,
    available: true,
    specialties: ["Vocabulary", "IELTS Speaking", "Public Speaking", "Grammar"],
    languages: ["English", "Hindi", "Gujarati"],
    experienceYears: 8,
    nextSlot: "8:00 AM · Today",
    bio: "TESOL-certified trainer based in Ahmedabad, Gujarat, with 8 years of experience specializing in grammar, English proficiency, and overcoming stage fear and shyness in spoken English. Motivating learners to unlock their full potential is at the heart of my teaching philosophy — clarity of speech, precise articulation, and a strong emotional connection. My interactive, learner-centered approach ensures students gain confidence and mastery in their language skills.",
  },
  {
    id: "mira",
    name: "Mira",
    rating: 4.8,
    sessionsCount: 3412,
    verified: true,
    available: true,
    specialties: ["Conversation", "Grammar", "Interview Prep"],
    languages: ["English", "Bengali"],
    experienceYears: 5,
    nextSlot: "8:30 AM · Today",
    bio: "Conversation-first coach who builds fluency through everyday scenarios — ordering food, job interviews, small talk. Focused on making nervous beginners comfortable speaking out loud in the first session.",
  },
  {
    id: "tarranum",
    name: "Tarranum",
    rating: 4.9,
    sessionsCount: 63,
    verified: true,
    available: true,
    specialties: ["Interview Skills", "Vocabulary", "Public Speaking"],
    languages: ["English", "Urdu", "Hindi"],
    experienceYears: 3,
    nextSlot: "6:00 PM · Today",
    bio: "Early-career trainer specializing in interview readiness and public-speaking confidence for job seekers and students preparing for campus placements.",
  },
  {
    id: "krisha",
    name: "Krisha",
    rating: 4.5,
    sessionsCount: 7159,
    verified: true,
    available: true,
    specialties: ["Conversation", "Pronunciation"],
    languages: ["Hindi", "English"],
    experienceYears: 6,
    nextSlot: "7:00 PM · Today",
    bio: "Patient, energetic trainer who focuses on pronunciation drills and real-time correction during free conversation practice.",
  },
  {
    id: "liza",
    name: "Liza",
    rating: 4.2,
    sessionsCount: 3759,
    verified: false,
    available: true,
    specialties: ["Grammar", "Writing"],
    languages: ["Bengali", "English"],
    experienceYears: 4,
    nextSlot: "9:00 PM · Today",
    bio: "Grammar-focused trainer helping learners move from textbook English to natural, confident sentences in daily conversation.",
  },
  {
    id: "ayesha",
    name: "Ayesha",
    rating: 4.0,
    sessionsCount: 1471,
    verified: false,
    available: false,
    specialties: ["Conversation", "Vocabulary"],
    languages: ["Hindi", "English"],
    experienceYears: 2,
    nextSlot: "Fully booked today",
    bio: "New trainer building a following through relaxed, judgment-free conversation sessions for absolute beginners.",
  },
];

export function getTrainerById(id: string): Trainer | undefined {
  return ILLUSTRATIVE_TRAINERS.find((trainer) => trainer.id === id);
}
