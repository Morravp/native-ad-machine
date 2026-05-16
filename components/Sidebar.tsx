'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  function navClass(path: string) {
    return 'nav-item' + (pathname === path ? ' active' : '')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-name">AD MACHINE</span>
        <div className="sub">Native Copy Studio</div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Overview</div>
        <Link href="/" className={navClass('/')}>
          <span className="nav-icon">⬡</span> Dashboard
        </Link>
        <Link href="/brands" className={navClass('/brands')}>
          <span className="nav-icon">◈</span> Brands
        </Link>
        <Link href="/ads-log" className={navClass('/ads-log')}>
          <span className="nav-icon">◫</span> Ad Log
        </Link>

        <div className="nav-section-label">Generate</div>
        <Link href="/generator" className={navClass('/generator')}>
          <span className="nav-icon">✦</span> Generate Ad
        </Link>

        <div className="nav-section-label">Settings</div>
        <Link href="/rules" className={navClass('/rules')}>
          <span className="nav-icon">◎</span> Global Rules
        </Link>
        <Link href="/formats" className={navClass('/formats')}>
          <span className="nav-icon">◻</span> Format Library
        </Link>
      </nav>
    </aside>
  )
}
