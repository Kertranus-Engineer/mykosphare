import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col pl-60">
        <AppHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
