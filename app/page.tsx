import Link from 'next/link'

export default function Hub() {
  const tools = [
    {
      href: '/dashboard',
      name: 'AD MACHINE',
      sub: 'Native Copy Studio',
      description: 'Generate advertorial-style native ad copy for any brand, country, and format using Claude AI.',
      icon: '✦',
      tag: 'copywriting',
    },
    {
      href: '/landing-page',
      name: 'LANDING PAGE',
      sub: 'Page Cloner & Editor',
      description: 'Clone any landing page or product page 1:1 from a URL. Preview, edit sections, and download.',
      icon: '◈',
      tag: 'design',
    },
  ]

  return (
    <div className="hub-root">
      <div className="hub-header">
        <div className="hub-logo">CREATIVE HUB</div>
        <div className="hub-tagline">Select a tool to get started</div>
      </div>

      <div className="hub-grid">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="hub-card">
            <div className="hub-card-icon">{tool.icon}</div>
            <div className="hub-card-content">
              <div className="hub-card-name">{tool.name}</div>
              <div className="hub-card-sub">{tool.sub}</div>
              <div className="hub-card-desc">{tool.description}</div>
            </div>
            <div className="hub-card-footer">
              <span className="hub-card-tag">{tool.tag}</span>
              <span className="hub-card-arrow">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
