# Add a new transit rule type to the daily engine

Add classical rules for a new transit dimension and wire it into the daily reading.
Transit rule type (e.g. "Saturn Gochara by house", "Venus sign transit"): **$ARGUMENTS**

## The full pipeline

### 1. Rule table
Follow `/new-rule-table` for the Prisma model + seed + cache + API route.

Rule table design guidance:
- **Per-house rules** (e.g. planet X in house 1..12): `house Int`, `tone String`, `effect String`, `detail String`
- **Per-sign rules** (e.g. planet in Aries..Pisces): `sign String`, `tone String`, ...
- **From-natal rules** (Gochara from natal planet): `from_house Int` (position relative to natal planet), `tone String`, ...
- Always include `source String` (classical text citation)
- Tone values: `"positive" | "negative" | "mixed" | "neutral"`

Seed with authentic classical data — cite BPHS, Phaladeepika, Saravali, or Jataka Parijata chapter/verse numbers in the `source` field.

### 2. Load in daily route  `frontend/src/app/api/daily/route.ts`
Add to the `Promise.all` parallel fetch:
```ts
const [transitRes, ashtakRules, chatRules, moonTransitRules, <newRules>] = await Promise.all([
  fetch(...),
  getCachedAshtakvargaRules(),
  getChatRules(),
  getCachedMoonTransitRules(),
  getCached<Name>Rules(),   // new
]);
```
Pass to `extractDailyFacts()`:
```ts
const facts = extractDailyFacts(
  natal, transits, ashtakvarga, profile.name,
  chatRules, undefined, moonTransitRules, <newRules>,  // extend signature
);
```

### 3. Engine integration  `frontend/src/lib/dailyEngine.ts`

#### Update `extractDailyFacts` signature
```ts
export function extractDailyFacts(
  natal: ChartResponse,
  transits: CurrentTransitResponse,
  ashtakvarga: AshtakvargaAnalysis,
  personName: string,
  rules: ChatRules,
  _unused?: unknown,
  moonTransitRules?: MoonTransitRule[],
  <newRules>?: <NewRuleType>[],   // add here
): DailyFacts
```

#### Lookup pattern
```ts
function build<Name>Narrative(
  transitHouse: number,
  <newRules>: <NewRuleType>[],
): { narrative: string; tone: string } {
  const rule = <newRules>.find(r => r.house === transitHouse /* or r.sign === sign */);
  if (!rule) return { narrative: "", tone: "neutral" };
  return { narrative: rule.detail, tone: rule.tone };
}
```

#### Bullet routing (critical — learned from Moon Gochara bug)
**Never unconditionally push to `supportiveFlavours`.**
Always route based on tone:
```ts
const { narrative, tone } = build<Name>Narrative(house, <newRules> ?? []);
if (tone === "negative") {
  cautiousFlavours.push(`<planet> pressure around ${houseTheme(house)}`);
} else if (tone === "mixed") {
  supportiveFlavours.push(`<planet> activity around ${houseTheme(house)} — results vary`);
} else if (tone === "positive") {
  supportiveFlavours.push(`<planet> supports ${narrative || houseTheme(house)}`);
}
// "neutral" → skip bullet, only show in narrative if meaningful
```

### 4. Composer context  `frontend/src/lib/dailyComposer.ts`
If the LLM composer is used, add the new rule's narrative to the prompt context:
```ts
if (facts.<newNarrative>) {
  lines.push(`<PLANET> TRANSIT: ${facts.<newNarrative>}`);
}
```

### 5. Bump engine version
After wiring in, run `/bump-cache-version` and bump `CURRENT_ENGINE_VERSION` so all cached readings that predate this rule type are regenerated.

### 6. DailyFacts type  `frontend/src/lib/dailyEngine.ts`
Add any new fields to the `DailyFacts` interface so callers are type-safe.

## Verification
- Seed the rules, restart the dev server, open `/daily`
- The new transit context should appear in `facts` (visible in browser network tab → daily API response)
- Check that favorable transits appear in "Expect:" and unfavorable ones in "Be mindful of:"
- Run `npx tsc --noEmit`
