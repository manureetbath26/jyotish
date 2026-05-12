// ─────────────────────────────────────────────────────────────────────────────
// LangGraph pipeline — Interpreter → Data Collector → Astrologer
// ─────────────────────────────────────────────────────────────────────────────

import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { interpreterNode } from "./interpreterNode";
import { dataCollectorNode } from "./dataCollectorNode";
import { astrologerNode } from "./astrologerNode";
import type { AstroChatStateShape, Intent, AstrologyData, BirthData } from "./types";
import type { ChartResponse } from "@/lib/api";

// ── State schema using Annotation ────────────────────────────────────────────

const AstroChatState = Annotation.Root({
  chart:         Annotation<ChartResponse>(),
  birthData:     Annotation<BirthData>(),
  userMessage:   Annotation<string>(),
  intent:        Annotation<Intent | null>(),
  astrologyData: Annotation<AstrologyData | null>(),
  finalAnswer:   Annotation<string>(),
  error:         Annotation<string | null>(),
});

// ── Graph wiring ─────────────────────────────────────────────────────────────

export const astroChatGraph = new StateGraph(AstroChatState)
  .addNode("interpreter",    interpreterNode)
  .addNode("dataCollector",  dataCollectorNode)
  .addNode("astrologer",     astrologerNode)
  .addEdge(START, "interpreter")
  .addEdge("interpreter", "dataCollector")
  .addEdge("dataCollector", "astrologer")
  .addEdge("astrologer", END)
  .compile();

// ── Input factory ────────────────────────────────────────────────────────────

export function makeInitialState(
  chart: ChartResponse,
  birthData: BirthData,
  userMessage: string,
): AstroChatStateShape {
  return {
    chart,
    birthData,
    userMessage,
    intent:        null,
    astrologyData: null,
    finalAnswer:   "",
    error:         null,
  };
}
