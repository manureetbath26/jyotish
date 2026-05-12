// ─────────────────────────────────────────────────────────────────────────────
// Data Collector Node — deterministically assembles all engine data
//
// No LLM calls. Calls existing chart engines based on intent.
// ─────────────────────────────────────────────────────────────────────────────

import { collectAstrologyData } from "./tools";
import type { AstroChatStateShape } from "./types";

export async function dataCollectorNode(
  state: AstroChatStateShape,
): Promise<Partial<AstroChatStateShape>> {
  if (!state.intent) {
    return { error: "No intent — cannot collect data" };
  }

  try {
    const astrologyData = await collectAstrologyData(state.chart, state.intent);
    return { astrologyData };
  } catch (err) {
    return {
      error: `Data collector failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
