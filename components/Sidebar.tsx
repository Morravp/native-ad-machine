'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  function navClass(path: string) {
    const active = pathname.startsWith(path)
    return 'nav-item' + (active ? ' active' : '')
  }

  const isAdMachine = !pathname.startsWith('/landing-page')

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo" style={{ textDecoration: 'none', display: 'block' }}>
        <span className="logo-name" style={{ color: 'var(--accent)' }}>
          {isAdMachine ? 'AD MACHINE' : 'LANDING PAGE'}
        </span>
        <div className="sub">{isAdMachine ? 'Native Copy Studio' : 'Page Cloner & Editor'}</div>
      </Link>

      <Link href="/" className="sidebar-hub-btn">
        <span style={{ opacity: 0.5 }}>⬡</span> Hub
      </Link>

      {isAdMachine ? (
        <nav className="sidebar-nav">
          <div className="nav-section-label">Overview</div>
          <Link href="/dashboard" className={navClass('/dashboard')}>
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
            <span className="nav-icon">✦</span> Generate Native Ad
          </Link>
          <Link href="/vsl" className={navClass('/vsl')}>
            <span className="nav-icon">▶</span> Generate VSL Script
          </Link>

          <div className="nav-section-label">Swipe Files</div>
          <Link href="/swipe" className={navClass('/swipe')}>
            <span className="nav-icon">◈</span> Boards
          </Link>

          <div className="nav-section-label">Settings</div>
          <Link href="/rules" className={navClass('/rules')}>
            <span className="nav-icon">◎</span> Global Rules
          </Link>
          <Link href="/formats" className={navClass('/formats')}>
            <span className="nav-icon">◻</span> Format Library
          </Link>
        </nav>
      ) : (
        <nav className="sidebar-nav">
          <div className="nav-section-label">Landing Pages</div>
          <Link href="/landing-page" className={pathname === '/landing-page' ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">⬡</span> All Clones
          </Link>
          <Link href="/landing-page/new" className={navClass('/landing-page/new')}>
            <span className="nav-icon">✦</span> Clone New Page
          </Link>
        </nav>
      )}
    </aside>
  )
}
