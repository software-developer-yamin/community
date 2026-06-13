import { randomUUID } from "node:crypto";
import { config } from "dotenv";

config({ path: "../../apps/server/.env" });

// Now import modules that depend on env vars
const { db } = await import("../src/index");
const { user } = await import("../src/schema/auth");
const { cefrPlacement, userProfileEmbedding } = await import(
  "../src/schema/models"
);
const { contentEmbedding, contentItem, userInteraction, userPreference } =
  await import("../src/schema/recommendations");

function randomEmbedding(dim = 384) {
  const vec = Array.from({ length: dim }, () => Math.random() * 2 - 1);
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / (mag || 1));
}

const demoContent = [
  {
    title: "Basic English Greetings",
    description:
      "Learn how to say hello, goodbye, and introduce yourself in English.",
    type: "video",
    cefrLevel: "A1",
    duration: 180,
    tags: ["greetings", "basics", "conversation"],
  },
  {
    title: "Ordering Food at a Restaurant",
    description:
      "Practice ordering meals, asking about ingredients, and paying the bill.",
    type: "dialogue",
    cefrLevel: "A1",
    duration: 240,
    tags: ["food", "restaurant", "daily-life"],
  },
  {
    title: "Describing Your Daily Routine",
    description:
      "Talk about your morning, work, and evening activities using simple present tense.",
    type: "exercise",
    cefrLevel: "A2",
    duration: 300,
    tags: ["routine", "daily-life", "grammar"],
  },
  {
    title: "Talking About Hobbies and Interests",
    description:
      "Express what you enjoy doing in your free time with expanded vocabulary.",
    type: "video",
    cefrLevel: "A2",
    duration: 360,
    tags: ["hobbies", "interests", "conversation"],
  },
  {
    title: "Giving Directions in a City",
    description:
      "Learn to ask for and give directions using prepositions and landmarks.",
    type: "dialogue",
    cefrLevel: "B1",
    duration: 420,
    tags: ["directions", "travel", "city"],
  },
  {
    title: "Discussing News and Current Events",
    description:
      "Practice expressing opinions on news topics with appropriate vocabulary.",
    type: "article",
    cefrLevel: "B1",
    duration: 600,
    tags: ["news", "opinion", "current-events"],
  },
  {
    title: "Debating Environmental Issues",
    description:
      "Engage in structured debates about climate change, pollution, and sustainability.",
    type: "exercise",
    cefrLevel: "B2",
    duration: 900,
    tags: ["environment", "debate", "advanced"],
  },
  {
    title: "Understanding Idioms and Cultural References",
    description:
      "Master common English idioms and cultural expressions used in media.",
    type: "video",
    cefrLevel: "B2",
    duration: 480,
    tags: ["idioms", "culture", "media"],
  },
  {
    title: "Academic Writing and Research Presentation",
    description:
      "Learn to structure arguments, cite sources, and present findings formally.",
    type: "article",
    cefrLevel: "C1",
    duration: 1200,
    tags: ["academic", "writing", "research"],
  },
  {
    title: "Negotiating in Business Settings",
    description:
      "Practice formal negotiation language, compromise strategies, and professional etiquette.",
    type: "dialogue",
    cefrLevel: "C1",
    duration: 720,
    tags: ["business", "negotiation", "professional"],
  },
  {
    title: "Analyzing Literary Texts and Poetry",
    description:
      "Deep dive into metaphor, symbolism, and thematic analysis of English literature.",
    type: "article",
    cefrLevel: "C2",
    duration: 1800,
    tags: ["literature", "poetry", "analysis"],
  },
  {
    title: "Simultaneous Interpretation Practice",
    description:
      "Advanced exercises in real-time translation and interpretation skills.",
    type: "exercise",
    cefrLevel: "C2",
    duration: 1500,
    tags: ["interpretation", "advanced", "translation"],
  },
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  // 1. Create admin user
  console.log("Creating admin user...");
  const adminUser = await db
    .insert(user)
    .values({
      id: randomUUID(),
      email: "admin@example.com",
      name: "Admin User",
      emailVerified: true,
      image: null,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: user.email })
    .returning();

  const adminUserId =
    adminUser[0]?.id ??
    (
      await db
        .select({ id: user.id })
        .from(user)
        .where(user.email.eq("admin@example.com"))
        .limit(1)
    )[0]?.id;

  if (!adminUserId) {
    throw new Error("Failed to create or find admin user");
  }
  console.log(`✓ Admin user: ${adminUserId}\n`);

  // 2. Create demo user
  console.log("Creating demo user...");
  const demoUser = await db
    .insert(user)
    .values({
      id: randomUUID(),
      email: "demo@example.com",
      name: "Demo Learner",
      emailVerified: true,
      image: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: user.email })
    .returning();

  const userId =
    demoUser[0]?.id ??
    (
      await db
        .select({ id: user.id })
        .from(user)
        .where(user.email.eq("demo@example.com"))
        .limit(1)
    )[0]?.id;

  if (!userId) {
    throw new Error("Failed to create or find demo user");
  }
  console.log(`✓ Demo user: ${userId}\n`);

  // 2. Create CEFR placement
  console.log("Creating CEFR placement...");
  await db
    .insert(cefrPlacement)
    .values({
      userId,
      level: "B1",
      score: 72,
      source: "mcq",
      modelVersion: "v1",
      createdAt: new Date(),
    })
    .onConflictDoNothing();
  console.log("✓ CEFR placement: B1\n");

  // 3. Create user profile embedding
  console.log("Creating user profile embedding...");
  await db
    .insert(userProfileEmbedding)
    .values({
      userId,
      embedding: randomEmbedding(),
      modelVersion: "v1",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userProfileEmbedding.userId,
      set: {
        embedding: randomEmbedding(),
        modelVersion: "v1",
        updatedAt: new Date(),
      },
    });
  console.log("✓ User profile embedding\n");

  // 4. Create user preferences
  console.log("Creating user preferences...");
  await db
    .insert(userPreference)
    .values({
      userId,
      interests: ["travel", "food", "daily-life"],
      goals: ["improve-conversation", "expand-vocabulary"],
      preferredTypes: ["video", "dialogue"],
      preferredCefr: "B1",
      dailyGoal: 20,
      notifications: {
        dailyReminder: true,
        newContent: true,
        progressUpdates: true,
      },
    })
    .onConflictDoUpdate({
      target: userPreference.userId,
      set: {
        interests: ["travel", "food", "daily-life"],
        goals: ["improve-conversation", "expand-vocabulary"],
        preferredTypes: ["video", "dialogue"],
        preferredCefr: "B1",
        dailyGoal: 20,
      },
    });
  console.log("✓ User preferences\n");

  // 5. Create content items
  console.log("Creating content items...");
  await db
    .insert(contentItem)
    .values(
      demoContent.map((c) => ({
        ...c,
        sourceUrl: null,
        thumbnailUrl: null,
        metadata: null,
      }))
    )
    .onConflictDoNothing();

  const allContent = await db.select({ id: contentItem.id }).from(contentItem);
  console.log(`✓ ${allContent.length} content items\n`);

  // 6. Create content embeddings
  console.log("Creating content embeddings...");
  for (const item of allContent) {
    await db
      .insert(contentEmbedding)
      .values({
        contentId: item.id,
        embedding: randomEmbedding(),
        modelVersion: "v1",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: contentEmbedding.contentId,
        set: {
          embedding: randomEmbedding(),
          modelVersion: "v1",
          updatedAt: new Date(),
        },
      });
  }
  console.log("✓ Content embeddings\n");

  // 7. Create some user interactions
  console.log("Creating user interactions...");
  const likedItems = allContent.slice(0, 2);
  for (const item of likedItems) {
    await db
      .insert(userInteraction)
      .values({
        userId,
        contentId: item.id,
        action: "like",
        value: null,
        metadata: null,
      })
      .onConflictDoNothing();
  }
  console.log("✓ User interactions (2 likes)\n");

  console.log("🎉 Seed complete!");
  console.log("\nNext steps:");
  console.log("1. Start the server: pnpm run dev:server");
  console.log(
    "2. Test recommendations: POST /rpc/recommendations/getRecommendations"
  );
  console.log(
    "3. The demo user can be authenticated via email: demo@example.com"
  );
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
