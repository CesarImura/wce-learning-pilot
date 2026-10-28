import { PageShell } from "@/components/wce/top-nav"
import { Dashboard } from "@/components/wce/dashboard"

export default function DashboardPage() {
  return (
    <PageShell training={false}>
      <Dashboard />
    </PageShell>
  )
}
