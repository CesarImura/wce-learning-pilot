"use client"

import dynamic from "next/dynamic"

// Chart math (Math.log/cos) can differ by a few ULPs between Node and the browser,
// so the interactive player renders on the client only.
export const LessonClient = dynamic(() => import("./lesson-player").then((m) => m.LessonPlayer), {
  ssr: false,
  loading: () => <div className="min-h-dvh" />,
})
