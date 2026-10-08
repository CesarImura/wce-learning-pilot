import { notFound } from "next/navigation"
import { LessonClient } from "@/components/lesson-client"
import { COURSES, LAB_STEPS, courseLessons, getLesson, unitTestId } from "@/lib/courses"

// All params are known up front (see generateStaticParams), so blocking on them is fine.
export const instant = false

export function generateStaticParams() {
  const courseLessonParams = COURSES.flatMap((c) => [
    ...courseLessons(c).map((l) => ({ courseId: c.id, lessonId: l.id })),
    ...c.units.map((u) => ({ courseId: c.id, lessonId: unitTestId(u) })),
  ])
  // "lab" plays the demo of every exercise type, or a single type.
  const labParams = ["all", ...Object.keys(LAB_STEPS)].map((lessonId) => ({ courseId: "lab", lessonId }))
  return [...courseLessonParams, ...labParams]
}

export default async function LessonPage({ params }: PageProps<"/courses/[courseId]/[lessonId]">) {
  const { courseId, lessonId } = await params
  const lesson = getLesson(courseId, lessonId)
  if (!lesson) notFound()

  return (
    <LessonClient
      key={`${courseId}/${lessonId}`}
      lesson={lesson}
      courseId={courseId}
      backHref={courseId === "lab" ? "/lab" : `/courses/${courseId}`}
    />
  )
}
