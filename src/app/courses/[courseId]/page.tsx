import { notFound } from "next/navigation"
import { CourseDetail } from "@/components/wce/course-detail"
import { PageShell } from "@/components/wce/top-nav"
import { COURSES, getCourse } from "@/lib/courses"

// All params are known up front (see generateStaticParams), so blocking on them is fine.
export const instant = false

export function generateStaticParams() {
  return COURSES.filter((c) => c.status === "available").map((c) => ({ courseId: c.id }))
}

export default async function CoursePage({ params }: PageProps<"/courses/[courseId]">) {
  const { courseId } = await params
  const course = getCourse(courseId)
  if (!course || course.status !== "available") notFound()

  return (
    <PageShell>
      <CourseDetail course={course} />
    </PageShell>
  )
}
