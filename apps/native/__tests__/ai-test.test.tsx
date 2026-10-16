import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_ROOT = process.cwd();
const read = (relative: string) =>
  readFileSync(join(APP_ROOT, relative), "utf8");

describe("AI Speaking Test - Source & Flow Contracts", () => {
  const indexSource = read("app/ai-test/index.tsx");
  const recordSource = read("app/ai-test/record/[topicId].tsx");

  describe("Topics Screen (app/ai-test/index.tsx)", () => {
    it("includes back navigation button in header", () => {
      expect(indexSource).toContain('accessibilityLabel="Go back"');
      expect(indexSource).toContain("router.back()");
      expect(indexSource).toContain("AI Speaking Test");
    });

    it("defines multi-category topic filters", () => {
      expect(indexSource).toContain('"All"');
      expect(indexSource).toContain('"Personal"');
      expect(indexSource).toContain('"Place"');
      expect(indexSource).toContain('"Food"');
      expect(indexSource).toContain('"Career"');
    });

    it("links topic start buttons to the record screen route", () => {
      expect(indexSource).toContain("/ai-test/record/");
      expect(indexSource).toContain('name="arrow-forward"');
    });
  });

  describe("Recording & Results Screen (app/ai-test/record/[topicId].tsx)", () => {
    it("includes back navigation header with topic title", () => {
      expect(recordSource).toContain('accessibilityLabel="Go back"');
      expect(recordSource).toContain("router.back()");
      expect(recordSource).toContain("{topic.title}");
    });

    it("implements four phases: idle, recording, analyzing, and results", () => {
      expect(recordSource).toContain(
        'type Phase = "idle" | "recording" | "analyzing" | "results"'
      );
      expect(recordSource).toContain("const RECORD_SECONDS = 60");
      expect(recordSource).toContain("const URGENT_THRESHOLD_S = 20");
    });

    it("renders waveform and urgent countdown during recording", () => {
      expect(recordSource).toContain("theme.gradients.practice");
      expect(recordSource).toContain("styles.timerRingUrgent");
      expect(recordSource).toContain("Stop speaking");
      expect(recordSource).toContain("s left!");
    });

    it("renders performance score breakdown and error corrections in results", () => {
      expect(recordSource).toContain("Performance scores");
      expect(recordSource).toContain("<ProgressBar");
      expect(recordSource).toContain("Errors found");
      expect(recordSource).toContain("styles.errorIncorrect");
      expect(recordSource).toContain("styles.errorCorrected");
    });

    it("provides Try Again and Choose Another Topic action buttons in results", () => {
      expect(recordSource).toContain("Try Again");
      expect(recordSource).toContain('setPhase("idle")');
      expect(recordSource).toContain("Choose Another Topic");
      expect(recordSource).toContain('router.push("/ai-test")');
    });
  });
});
