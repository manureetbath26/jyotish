# Transit Chart Calculator 🌙

A comprehensive transit analysis tool for the Vedic astrology app that calculates favorable and unfavorable periods across five life areas.

## Features

### 1. **Flexible Timeline Analysis**
- Analyze any date range from current date to years ahead
- Daily transit calculations with strength assessments
- Track when periods start and when changes occur

### 2. **Five Life Areas**
The calculator evaluates transits across these life domains:

- **💕 Love Life** - Romance, partnerships, intimate relationships
- **🏥 Health** - Physical vitality, immune system, general wellbeing
- **💼 Career** - Work, recognition, professional advancement
- **💰 Finances** - Money, wealth creation, prosperity
- **👨‍👩‍👧‍👦 Family** - Family harmony, relationships, support systems

### 3. **Vedic Astrology Principles**

#### Favorable & Unfavorable Periods
The calculator identifies periods based on:

- **Transiting planets**: Current positions of major planets
- **Natal conjunctions**: When transits reach your natal planet positions
- **House occupation**: Transit influence on relevant life areas
- **Dasha periods**: Enhanced favorable/unfavorable effects during active dashas
- **Planetary strength**: Natural benefics (Jupiter, Venus, Mercury) vs malefics (Mars, Saturn, Rahu)

#### Life Area Rules

**Love Life**:
- Favorable planets: Venus, Moon, Mercury
- Unfavorable planets: Mars, Saturn, Rahu
- Key houses: 5th (romance), 7th (partnership), 12th (intimacy)

**Health**:
- Favorable planets: Sun, Moon, Mercury
- Unfavorable planets: Mars, Saturn, Rahu
- Key houses: 1st (body), 6th (health issues)

**Career**:
- Favorable planets: Sun, Jupiter, Saturn
- Unfavorable planets: Rahu, Mars
- Key houses: 10th (career), 6th (service)

**Finances**:
- Favorable planets: Jupiter, Venus, Mercury
- Unfavorable planets: Saturn, Rahu, Mars
- Key houses: 2nd (wealth), 5th (gains), 11th (income)

**Family**:
- Favorable planets: Moon, Venus, Jupiter
- Unfavorable planets: Saturn, Mars, Rahu
- Key houses: 4th (family), 9th (father/religion)

### 4. **Period Strength Assessment**

Each period is rated as:
- **⭐⭐⭐ Strong** - Multiple favorable factors + active dasha support
- **⭐⭐ Moderate** - Some favorable factors or dasha involvement
- **⭐ Weak** - Single favorable factor

### 5. **Major Transit Events**
The calculator identifies and lists:
- **Conjunctions** - When transiting planets reach natal positions
- **Aspects** - Opposition (180°), Square (90°), Trine (120°), Sextile (60°)
- **Exact dates** - Know exactly when major transits occur

## How to Use

### Step 1: Select Date Range
1. Click on "Start Date" - Choose when to begin analysis (default: today)
2. Click on "End Date" - Choose when to end analysis (default: 1 year from today)
3. You can analyze any timeframe: 3 months, 1 year, 2 years, etc.

### Step 2: Select Life Areas
- Toggle one or more life areas you want analyzed
- You can select all five or focus on specific areas
- At least one area must be selected

### Step 3: Calculate
- Click "Calculate Transit Periods ✨"
- Wait for analysis (usually 10-30 seconds depending on date range)
- Results display immediately

### Step 4: Interpret Results

#### Understanding the Timeline
For each life area, you'll see:
- **Period start and end dates**
- **Type indicator**: ✓ Favorable or ⚠ Unfavorable
- **Duration**: Number of days in the period
- **Strength**: How strong the influence is (⭐⭐⭐ = strongest)
- **Active planets**: Which planets are influencing the period
- **Relative timing**: "in X days" for upcoming periods, "happening now" for current

#### Favorable Periods ✓
- Take action on important matters
- Good time for initiating projects
- Pursue goals in that life area
- More likely to have positive outcomes

