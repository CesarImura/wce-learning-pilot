// "Beginner Series" by Andrea Cimitan — built from the 12 video transcripts
// (Downloads/TRANSCRIPT'S 3/ANDREA). One lesson per video.

import type { ClassifyProps, ConceptProps, DirectionsProps, NumberProps, OrderProps } from "@/components/exercises/templates"
import type { Course } from "../courses"
import { STEPS, type Step, type StepHelp, type TemplateKind } from "../lessons"

const ANDREA = { name: "Andrea Cimitan", photo: "/wce/mentors/andrea-cimitan.jpg" }

const concept = (prompt: string, props: Omit<ConceptProps, "mentor">): Step => ({
  kind: "concept",
  mode: "learn",
  eyebrow: "Concept",
  prompt,
  props: { mentor: ANDREA, ...props },
})
const classify = (prompt: string, props: ClassifyProps, eyebrow = "Sort"): Step => ({
  kind: "classify",
  mode: "exercise",
  eyebrow,
  prompt,
  props,
})
const order = (prompt: string, props: OrderProps): Step => ({ kind: "order", mode: "exercise", eyebrow: "Order", prompt, props })
const directions = (prompt: string, props: DirectionsProps, eyebrow = "Predict"): Step => ({
  kind: "directions",
  mode: "exercise",
  eyebrow,
  prompt,
  props,
})
const number = (prompt: string, props: NumberProps, eyebrow = "Calculate"): Step => ({
  kind: "number",
  mode: "exercise",
  eyebrow,
  prompt,
  props,
})
const widget = (kind: TemplateKind, eyebrow: string, prompt: string): Step => ({ kind, mode: "exercise", eyebrow, prompt })


// ---------------------------------------------------------------------------
// Unit tests: fresh questions on each unit's material (not repeats of the lessons).

const TEST_PROFESSION: Step[] = [
  number("Break-even with a wider target", {
    question: "Your strategy risks 1 to make 3. What win rate do you need just to break even?",
    answer: 25,
    tolerance: 0.5,
    unit: "%",
    correct: "1 ÷ (1 + 3) = 25%. The further the target, the less often you need to win, and the less often you will.",
    hint: "Break-even win rate = 1 ÷ (1 + R), with R = 3.",
  }),
  number("Profit factor at 1:1", {
    question: "10 trades at 1:1. Six win (+1 each), four lose (−1 each). What's the profit factor?",
    sequence: ["W", "L", "W", "W", "L", "W", "L", "W", "W", "L"].map((r) => ({
      label: r === "W" ? "+1" : "−1",
      tone: r === "W" ? ("up" as const) : ("down" as const),
    })),
    answer: 1.5,
    correct: "Wins 6 ÷ losses 4 = 1.5. Above 1, so profitable.",
    hint: "Total wins (6 × 1) divided by total losses (4 × 1).",
  }),
  directions("What happens?", {
    rows: [
      { label: "Move your take profit further away → your win rate", answer: "down", why: "Higher reward-to-risk, lower win rate." },
      { label: "Move your take profit closer → your win rate", answer: "up", why: "Lower reward-to-risk, higher win rate." },
      {
        label: "Optimise a strategy too hard on past data → odds it works live",
        answer: "down",
        why: "That's overfitting: great on old data, poor on new data.",
      },
    ],
    explain: "Win rate and reward-to-risk always trade off against each other.",
  }),
  classify("Which style fits this person?", {
    buckets: [
      { id: "swing", label: "Swing trading or investing" },
      { id: "day", label: "Day trading the New York open" },
    ],
    items: [
      { label: "Full-time employee with a fixed schedule", bucket: "swing" },
      { label: "Business owner who's needed all day", bucket: "swing" },
      { label: "Freelancer who's free every day at the New York open", bucket: "day" },
    ],
    explain: "If your time depends on someone else, trade styles that don't need you at the screen at fixed hours.",
  }),
  number("Prop-firm payout", {
    question: "You make 8% on a $100,000 funded account with a 90% profit split. What's your payout?",
    answer: 7200,
    tolerance: 1,
    unit: "$",
    unitBefore: true,
    correct: "$100,000 × 8% = $8,000, × 90% = $7,200.",
    hint: "Account × return × split.",
  }),
  order("Rank the yearly returns", {
    items: ["S&P 500 long-run average (~9%)", "Warren Buffett (~15–20%)", "Jim Simons (~60%)"],
    topLabel: "Lowest",
    bottomLabel: "Highest",
    explain: "Even the record holder makes ~60% a year, nowhere near the “10% a month” gurus promise.",
  }),
]

const TEST_MARKETS: Step[] = [
  classify("Which side of the order book?", {
    buckets: [
      { id: "bid", label: "Bid side", hint: "Buyers waiting" },
      { id: "ask", label: "Ask side", hint: "Sellers waiting" },
    ],
    items: [
      { label: "The best bid", bucket: "bid" },
      { label: "Buy limit below the current price", bucket: "bid" },
      { label: "The best ask", bucket: "ask" },
      { label: "Sell limit above the current price", bucket: "ask" },
    ],
    explain: "Passive buyers rest on the bid, passive sellers on the ask. Aggressive orders cross over to them.",
  }),
  directions("Cause and effect", {
    rows: [
      { label: "A huge market buy sweeps the ask side → price", answer: "up", why: "It eats through sell offers at higher and higher prices." },
      { label: "A huge market sell hits the bids → price", answer: "down", why: "It fills against buyers at lower and lower prices." },
      { label: "Stocks crash → bond prices", answer: "up", why: "Money flees risk into safe-haven bonds." },
      { label: "An issuer's credit rating is upgraded → the yield it pays", answer: "down", why: "Less risk, smaller risk premium." },
    ],
    explain: "Aggressive orders move price, and money rotates between risk and safety.",
  }),
  number("Dividends", {
    question: "A company earns $1,000,000 net and reinvests $200,000. You own 10%. What's your dividend?",
    answer: 80000,
    tolerance: 1,
    unit: "$",
    unitBefore: true,
    correct: "$1,000,000 − $200,000 = $800,000 paid out; 10% of that is $80,000.",
    hint: "Subtract what's reinvested, then take your ownership share.",
  }),
  classify("Normal or inverted yield curve?", {
    buckets: [
      { id: "normal", label: "Normal" },
      { id: "inverted", label: "Inverted" },
    ],
    items: [
      { label: "Long maturities yield more than short ones", bucket: "normal" },
      { label: "Reflects the term premium", bucket: "normal" },
      { label: "Short-term yields above long-term yields", bucket: "inverted" },
      { label: "Appears after aggressive rate hikes, often before recessions", bucket: "inverted" },
    ],
    explain: "Normally you're paid more to lend for longer. Expected hikes push short yields above long ones.",
  }),
  classify("Growth or income?", {
    buckets: [
      { id: "growth", label: "Growth", hint: "The stock becomes worth more" },
      { id: "income", label: "Income", hint: "Dividends" },
    ],
    items: [
      { label: "Expecting more investors to pile in later", bucket: "growth" },
      { label: "Tesla, for years without paying dividends", bucket: "growth" },
      { label: "Coca-Cola's steady dividend", bucket: "income" },
      { label: "A share of the yearly profits", bucket: "income" },
    ],
    explain: "People buy stocks for growth, for income, or both.",
  }),
  order("From founders to the stock market", {
    items: [
      "Founders put capital into the company",
      "The capital is split into shares",
      "IPO: shares are offered to the public",
      "Shares trade on the exchange as stocks",
    ],
    topLabel: "First",
    bottomLabel: "Last",
    explain: "A share becomes a stock once it's listed and trades publicly after the IPO.",
  }),
]

