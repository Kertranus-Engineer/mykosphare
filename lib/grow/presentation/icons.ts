/**
 * Semantic icon + colour vocabulary. Presentation chooses a key; the UI maps it
 * to a Lucide icon or a MYKOSPHARE glyph and to a colour token. Colour always
 * carries meaning (never decoration) and is always paired with text.
 */
export type GrowIconKey =
  | "temperature"
  | "humidity"
  | "air"
  | "co2"
  | "vision"
  | "mass"
  | "signal"
  | "signal-off"
  | "check"
  | "myko"
  | "mycelium"
  | "growth"
  | "observe"
  | "memory"
  | "event"
  | "sense"
  | "attention"

/** Colour domains map to --grow-* tokens. */
export type GrowDomain = "bio" | "water" | "heat" | "myko" | "growth" | "attention" | "critical" | "neutral"
