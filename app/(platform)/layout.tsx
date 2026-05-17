import Sidebar from '@/components/Sidebar'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  )
}