const TEST_MACRO: Step[] = [
  directions("Read the macro", {
    rows: [
      { label: "US inflation rising, Japan stable → USD/JPY", answer: "up", why: "The Fed is likely to hike, widening the rate gap." },
      { label: "The Fed cuts while the ECB holds → EUR/USD", answer: "up", why: "Dollar bonds pay less, so the euro gains." },
      { label: "Real yields fall → gold", answer: "up", why: "Bonds become a worse inflation hedge." },
      { label: "A new hiking cycle starts → stocks", answer: "down", why: "Stocks don't like hikes." },
    ],
    explain: "It all flows from inflation and jobs data → central banks → yields → every other market.",
  }),
  number("Inflation", {
    question: "A product cost $50 last year and $52 today. What's the inflation rate?",
    answer: 4,
    unit: "%",
    correct: "$2 ÷ $50 = 4%, double the 2% target.",
    hint: "Price change divided by the old price.",
  }),
  number("Carry trade", {
    question: "You borrow at 1% and lend at 4%, on $50,000. What do you earn in a year?",
    answer: 1500,
    tolerance: 1,
    unit: "$",
    unitBefore: true,
    correct: "(4% − 1%) × $50,000 = $1,500.",
    hint: "Amount × (rate earned − rate paid).",
  }),
  classify("Cut or hike?", {
    buckets: [
      { id: "cut", label: "Cut rates" },
      { id: "hike", label: "Hike rates" },
    ],
    items: [
      { label: "Unemployment climbing in a recession", bucket: "cut" },
      { label: "Companies laying people off", bucket: "cut" },
      { label: "Inflation at 5% and rising", bucket: "hike" },
      { label: "The economy is overheating", bucket: "hike" },
    ],
    explain: "Two mandates: fight unemployment with cuts, fight inflation with hikes.",
  }),
  number("Negative real yields", {
    question: "Bonds yield 3% and inflation is 4%. What's the real yield?",
    answer: -1,
    unit: "%",
    correct: "3% − 4% = −1%. Bonds lose to inflation, which is gold's favourite setup.",
    hint: "Real yield = bond yield − inflation. It can be negative.",
  }),
  order("Follow the chain reaction", {
    items: ["Inflation data comes in hot", "Markets price in Fed hikes", "Real yields rise", "Gold falls"],
    topLabel: "Trigger",
    bottomLabel: "Result",
    explain: "Data → expectations → yields → gold. That's intermarket analysis.",
  }),
]

const TEST_TRADING: Step[] = [
  classify("Body or wick?", {
    buckets: [
      { id: "body", label: "Body", hint: "Open & close" },
      { id: "wick", label: "Wicks", hint: "High & low" },
    ],
    items: [
      { label: "Where the session started", bucket: "body" },
      { label: "Where the session ended", bucket: "body" },
      { label: "The highest price reached", bucket: "wick" },
      { label: "The lowest price reached", bucket: "wick" },
    ],
    explain: "The body spans open to close. The wicks show the extremes price visited in between.",
  }),
  classify(
    "Volume profile vocabulary",
    {
      buckets: [
        { id: "poc", label: "The single price with the most volume" },
        { id: "va", label: "The zone holding 70% of the volume" },
        { id: "lvn", label: "A thin zone with little trading" },
      ],
      items: [
        { label: "Point of control (POC)", bucket: "poc" },
        { label: "Value area", bucket: "va" },
        { label: "Low-volume node", bucket: "lvn" },
      ],
      explain: "When you think about volume, think about money: these levels show where it traded.",
    },
    "Match",
  ),
  classify("Uptrend or downtrend?", {
    buckets: [
      { id: "up", label: "Uptrend" },
      { id: "down", label: "Downtrend" },
    ],
    items: [
      { label: "Higher highs and higher lows", bucket: "up" },
      { label: "Fair value shifting higher", bucket: "up" },
      { label: "Lower highs and lower lows", bucket: "down" },
      { label: "Fair value shifting lower", bucket: "down" },
    ],
    explain: "Dow reads highs and lows; auction market theory reads where fair value moves.",
  }),
  classify("Valid ORB long trigger?", {
    buckets: [
      { id: "yes", label: "Take it" },
      { id: "no", label: "Not a trigger" },
    ],
    items: [
      { label: "5-min close above the range high, volume rising", bucket: "yes" },
      { label: "Wick above the range high, close back inside", bucket: "no" },
      { label: "Break above the high during the first 30 minutes", bucket: "no" },
      { label: "Close above the high on shrinking volume", bucket: "no" },
    ],
    explain: "Wait for the opening range to form, then a close outside it, confirmed by rising volume.",
  }),
  number("Plan the ORB trade", {
    question: "NQ's opening range is 18,000–18,040. You buy the breakout at 18,045 with the stop below the range at 18,000. Where's the 1:2 target?",
    given: [
      { label: "Entry", value: "18,045" },
      { label: "Stop", value: "18,000" },
      { label: "Reward : risk", value: "1 : 2" },
    ],
    answer: 18135,
    tolerance: 1,
    correct: "Risk = 45 points, so the target is 2 × 45 = 90 points above entry: 18,135.",
    hint: "Risk = entry − stop. Target = entry + 2 × risk.",
  }),
  order("The auction cycle", {
    items: ["Balance: buyers and sellers agree on fair value", "Imbalance: price discovery", "New balance at a new fair value"],
    topLabel: "First",
    bottomLabel: "Last",
    explain: "Markets rotate between balance and imbalance. Direction is a shift in fair value.",
  }),
]

