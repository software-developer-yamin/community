/**
 * Shadow-mode runner: invokes both stacks, returns primary result, logs both.
 * Used during rollout to compare F8.1 vs F8.2 on real traffic without user impact.
 */

import { createHash } from "node:crypto";
import { db } from "@community/db";
import { modelInferenceLog } from "@community/db/schema/models";
import { getStackUrls } from "./model-stack";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface ShadowOpts {
  callKind: "cefr-grade" | "pron-score" | "match-embed";
  inputForHash: string;
  primary: "f8.1" | "f8.2";
  primaryFn: (urls: ReturnType<typeof getStackUrls>) => Promise<unknown>;
  shadow: "f8.1" | "f8.2" | null;
  shadowFn?: (urls: ReturnType<typeof getStackUrls>) => Promise<unknown>;
  userId: string;
}

export async function runWithShadow<T>(opts: ShadowOpts): Promise<T> {
  const started = Date.now();
  const primaryUrls = getStackUrls(opts.primary);
  const primaryResult = (await opts.primaryFn(primaryUrls)) as T;

  // Log primary
  await db.insert(modelInferenceLog).values({
    modelName: `${opts.primary}:${opts.callKind}`,
    inputHash: sha256(opts.inputForHash),
    latencyMs: Date.now() - started,
    userId: opts.userId,
    callKind: opts.callKind,
    metadata: { shadow: false },
  });

  // Fire-and-forget shadow if enabled
  if (opts.shadow && opts.shadowFn) {
    const shadowStarted = Date.now();
    opts
      .shadowFn(getStackUrls(opts.shadow))
      .then(() =>
        db.insert(modelInferenceLog).values({
          modelName: `${opts.shadow}:${opts.callKind}`,
          inputHash: sha256(opts.inputForHash),
          latencyMs: Date.now() - shadowStarted,
          userId: opts.userId,
          callKind: opts.callKind,
          metadata: { shadow: true },
        })
      )
      .catch((err) => console.error(`[shadow] ${opts.callKind} failed:`, err));
  }

  return primaryResult;
}

// re-export for tree-shaking clarity
export type { ModelStack } from "./model-stack";
