// Topics: the identity of what a course teaches, independent of the mentor teaching it.
// Every course belongs to one topic; several mentors can teach the same topic.
// Each topic has a coin (components/coin/coin.tsx) instead of course artwork.

export type TopicId = "foundations" | "order-flow" | "edge" | "institutional" | "macro"

/** The raised line pattern struck into the coin face. */
export type Pattern = "web" | "pinwheel" | "flower" | "blades" | "dome"
/** Coin alloy. Distinct from the raw league ores. */
export type Metal = "brass" | "copper" | "silver" | "verdigris" | "champagne"
/** Coin outline. "scallop" is the silhouette of overlapping discs; "vessel" is a rounded triangle with a hole. */
export type CoinShape = "round" | "octagon" | "scallop" | "vessel"

export type Topic = {
  id: TopicId
  name: string
  /** Label colour next to the coin. */
  color: string
  metal: Metal
  shape: CoinShape
  pattern: Pattern
}

export const TOPICS: Record<TopicId, Topic> = {
  foundations: { id: "foundations", name: "Foundations", color: "#e2c27a", metal: "brass", shape: "octagon", pattern: "web" },
  "order-flow": { id: "order-flow", name: "Order Flow", color: "#e0a487", metal: "copper", shape: "scallop", pattern: "pinwheel" },
  edge: { id: "edge", name: "Trading Edge", color: "#d7dde3", metal: "silver", shape: "round", pattern: "flower" },
  institutional: { id: "institutional", name: "Institutional", color: "#b5c7b4", metal: "verdigris", shape: "vessel", pattern: "blades" },
  macro: { id: "macro", name: "Macro", color: "#e8d5a8", metal: "champagne", shape: "round", pattern: "dome" },
}

export const TOPIC_LIST = Object.values(TOPICS)