#### Unfavorable Periods ⚠
- Exercise caution with major decisions
- Good time for planning and preparation
- Avoid starting new projects if possible
- More resilience and maturity can help navigate challenges

#### Neutral/Balanced Periods
- Mix of influences
- Proceed with normal activities
- Extra awareness helps

## Example Scenarios

### Career Advancement
- Find a **favorable** period in your Career timeline
- Use that window (especially **strong** periods) to:
  - Request promotions
  - Interview for new positions
  - Start important projects
  - Expand responsibilities

### Relationship Focus
- Look at your **Love Life** timeline
- Plan relationship milestones during favorable periods
- Avoid major relationship decisions during unfavorable periods
- Use unfavorable periods for strengthening foundations

### Financial Planning
- Track **Finances** favorable periods
- Plan investments during strong favorable periods
- Avoid risky financial decisions during unfavorable periods
- Use unfavorable periods for financial education and planning

## Technical Details

### Calculation Method
1. **Daily position calculation**: Computes planetary positions for each day
2. **Conjunction detection**: Checks if transiting planets conjunct natal positions (8° orb)
3. **Aspect analysis**: Detects major aspects (60°, 90°, 120°, 180°)
4. **House occupation**: Evaluates transit in relevant natal houses
5. **Dasha influence**: Applies enhanced weight during active dasha periods
6. **Strength assessment**: Combines multiple factors into period strength

### Data Used
- **Natal chart**: Your birth date, time, and location
- **Ephemeris**: Swiss Ephemeris (NASA JPL) for accurate planetary positions
- **Ayanamsha**: Your chosen ayanamsha (Lahiri, KP, or B.V. Raman)
- **Dasha sequence**: Vimshottari dasha from your natal chart

## Tips for Best Results

### ✅ Do:
- Analyze periods at least 3-6 months in advance
- Plan major life decisions around favorable periods
- Use strong favorable periods for important actions
- Cross-check multiple life areas for overall timing
- Consider current dasha period (enhances transits)

### ❌ Don't:
- Rely solely on transits - other factors matter (synastry, progressions, etc.)
- Ignore unfavorable periods - many people navigate them successfully
- Start major projects during strong unfavorable periods
- Make rushed decisions based on a single period
- Forget that free will plays a role in outcomes

## Customization Options

The calculator supports:
- **Any date range** - Past analysis, future predictions
- **Selective life areas** - Focus on what matters to you
- **Multiple ayanamshas** - Lahiri (default), KP, or B.V. Raman
- **Different dasha systems** - Currently uses Vimshottari (can extend)

## Limitations & Disclaimers

1. **Vedic astrology context** - Results are based on traditional Vedic principles
2. **Probabilistic, not deterministic** - Transits indicate tendencies, not certainties
3. **8° orb** - Conjunctions use standard 8° orb (can be adjusted in code)
4. **Simplified rules** - Uses core rules; doesn't include all micro-details
5. **No guarantee** - Use for guidance, not guaranteed outcomes
6. **Consult experts** - For major life decisions, consult a qualified astrologer

## Future Enhancements

Potential additions:
- Progressed chart analysis
- Synastry (relationship charts)
- Harmonic charts (D-20, D-60, etc.)
- Timing of specific events (marriage, birth, etc.)
- Custom orbs and sensitivity settings
- Export to PDF with charts
- Historical analysis and validation

## API Endpoint

### POST /api/chart/transits

**Request:**
```json
{
  "chart_data": { ... },
  "start_date": "2026-03-31",
  "end_date": "2027-03-31",
  "life_areas": ["love_life", "career", "finances"]
}
```

**Response:**
```json
{
  "start_date": "2026-03-31",
  "end_date": "2027-03-31",
  "timelines": {
    "love_life": [...],
    "career": [...],
    "finances": [...]
  },
  "major_transits": [...],
  "summary": {
    "love_life": "...",
    "career": "..."
  }
}
```

## Need Help?

- Check individual life area descriptions above
- Review period strength indicators (stars)
- Look at active planets - research their meanings
- Compare multiple time ranges
- Consult with an astrologer for complex interpretations
