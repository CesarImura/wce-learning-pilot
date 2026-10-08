"use client";

// Exercise lab: every topic coin, in every state.

import { useState } from "react";
import { TOPIC_LIST } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { Coin, type CoinState } from "./coin";

const STATES: { id: string; label: string; state: CoinState; pct: number }[] = [
  { id: "new", label: "Not started", state: "new", pct: 0 },
  { id: "half", label: "Halfway", state: "active", pct: 50 },
  { id: "mastered", label: "Mastered", state: "mastered", pct: 100 },
  { id: "locked", label: "Locked", state: "locked", pct: 0 },
];

export function CoinLab() {
  const [stateId, setStateId] = useState("half");
  const st = STATES.find((s) => s.id === stateId)!;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-medium">Coin lab</h2>
          <p className="text-[14px] text-white/55">
            One struck-metal coin per topic. Coins polish up as you progress.
            Move over a coin to tilt it, click to inspect it.
          </p>
        </div>
        <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
          {STATES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStateId(s.id)}
              className={cn(
                "h-[30px] rounded-lg px-3 text-[13px] font-medium transition-all",
                stateId === s.id
                  ? "border border-white/10 bg-white/5 text-white"
                  : "border border-transparent text-white/55 hover:text-white",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="glass p-5">
        <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 xl:grid-cols-5">
          {TOPIC_LIST.map((t) => (
            <div key={t.id} className="flex flex-col items-center gap-3">
              <Coin
                topic={t}
                state={st.state}
                pct={st.pct}
                size={200}
                stats={
                  st.state === "locked"
                    ? { primary: "Soon", lines: ["Coming to the Academy"] }
                    : {
                        primary:
                          st.state === "mastered" ? "Mastered" : `${st.pct}%`,
                        lines: [`${Math.round(st.pct / 6.25)}/16 lessons`],
                      }
                }
              />
              <p className="text-[14px]" style={{ color: t.color }}>
                {t.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