export const beginnerSeries: Course = {
  id: "beginner-series",
  title: "Beginner Series",
  tagline: "From zero to trader: how finance really works",
  description:
    "Andrea Cimitan's foundation course. Get brutally realistic about the trading profession, learn how every major market works and why money flows between them, then read price like a pro and start with two research-backed strategies.",
  topic: "foundations",
  level: "Beginner",
  mentor: "Andrea Cimitan",
  isNew: true,
  status: "available",
  units: [
    // -----------------------------------------------------------------------
    {
      id: "the-profession",
      title: "The trading profession",
      description: "What trading really is and what you need to start",
      test: TEST_PROFESSION,
      lessons: [
        {
          id: "not-a-business-model",
          title: "Trading isn't a business model",
          description: "Expectations, edge and the three ways to trade",
          icon: "sparkles",
          steps: [
            concept("Finance was not built for you to make a living out of it", {
              quote: "You start from the riskiest side of a very risky business already.",
              body: [
                "Finance was born to protect savings. Money moves from saving, to investing, to growing capital, and only at the very end to speculation. Every step up is riskier.",
                "Retail traders jump straight to speculation, usually with leverage. That's why you need the right expectations and a real statistical edge before anything else.",
              ],
              points: [
                { title: "Risk to reward", text: "What you risk on a trade vs. what you can win." },
                { title: "Win rate", text: "The share of trades that end as winners." },
                { title: "Profit factor", text: "Total wins ÷ total losses. Above 1 means profitable." },
              ],
            }),
            order("Order the uses of money from safest to riskiest", {
              items: ["Saving", "Investing", "Growing capital", "Speculation"],
              topLabel: "Lowest risk",
              bottomLabel: "Highest risk",
              explain: "Finance starts with saving and investing. Speculation, where retail traders start, is the riskiest step.",
            }),
            widget("returns-reality", "Reality check", "How much can even the best in the world make?"),
            concept("Win rate and reward-to-risk trade off", {
              body: [
                "Every strategy has two numbers: how much it makes when it wins compared with what it risks (reward-to-risk, or R), and how often it wins (win rate).",
                "The further your take profit, the bigger each win, but the less often price gets there. So you need a lower win rate to break even, and you'll also win less often.",
              ],
              points: [
                { title: "Break-even win rate", text: "1 ÷ (1 + R). At 1:1 that's 50%, at 1:2 it's 33%, at 1:3 it's 25%." },
                { title: "Above the line", text: "Win more often than break-even and the profit factor goes above 1." },
                { title: "Profit factor", text: "Add up every win, add up every loss, divide wins by losses." },
              ],
            }),
            widget("breakeven-curve", "Explore", "Place a 1:2 strategy exactly on the break-even line"),
            number("Andrea's 10 trades, each risking 1 to make 2", {
              question: "Winners pay +2, losers −1. What's the profit factor (total wins ÷ total losses)?",
              sequence: ["W", "W", "L", "L", "L", "W", "W", "L", "W", "L"].map((r) => ({
                label: r === "W" ? "+2" : "−1",
                tone: r === "W" ? ("up" as const) : ("down" as const),
              })),
              answer: 2,
              correct: "5 wins × 2 = 10, 5 losses × 1 = 5, so 10 ÷ 5 = 2. Profitable while winning only half the time.",
              hint: "Add up all the wins (5 × 2), add up all the losses (5 × 1), then divide wins by losses.",
            }),
            concept("Three ways to trade", {
              quote: "Start with a documented edge and clear rules, then build your screen time.",
              body: ["Once you know what an edge looks like, there are three ways to trade it. Each has its own strength and its own trap."],
              points: [
                {
                  title: "Algorithmic",
                  text: "A coded bot follows the rules with no emotions. The trap is overfitting: tuning it so hard on past data that it fails on new data.",
                },
                {
                  title: "Discretionary",
                  text: "You trade by hand and your read of the market is the edge. The hardest path: few succeed, but the winners win big.",
                },
                {
                  title: "Hybrid",
                  text: "Rules researched and documented like an algo, but you place the trades. Andrea's recommended place to start.",
                },
              ],
            }),
            classify("Algo, discretionary or hybrid?", {
              buckets: [
                { id: "algo", label: "Algorithmic", hint: "A coded bot executes the rules" },
                { id: "disc", label: "Discretionary", hint: "Manual, you are the edge" },
                { id: "hybrid", label: "Hybrid", hint: "Researched rules, traded by hand" },
              ],
              items: [
                { label: "No emotions in execution", bucket: "algo" },
                { label: "Risk of overfitting to past data", bucket: "algo" },
                { label: "Your read of the market is the edge", bucket: "disc" },
                { label: "Few succeed, but the winners win big", bucket: "disc" },
                { label: "Trade a documented edge with clear rules, manually", bucket: "hybrid" },
                { label: "Andrea's recommended place to start", bucket: "hybrid" },
              ],
              explain:
                "Algos are objective but can overfit and decay. Discretion is the hardest path with the biggest upside. Hybrid gives beginners clear rules plus screen time.",
            }),
          ],
        },
        {
          id: "what-you-need",
          title: "What you need to trade",
          description: "Knowledge, time, strategy, capital, platform",
          icon: "layers",
          steps: [
            concept("Everything you need as a trader", {
              quote: "It's not a get-rich-quick type of thing.",
              body: [
                "Trading needs more than a laptop and an internet connection. It needs real knowledge, honest time, a portfolio of strategies, capital that doesn't come from your rent, and the right tools.",
              ],
              points: [
                { title: "Knowledge", text: "Fundamentals & macro, technical analysis, data analysis." },
                { title: "Time", text: "Pick a style that fits your schedule." },
                { title: "Strategy", text: "Ideally several, diversified." },
                { title: "Capital", text: "Real, demo, or a prop firm." },
                { title: "Platform", text: "Broker or prop firm + a trading terminal." },
                { title: "Journal & risk manager", text: "Track your metrics, protect your account." },
              ],
            }),
            concept("Pick a style that fits your time", {
              body: [
                "Your style has to fit your week, not the other way around. If your time depends on someone else, like a boss or your own business, pick a style that doesn't need you at the screen at fixed hours.",
                "Andrea's advice is to go step by step: build cash flow and save, invest passively, trade part-time, and only go full-time once you see real signs of success.",
              ],
              points: [
                { title: "Investing and swing trading", text: "A few hours a week or less. Fits a job or a business." },
                { title: "Day trading and scalping", text: "3–4 hours a day, often at the New York open. Fits someone who controls their hours." },
                { title: "Running algos seriously", text: "Also hours every day: research, testing and monitoring." },
              ],
            }),
            classify("How much time does each style need?", {
              buckets: [
                { id: "low", label: "A few hours a week or less" },
                { id: "high", label: "3–4 hours a day" },
              ],
              items: [
                { label: "Long-term investing", bucket: "low" },
                { label: "Swing trading", bucket: "low" },
                { label: "Day trading", bucket: "high" },
                { label: "Scalping", bucket: "high" },
                { label: "Running algos seriously", bucket: "high" },
              ],
              explain:
                "With a job or a business, swing trading or investing fits. Day trading, scalping and serious algo work need hours every day.",
            }),
            order("Andrea's path into the markets", {
              items: [
                "Build cash flow and save",
                "Invest passively",
                "Trade part-time, moderately active",
                "Trade full-time (optional)",
              ],
              topLabel: "Start here",
              bottomLabel: "Later, only with signs of success",
              explain:
                "Go gradually: cash flow first, then passive investing, then part-time trading. Going all-in without capital, knowledge or a strategy is a recipe for disaster.",
            }),
            concept("How a prop firm pays you", {
              body: [
                "A prop firm lends you its capital. You pay a fee for a challenge, and if you hit its profit target without breaking its risk rules, you trade a funded account.",
                "You keep a share of the profits, called the split. Most people who buy a challenge fail, and their fees pay for the few who get paid.",
              ],
              points: [
                { title: "Profit", text: "Account size × your return. $100,000 × 5% = $5,000." },
                { title: "Your payout", text: "Profit × your split. $5,000 × 80% = $4,000." },
              ],
            }),
            widget("prop-firm", "Simulate", "How a prop-firm challenge pays out"),
            concept("The tools of the trade", {
              body: ["Besides a broker or prop firm, you need a trading terminal. Andrea uses a different one for each style."],
              points: [
                { title: "DeepCharts", text: "Order flow on futures. Built for day trading and scalping." },
                { title: "TradingView", text: "Easy, clean charting. Good for swing trading and macro." },
                { title: "MultiCharts", text: "Backtesting and automation. Built for algo trading." },
              ],
            }),
            classify("Match the platform to the trading style", {
              buckets: [
                { id: "day", label: "Day trading & scalping", hint: "Order flow, futures" },
                { id: "swing", label: "Swing & macro", hint: "Easy charting" },
                { id: "algo", label: "Algo trading", hint: "Backtesting & automation" },
              ],
              items: [
                { label: "DeepCharts", bucket: "day" },
                { label: "TradingView", bucket: "swing" },
                { label: "MultiCharts", bucket: "algo" },
              ],
              explain: "DeepCharts for order-flow day trading, TradingView for swing and macro charting, MultiCharts for algos.",
            }),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    {
      id: "the-markets",
      title: "The markets",
      description: "Who moves prices, bonds and stocks",
      test: TEST_MARKETS,
      lessons: [
        {
          id: "who-moves-markets",
          title: "Who moves the market",
          description: "Participants, the order book and why money moves",
          icon: "target",
          steps: [
            concept("Who, what, how and why", {
              quote: "The price you see on your charts is simply the last transaction between a buyer and a seller.",
              body: [
                "Prices move through order flow: a stream of buy and sell orders. Behind it are smart money and slow money (banks, funds, central banks), market makers who quote both sides and earn the spread, small money, and retail: us.",
                "Big players can't buy everything at once. They split huge orders into small ones over hours or days, which is why trends persist and order flow is autocorrelated.",
              ],
            }),
            classify("Who's who in the market?", {
              buckets: [
                { id: "big", label: "Big money", hint: "Smart & slow money" },
                { id: "mm", label: "Market maker", hint: "Liquidity provider" },
                { id: "small", label: "Small money & retail" },
              ],
              items: [
                { label: "Pension fund", bucket: "big" },
                { label: "Sovereign wealth fund", bucket: "big" },
                { label: "Central bank", bucket: "big" },
                { label: "Quotes bid and ask, earns the spread", bucket: "mm" },
                { label: "Prop desk with under $100M", bucket: "small" },
                { label: "You, trading from a laptop", bucket: "small" },
              ],
              explain:
                "Banks, funds, governments and central banks are big money. Market makers stay neutral and earn the spread. Under ~$100M is small money, and retail is the smallest of all.",
            }),
            classify(
              "Passive or aggressive?",
              {
                buckets: [
                  { id: "passive", label: "Passive", hint: "Waits in the order book" },
                  { id: "aggressive", label: "Aggressive", hint: "Takes the best price now" },
                ],
                items: [
                  { label: "Buy limit at 59 while price is 60", bucket: "passive" },
                  { label: "Sell offer resting at 61", bucket: "passive" },
                  { label: "Market buy, filled at the best ask", bucket: "aggressive" },
                  { label: "Market sell into the best bid", bucket: "aggressive" },
                ],
                explain:
                  "Passive orders name their price and wait for someone to come. Aggressive orders accept the best available price to get filled now, and that's what moves price.",
              },
              "Classify",
            ),
            { ...STEPS["order-book"], prompt: "You're the big buyer now. Find the largest market buy that keeps slippage under 0.03%" },
            classify("Why is this money moving?", {
              buckets: [
                { id: "pres", label: "Preservation" },
                { id: "growth", label: "Growth" },
                { id: "hedge", label: "Hedging" },
                { id: "spec", label: "Speculation" },
              ],
              items: [
                { label: "Parking savings to beat inflation", bucket: "pres" },
                { label: "Buying tech stocks for upside", bucket: "growth" },
                { label: "IKEA locks in next year's wood price with futures", bucket: "hedge" },
                { label: "Market maker offsetting too much exposure", bucket: "hedge" },
                { label: "Day-trading the Nasdaq", bucket: "spec" },
              ],
              explain:
                "Preservation, growth and hedging flows are the big, predictable ones. Speculative flows are the least predictable and drive FOMO and bubbles.",
            }),
          ],
        },
        {
          id: "bonds",
          title: "Bonds: where money is born",
          description: "Debt, yields and the yield curve",
          icon: "layers",
          steps: [
            concept("Money today is created through debt", {
              quote: "Debt, or credit, is the only way new money is created nowadays.",
              body: [
                "Since the end of the gold standard in 1971, money is fiat: it's worth something because we trust it. New money is created when governments and companies issue bonds, and when banks make loans.",
                "A bond is an IOU with an issuer, a nominal value, a maturity and a yield. Most of the money in financial markets sits in bonds.",
              ],
              points: [
                { title: "Credit rating", text: "Riskier borrowers must pay more." },
                { title: "Term premium", text: "Lend for longer, get paid more." },
                { title: "Inflation expectations", text: "Higher expected inflation, higher yield." },
                { title: "Central bank rates", text: "Bonds must beat the risk-free rate." },
              ],
            }),
            order("Put the history of money in order", {
              items: [
                "Gold coins traded for goods",
                "Banks hold gold and issue banknotes",
                "The gold standard ends (1971)",
                "Fiat money, created through debt",
              ],
              topLabel: "Oldest",
              bottomLabel: "Today",
              explain: "Coins, then banknotes backed by gold, then the end of convertibility in 1971 and today's fiat, debt-based money.",
            }),
            classify("Investment grade or junk?", {
              buckets: [
                { id: "ig", label: "Investment grade", hint: "Lower risk, lower yield" },
                { id: "junk", label: "Junk", hint: "Higher risk, higher yield" },
              ],
              items: ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "D"].map((r, i) => ({
                label: r,
                bucket: i < 4 ? "ig" : "junk",
              })),
              explain: "AAA to BBB is investment grade. BB and below is junk, and D means default: the borrower couldn't pay.",
            }),
            widget("yield-curve", "Build", "Shape a normal yield curve"),
            directions("What happens to the yield a lender demands?", {
              rows: [
                { label: "The issuer's credit rating is downgraded", answer: "up", why: "Riskier borrower → higher risk premium." },
                { label: "The loan is for 30 years instead of 3 months", answer: "up", why: "Longer term → higher term premium." },
                { label: "Inflation is expected to fall", answer: "down", why: "Less inflation to compensate for." },
                { label: "The central bank cuts interest rates", answer: "down", why: "The risk-free alternative pays less." },
              ],
              upLabel: "Higher",
              downLabel: "Lower",
              explain: "Yield = credit risk + term premium + inflation expectations + central bank rates.",
            }),
          ],
        },
        {
          id: "stocks",
          title: "What are stocks?",
          description: "Ownership, dividends, indices and sectors",
          icon: "candle",
          steps: [
            concept("A stock is a piece of a company", {
              quote: "Markets can stay irrational longer than you can stay solvent.",
              body: [
                "A company's capital is split into shares. After an IPO those shares trade publicly as stocks. Owning them gives you a share of the company and of its profits.",
                "People buy stocks for two reasons: growth (the company becomes worth more) and income (dividends). That makes the stock market a risk-on, sentiment-driven market.",
              ],
            }),
            widget("dividend-split", "Explore", "Split the profits between the owners"),
            classify(
              "Match the index",
              {
                buckets: [
                  { id: "sp", label: "Top 500 US stocks by market cap" },
                  { id: "ndx", label: "Top 100 on the Nasdaq, mostly tech" },
                  { id: "dow", label: "30 big industrial blue chips" },
                  { id: "rut", label: "US small caps" },
                ],
                items: [
                  { label: "S&P 500", bucket: "sp" },
                  { label: "Nasdaq 100", bucket: "ndx" },
                  { label: "Dow Jones", bucket: "dow" },
                  { label: "Russell 2000", bucket: "rut" },
                ],
                explain: "Indices pick the stocks for you. You can trade them through ETFs, futures or options.",
              },
              "Match",
            ),
            classify("Who suffers most in a recession?", {
              buckets: [
                { id: "hurt", label: "Hit hard", hint: "Risk-on, discretionary" },
                { id: "safe", label: "Holds up", hint: "Staples & safe havens" },
              ],
              items: [
                { label: "Tech stocks (Apple, Nvidia)", bucket: "hurt" },
                { label: "Consumer discretionary (Amazon)", bucket: "hurt" },
                { label: "Consumer staples (Walmart)", bucket: "safe" },
                { label: "US Treasury bonds", bucket: "safe" },
              ],
              explain:
                "In a downturn people stop buying new iPhones but still buy bread at Walmart, and money flows into safe havens like Treasuries.",
            }),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    {
      id: "macro",
      title: "Macro & the flow of money",
      description: "Central banks, forex, gold and how money moves",
      test: TEST_MACRO,
      lessons: [
        {
          id: "central-banks",
          title: "Central banks & the cycle",
          description: "GDP, inflation, employment and interest rates",
          icon: "target",
          steps: [
            concept("Debt creates the economic cycle", {
              quote: "The markets will always try to anticipate what the economy will do.",
              body: [
                "When a bank lends, it creates new money. Borrowing lets everyone spend more, then repaying forces everyone to spend less: leveraging and deleveraging. That's the 5–7 year economic cycle.",
                "Central banks have two mandates: keep inflation around 2% and maximise employment. Their main tool is the interest rate.",
              ],
              points: [
                { title: "GDP", text: "How much wealth the economy creates." },
                { title: "Inflation", text: "How fast prices rise. Target: ~2%." },
                { title: "Employment", text: "How many people have jobs." },
              ],
            }),
            number("Inflation, by the cup", {
              question: "A coffee cost $1.00 last year and costs $1.10 today. What's the inflation rate?",
              given: [
                { label: "Last year", value: "$1.00" },
                { label: "Today", value: "$1.10" },
              ],
              answer: 10,
              unit: "%",
              correct: "($1.10 − $1.00) ÷ $1.00 = 10%. That's five times the 2% central banks aim for.",
              hint: "Divide the price increase by the old price: $0.10 ÷ $1.00.",
            }),
            widget("fed-cycle", "Decide", "You run the central bank. What do you do at each point?"),
            directions("The central bank cuts rates. What happens?", {
              rows: [
                { label: "Cost of a mortgage", answer: "down", why: "Loan rates follow the central bank's rate." },
                { label: "Incentive to borrow", answer: "up", why: "Cheaper credit encourages new debt." },
                { label: "New money created in the economy", answer: "up", why: "New loans create new money." },
                { label: "Unemployment, over time", answer: "down", why: "More spending → businesses hire." },
              ],
              explain: "Cutting rates encourages borrowing and spending, which creates money and jobs, and eventually inflation.",
            }),
            classify("What counts toward GDP?", {
              buckets: [
                { id: "add", label: "Adds to GDP" },
                { id: "sub", label: "Subtracts from GDP" },
              ],
              items: [
                { label: "Consumer spending", bucket: "add" },
                { label: "Government spending", bucket: "add" },
                { label: "Investment", bucket: "add" },
                { label: "Exports", bucket: "add" },
                { label: "Imports", bucket: "sub" },
              ],
              explain: "GDP = consumption + investment + government spending + exports − imports.",
            }),
          ],
        },
        {
          id: "forex",
          title: "Forex fundamentals",
          description: "Currency pairs, rate gaps and the carry trade",
          icon: "sparkles",
          steps: [
            concept("Currencies follow interest rates", {
              quote: "Interest rates from central banks are the main driver of the forex market.",
              body: [
                "Forex is trading one currency against another. EUR/USD at 1.08 means €1 buys $1.08. If the dollar weakens or the euro strengthens, the number goes up.",
                "Global money parks where bonds pay more. So the gap between two central banks' rates, driven by inflation and unemployment data, sets the trend of a pair.",
              ],
            }),
            directions("Which way does the pair move?", {
              rows: [
                { label: "EUR/USD when the dollar weakens", answer: "up", why: "€1 buys more of a weaker dollar." },
                { label: "EUR/USD when the dollar strengthens", answer: "down", why: "€1 buys fewer, stronger dollars." },
                { label: "USD/JPY: Fed hikes, Bank of Japan stays at 0%", answer: "up", why: "Dollar bonds pay more → demand for dollars." },
                {
                  label: "USD/JPY: Fed cuts, Bank of Japan starts hiking",
                  answer: "down",
                  why: "The rate gap shrinks, so money flows back to yen.",
                },
              ],
              explain: "The numerator over the denominator: whatever strengthens the first currency lifts the pair.",
            }),
            widget("carry-trade", "Simulate", "Borrow cheap, lend dear: the carry trade"),
          ],
        },
        {
          id: "gold-commodities",
          title: "Gold & commodities",
          description: "Real yields, inflation hedges and supply & demand",
          icon: "shield",
          steps: [
            concept("Gold competes with bonds", {
              quote: "Whenever real yields go down, gold goes up.",
              body: [
                "Since 1971 gold has mostly been an inflation hedge and a store of value. \"War = gold up\" is more myth than a reliable rule.",
                "Bonds are the other inflation hedge. When the real yield (bond yield minus inflation) is high, money prefers bonds. When it falls, money flows into gold.",
                "Real commodities like oil, cocoa or lithium follow one thing: supply (production) vs. demand (consumption).",
              ],
            }),
            widget("real-yield-gold", "Explore", "Real yields decide where the money goes"),
            directions("Follow the chain from the Fed to gold", {
              rows: [
                { label: "Fed expected to hike → real yields", answer: "up", why: "Higher rates lift real yields." },
                { label: "Fed expected to hike → gold", answer: "down", why: "Bonds become the better hedge." },
                { label: "Fed cutting rates → gold", answer: "up", why: "Falling real yields: gold's strongest uptrend." },
                {
                  label: "Oil spike pushes inflation up → odds the Fed hikes",
                  answer: "up",
                  why: "Higher inflation pressures the Fed to hike.",
                },
              ],
              explain: "Inflation and jobs data → Fed expectations → real yields → gold.",
            }),
            directions("Supply and demand: what happens to the price?", {
              rows: [
                { label: "The Strait of Hormuz closes → oil", answer: "up", why: "Supply drops while demand stays high." },
                { label: "A huge new lithium mine is found → lithium", answer: "down", why: "More supply, same demand." },
                { label: "Drought in cocoa regions → cocoa", answer: "up", why: "Production falls." },
                { label: "Battery demand explodes → lithium", answer: "up", why: "Consumption rises." },
              ],
              explain: "For any commodity, the only fundamental that matters is production vs. consumption.",
            }),
          ],
        },
        {
          id: "flow-of-money",
          title: "The flow of money",
          description: "From economic data to price",
          icon: "layers",
          steps: [
            concept("Money doesn't burn, it moves", {
              quote: "It didn't really burn. It just went into a place where it was expecting a better or safer return.",
              body: [
                "Economic data comes out every month. Analysts and algorithms at every bank turn it into forecasts for the next 6–9 months, and money is re-allocated between markets, split into small orders that move price.",
                "Analysing how money moves between bonds, forex, commodities, stocks and gold is called intermarket analysis.",
              ],
            }),
            order("How information becomes price", {
              items: [
                "Economic data is released (CPI, jobs, PMI)",
                "Analysts and algos update their forecasts",
                "Big orders are split into small orders",
                "An imbalance of buyers or sellers moves price",
              ],
              topLabel: "First",
              bottomLabel: "Last",
              explain: "Information → expectations → orders → price. Markets are a constant flow of orders based on expectations.",
            }),
            directions(
              "A new hiking cycle begins",
              {
                context: "The Fed is expected to start hiking rates.",
                rows: [
                  { label: "Stock market", answer: "down", why: "Stocks don't like hikes." },
                  { label: "Real yields", answer: "up", why: "Higher rates lift real yields." },
                  { label: "Gold", answer: "down", why: "Bonds become the better inflation hedge." },
                  { label: "US dollar", answer: "up", why: "Dollar bonds pay more." },
                ],
                explain: "Hiking cycle: stocks ↓, real yields ↑, gold ↓, dollar ↑.",
              },
              "Intermarket",
            ),
            directions(
              "The hikes are over",
              {
                context: "The Fed is expected to stop hiking and start cutting.",
                rows: [
                  { label: "Stock market", answer: "up", why: "Cheaper money supports risk." },
                  { label: "Real yields", answer: "down", why: "Lower rates pull real yields down." },
                  { label: "Gold", answer: "up", why: "Falling real yields favour gold." },
                  { label: "US dollar", answer: "down", why: "Dollar bonds pay less." },
                ],
                explain: "Easing cycle: stocks ↑, real yields ↓, gold ↑, dollar ↓. The mirror image.",
              },
              "Intermarket",
            ),
            classify("Sort the economic data", {
              buckets: [
                { id: "infl", label: "Inflation" },
                { id: "jobs", label: "Employment" },
                { id: "soft", label: "Soft data", hint: "Surveys: PMI, sentiment, confidence" },
                { id: "growth", label: "Growth", hint: "Hard output data: GDP, retail sales, industrial production" },
              ],
              items: [
                { label: "CPI", bucket: "infl" },
                { label: "PCE", bucket: "infl" },
                { label: "PPI", bucket: "infl" },
                { label: "Unemployment rate", bucket: "jobs" },
                { label: "Initial jobless claims", bucket: "jobs" },
                { label: "JOLTS job openings", bucket: "jobs" },
                { label: "Purchasing Managers' Index", bucket: "soft" },
                { label: "Consumer confidence", bucket: "soft" },
                { label: "GDP", bucket: "growth" },
              ],
              explain: "Inflation and employment data drive what the central bank does, and that drives everything else.",
            }),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    {
      id: "to-trading",
      title: "From analysis to trading",
      description: "Read price, pick your instrument, start trading",
      test: TEST_TRADING,
      lessons: [
        {
          id: "reading-price",
          title: "How prices are represented",
          description: "Candles, structure and auction market theory",
          icon: "candle",
          steps: [
            STEPS["candle-scrub"],
            STEPS["candle-builder"],
            { ...STEPS["sort-charts"], prompt: "Dow's idea: is each market trending or ranging (consolidating)?" },
            concept("Price + volume: auction market theory", {
              quote: "When you think about volume, think about money.",
              body: [
                "Markets alternate between balance (buyers and sellers agree on fair value) and imbalance (price discovery). Instead of chasing a new high or low, professionals watch for a shift in fair value.",
                "The volume profile shows where money traded. The value area holds 70% of the volume, and the point of control (POC) is the single price with the most.",
              ],
            }),
            widget("volume-profile", "Spot it", "Tap the point of control"),
            classify("Classic technical analysis or auction market theory?", {
              buckets: [
                { id: "old", label: "Classic (Dow)", hint: "Price only" },
                { id: "amt", label: "Auction market theory", hint: "Price + volume" },
              ],
              items: [
                { label: "Higher highs and higher lows define the trend", bucket: "old" },
                { label: "Support and resistance from past highs & lows", bucket: "old" },
                { label: "A shift in fair value defines direction", bucket: "amt" },
                { label: "High- and low-volume areas as supply & demand", bucket: "amt" },
              ],
              explain: "The old way reads price alone. AMT reads price and volume together: where the money actually is.",
            }),
          ],
        },
        {
          id: "instruments",
          title: "Choosing your instrument",
          description: "ETFs, futures, options and CFDs",
          icon: "shield",
          steps: [
            concept("One asset, many ways to trade it", {
              quote: "If you're profitable, it doesn't matter what you're trading with, as long as your broker pays out.",
              body: [
                "The S&P 500 can be traded as an ETF, a future, options or a CFD. They all follow the same asset, but the rules, costs and conflicts of interest are very different.",
              ],
            }),
            classify(
              "Name the instrument",
              {
                buckets: [
                  { id: "etf", label: "ETF" },
                  { id: "fut", label: "Future" },
                  { id: "opt", label: "Option" },
                  { id: "cfd", label: "CFD" },
                ],
                items: [
                  { label: "SPY", bucket: "etf" },
                  { label: "ES (E-mini S&P 500)", bucket: "fut" },
                  { label: "SPX options", bucket: "opt" },
                  { label: "US500", bucket: "cfd" },
                ],
                explain: "Same S&P 500, four wrappers: ETFs for investing, futures and options on exchanges, CFDs over the counter.",
              },
              "Match",
            ),
            classify("CFD or futures?", {
              buckets: [
                { id: "cfd", label: "CFDs", hint: "Over the counter" },
                { id: "fut", label: "Futures", hint: "Centralised exchange" },
              ],
              items: [
                { label: "Prices can differ from broker to broker", bucket: "cfd" },
                { label: "No real volume data", bucket: "cfd" },
                { label: "The broker can be your counterparty", bucket: "cfd" },
                { label: "Spread markup the broker can widen", bucket: "cfd" },
                { label: "Same price for everyone", bucket: "fut" },
                { label: "Order flow data available", bucket: "fut" },
                { label: "Broker earns only commissions", bucket: "fut" },
              ],
              explain:
                "CFDs offer high leverage and hedging but more conflicts of interest. Futures are regulated, transparent and the professional's tool.",
            }),
          ],
        },
        {
          id: "first-strategies",
          title: "Strategies to start with",
          description: "Opening range breakout and earnings drift",
          icon: "target",
          steps: [
            concept("Two research-backed strategies", {
              quote: "These are two very, very solid strategies to start backtesting with.",
              body: [
                "Opening range breakout (ORB) on ES or NQ: wait for the first 30 minutes. Enter when a candle closes outside the range with rising volume. Stop on the other side of the opening range, target 1:2.",
                "Post-earnings announcement drift (PEAD): after a positive earnings surprise, institutional buying makes the stock drift higher for weeks. Wait for a retest of the gap, then target 1:1 to 1:2.",
              ],
            }),
            widget("orb-breakout", "Spot it", "Tap the candle that triggers the opening range breakout"),
            number("Sizing the ORB target", {
              question: "Your stop is 10 points away. Where's your take profit at 1:2, in points?",
              answer: 20,
              unit: "points",
              correct: "Risk 10 to make 20. With a 1:2 ratio you only need to win a third of the time to break even.",
              hint: "1:2 means the target is twice the stop distance.",
            }),
            directions("Post-earnings drift: which way?", {
              rows: [
                {
                  label: "Expected $10B earnings, reported $15B → the next few weeks",
                  answer: "up",
                  why: "A positive surprise brings institutional inflows that drift price up.",
                },
                {
                  label: "Expected $10B earnings, reported $5B → the next few weeks",
                  answer: "down",
                  why: "A negative surprise drifts the other way.",
                },
              ],
              explain: "PEAD is a documented structural edge: prices keep drifting in the direction of the surprise.",
            }),
          ],
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Video references, from the transcript timestamps (seconds into each video).
// Each list follows the order of the lesson's graded exercises.

const VIDEOS: Record<string, { n: number; at: number[] }> = {
  "not-a-business-model": { n: 1, at: [83, 514, 1071, 1408, 1842] },
  "what-you-need": { n: 2, at: [324, 471, 84, 1774] },
  "who-moves-markets": { n: 3, at: [166, 202, 428, 1097] },
  bonds: { n: 4, at: [81, 701, 977, 601] },
  stocks: { n: 5, at: [329, 618, 797] },
  "central-banks": { n: 6, at: [659, 1012, 1118, 574] },
  forex: { n: 7, at: [37, 567] },
  "gold-commodities": { n: 8, at: [290, 518, 755] },
  "flow-of-money": { n: 9, at: [134, 42, 42, 134] },
  "reading-price": { n: 10, at: [120, 534, 1609, 976] },
  instruments: { n: 11, at: [43, 100] },
  "first-strategies": { n: 12, at: [52, 152, 280] },
}

// Which lesson (and video moment) each unit-test question reviews, in test order.
const TEST_SOURCES: [Step[], [string, number][]][] = [
  [
    TEST_PROFESSION,
    [
      ["not-a-business-model", 1071],
      ["not-a-business-model", 1408],
      ["not-a-business-model", 1071],
      ["what-you-need", 324],
      ["what-you-need", 84],
      ["not-a-business-model", 514],
    ],
  ],
  [
    TEST_MARKETS,
    [
      ["who-moves-markets", 202],
      ["who-moves-markets", 428],
      ["stocks", 329],
      ["bonds", 977],
      ["stocks", 329],
      ["stocks", 165],
    ],
  ],
  [
    TEST_MACRO,
    [
      ["forex", 172],
      ["central-banks", 659],
      ["forex", 567],
      ["central-banks", 1012],
      ["gold-commodities", 290],
      ["flow-of-money", 42],
    ],
  ],
  [
    TEST_TRADING,
    [
      ["reading-price", 120],
      ["reading-price", 1609],
      ["reading-price", 445],
      ["first-strategies", 52],
      ["first-strategies", 152],
      ["reading-price", 976],
    ],
  ],
]

for (const unit of beginnerSeries.units)
  for (const lesson of unit.lessons) {
    const v = VIDEOS[lesson.id]
    if (!v) continue
    lesson.video = { title: `Beginner Series ${String(v.n).padStart(2, "0")}` }
    // Copy shared steps (e.g. demo exercises) before tagging them.
    let k = 0
    lesson.steps = lesson.steps.map((st) => (st.mode === "exercise" ? { ...st, at: v.at[k++] } : st))
  }
for (const [steps, sources] of TEST_SOURCES)
  steps.forEach((st, i) => Object.assign(st, { source: sources[i][0], at: sources[i][1] }))

// "Need a hint?" for every unit test: a nudge plus outside reading (links checked 2026-10-22).
const link = (label: string, source: string, url: string) => ({ label, source, url })
const HELP_PROFESSION: StepHelp[] = [
  {
    hint: "Break-even win rate = 1 ÷ (1 + R), where R is what you make for every 1 you risk. Here R = 3.",
    links: [link("Understanding the risk/reward ratio", "Investopedia", "https://www.investopedia.com/terms/r/riskrewardratio.asp")],
  },
  {
    hint: "Profit factor = total won ÷ total lost. Add up the six +1s, add up the four −1s, then divide.",
    links: [
      link("Interpreting a strategy performance report (profit factor)", "Investopedia", "https://www.investopedia.com/articles/fundamental-analysis/10/strategy-performance-reports.asp"),
    ],
  },
  {
    hint: "A target further away is reached less often. And a strategy tuned too tightly to old data learns its noise, not its edge.",
    links: [
      link("Take-profit orders", "Investopedia", "https://www.investopedia.com/terms/t/take-profitorder.asp"),
      link("Overfitting", "Investopedia", "https://www.investopedia.com/terms/o/overfitting.asp"),
    ],
  },
  {
    hint: "Ask who controls each person's hours. If someone else does, they need a style that doesn't need them at the screen at fixed times.",
    links: [
      link("Swing trading", "Investopedia", "https://www.investopedia.com/terms/s/swingtrading.asp"),
      link("Day trading basics", "Investopedia", "https://www.investopedia.com/terms/d/daytrader.asp"),
    ],
  },
  {
    hint: "Profit = account × return. Your payout = profit × your split.",
    links: [
      link("Proprietary trading", "Investopedia", "https://www.investopedia.com/terms/p/proprietarytrading.asp"),
      link("Proprietary trading", "Wikipedia", "https://en.wikipedia.org/wiki/Proprietary_trading"),
    ],
  },
  {
    hint: "Compare a yearly percentage for each: the stock market's long-run average, the best-known value investor, and the record-holding quant fund.",
    links: [
      link("S&P 500 average returns and historical performance", "Investopedia", "https://www.investopedia.com/ask/answers/042415/what-average-annual-return-sp-500.asp"),
      link("Renaissance Technologies (Jim Simons' firm)", "Wikipedia", "https://en.wikipedia.org/wiki/Renaissance_Technologies"),
    ],
  },
]

const HELP_MARKETS: StepHelp[] = [
  {
    hint: "The bid is what buyers are willing to pay, the ask is what sellers want. A buyer waiting below the price joins the buyers.",
    links: [
      link("Bid and ask", "Investopedia", "https://www.investopedia.com/terms/b/bid-and-ask.asp"),
      link("Order book", "Investopedia", "https://www.investopedia.com/terms/o/order-book.asp"),
    ],
  },
  {
    hint: "A market order takes whatever is resting on the other side, one price level at a time. In a crash, money runs toward the safest assets. A safer issuer can pay less to borrow.",
    links: [
      link("Market orders", "Investopedia", "https://www.investopedia.com/terms/m/marketorder.asp"),
      link("Flight to quality", "Investopedia", "https://www.investopedia.com/terms/f/flighttoquality.asp"),
      link("Credit ratings", "Investopedia", "https://www.investopedia.com/terms/c/creditrating.asp"),
    ],
  },
  {
    hint: "Only the profit that isn't reinvested is paid out. Your dividend is your ownership share of that payout.",
    links: [
      link("Dividends", "Investopedia", "https://www.investopedia.com/terms/d/dividend.asp"),
      link("Payout ratio", "Investopedia", "https://www.investopedia.com/terms/p/payoutratio.asp"),
    ],
  },
  {
    hint: "Lending for longer is riskier, so you're normally paid more for it. When the market expects hikes, short-term yields jump first.",
    links: [
      link("Yield curve", "Investopedia", "https://www.investopedia.com/terms/y/yieldcurve.asp"),
      link("Inverted yield curve", "Investopedia", "https://www.investopedia.com/terms/i/invertedyieldcurve.asp"),
      link("10-year minus 2-year Treasury spread, live", "FRED", "https://fred.stlouisfed.org/series/T10Y2Y"),
    ],
  },
  {
    hint: "Ask where the money comes from: the share price going up, or cash the company pays you.",
    links: [
      link("Growth stocks", "Investopedia", "https://www.investopedia.com/terms/g/growthstock.asp"),
      link("Income stocks", "Investopedia", "https://www.investopedia.com/terms/i/incomestock.asp"),
    ],
  },
  {
    hint: "A company exists before it is public. It only becomes a stock once it's listed and anyone can trade it.",
    links: [
      link("Initial public offering (IPO)", "Investopedia", "https://www.investopedia.com/terms/i/ipo.asp"),
      link("Initial public offering", "Wikipedia", "https://en.wikipedia.org/wiki/Initial_public_offering"),
    ],
  },
]

const HELP_MACRO: StepHelp[] = [
  {
    hint: "Money moves toward the currency that pays more. Gold pays nothing, so it competes with what bonds pay after inflation. And stocks are valued against what cash earns.",
    links: [
      link("Interest rate differential", "Investopedia", "https://www.investopedia.com/terms/i/interest-rate-differential.asp"),
      link("What the market expects the Fed to do next", "CME FedWatch", "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"),
    ],
  },
  {
    hint: "Inflation rate = (new price − old price) ÷ old price.",
    links: [
      link("Inflation", "Investopedia", "https://www.investopedia.com/terms/i/inflation.asp"),
      link("Consumer Price Index releases", "U.S. Bureau of Labor Statistics", "https://www.bls.gov/cpi/"),
    ],
  },
  {
    hint: "You keep the gap between the rate you earn and the rate you pay, on the whole amount.",
    links: [link("Currency carry trade", "Investopedia", "https://www.investopedia.com/terms/c/currencycarrytrade.asp")],
  },
  {
    hint: "Cutting rates makes borrowing cheaper and helps jobs. Hiking makes it expensive and cools prices.",
    links: [
      link("The Fed's two goals", "Federal Reserve", "https://www.federalreserve.gov/faqs/what-economic-goals-does-federal-reserve-seek-to-achieve-through-monetary-policy.htm"),
      link("FOMC meeting calendar and statements", "Federal Reserve", "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"),
    ],
  },
  {
    hint: "Real yield = what the bond pays − inflation. If inflation is bigger, the answer is negative.",
    links: [
      link("Real interest rate", "Investopedia", "https://www.investopedia.com/terms/r/realinterestrate.asp"),
      link("10-year real yield (TIPS), live", "FRED", "https://fred.stlouisfed.org/series/DFII10"),
    ],
  },
  {
    hint: "Start with the news, then what traders expect the central bank to do, then bonds, and gold last.",
    links: [link("Intermarket analysis", "Investopedia", "https://www.investopedia.com/terms/i/intermarketanalysis.asp")],
  },
]

const HELP_TRADING: StepHelp[] = [
  {
    hint: "The thick part of a candle is drawn between two prices; the thin lines reach the extremes.",
    links: [
      link("Candlestick charts", "Investopedia", "https://www.investopedia.com/trading/candlestick-charting-what-is-it/"),
      link("Candlestick chart", "Wikipedia", "https://en.wikipedia.org/wiki/Candlestick_chart"),
    ],
  },
  {
    hint: "“Point” means one price. “Area” means a range. “Low-volume” means little trading happened there.",
    links: [
      link("Volume profile: the basic concepts", "TradingView", "https://www.tradingview.com/support/solutions/43000502040-volume-profile/"),
      link("Market profile", "Wikipedia", "https://en.wikipedia.org/wiki/Market_profile"),
    ],
  },
  {
    hint: "In an uptrend each swing peaks and bottoms out a little higher than the last one.",
    links: [
      link("Dow theory", "Investopedia", "https://www.investopedia.com/terms/d/dowtheory.asp"),
      link("Trend analysis", "Investopedia", "https://www.investopedia.com/terms/t/trendanalysis.asp"),
    ],
  },
  {
    hint: "Three conditions: the range has finished forming, a candle closes outside it, and volume confirms.",
    links: [
      link("Opening range", "Investopedia", "https://www.investopedia.com/terms/o/opening-range.asp"),
      link("Breakouts", "Investopedia", "https://www.investopedia.com/terms/b/breakout.asp"),
    ],
  },
  {
    hint: "Risk = entry − stop. For 1 : 2, the target sits twice that distance above the entry.",
    links: [
      link("Understanding the risk/reward ratio", "Investopedia", "https://www.investopedia.com/terms/r/riskrewardratio.asp"),
      link("E-mini Nasdaq-100 (NQ) contract", "CME Group", "https://www.cmegroup.com/markets/equities/nasdaq/e-mini-nasdaq-100.html"),
    ],
  },
  {
    hint: "Markets spend most of their time agreeing on a price. Something breaks that agreement, price searches, then settles again.",
    links: [link("Market profile and auction theory", "Wikipedia", "https://en.wikipedia.org/wiki/Market_profile")],
  },
]

for (const [steps, help] of [
  [TEST_PROFESSION, HELP_PROFESSION],
  [TEST_MARKETS, HELP_MARKETS],
  [TEST_MACRO, HELP_MACRO],
  [TEST_TRADING, HELP_TRADING],
] as const)
  steps.forEach((st, i) => Object.assign(st, { help: help[i] }))
