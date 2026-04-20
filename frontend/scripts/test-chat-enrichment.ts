/**
 * Test the chat enrichment on the user's chart for a few sample questions.
 * Run: npx tsx scripts/test-chat-enrichment.ts
 */

import "dotenv/config";
import fs from "node:fs";
import type { ChartResponse } from "../src/lib/api";
import { generateLifeEventsReport } from "../src/lib/lifeEventsReport";
import { answerAstrologyQuestion } from "../src/lib/chatEngine";
import { computeChatEnrichment } from "../src/lib/chatEnrichment";

async function main() {
  const chart = JSON.parse(
    fs.readFileSync("C:\\Users\\manur\\AppData\\Local\\Temp\\chart.json", "utf-8"),
  ) as ChartResponse;

  const report = generateLifeEventsReport(chart);
  const enriched = await computeChatEnrichment(chart);

  const questions = [
    "When will I get married?",
    "Can I start a business?",
    "How is my career looking?",
    "Tell me about my children",
  ];

  for (const q of questions) {
    console.log("\n" + "=".repeat(70));
    console.log("Q:", q);
    console.log("=".repeat(70));
    const { answer } = answerAstrologyQuestion(q, chart, report, enriched);
    console.log(answer);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
