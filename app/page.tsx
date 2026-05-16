import Link from 'next/link'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const [
    [{ total_ads }],
    [{ total_brands }],
    [{ total_rules }],
    [{ total_formats }],
    brands,
    recentAds,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total_ads FROM ads`,
    sql`SELECT COUNT(*)::int AS total_brands FROM brands`,
    sql`SELECT COUNT(*)::int AS total_rules FROM global_rules`,
    sql`SELECT COUNT(*)::int AS total_formats FROM format_examples`,
    sql`SELECT * FROM brands ORDER BY created_at LIMIT 5`,
    sql`SELECT a.*, b.name AS brand_name FROM ads a LEFT JOIN brands b ON b.id = a.brand_id ORDER BY a.created_at DESC LIMIT 5`,
  ])

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Dashboard</div>
        <div className="topbar-actions">
          <Link href="/generator" className="btn btn-accent">✦ Generate Ad</Link>
        </div>
      </div>
      <div className="content">
        <div className="home-stats">
          <div className="stat-card accent">
            <div className="stat-label">Total Ads Generated</div>
            <div className="stat-value">{total_ads}</div>
            <div className="stat-sub">all time</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Brands</div>
            <div className="stat-value">{total_brands}</div>
            <div className="stat-sub">configured</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Global Rules</div>
            <div className="stat-value">{total_rules}</div>
            <div className="stat-sub">always applied</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Format Examples</div>
            <div className="stat-value">{total_formats}</div>
            <div className="stat-sub">in library</div>
          </div>
        </div>

        <div className="section-header">
          <div className="section-title">Your Brands</div>
          <Link href="/brands" className="btn btn-sm">View all</Link>
        </div>
        <div className="brand-grid">
          {brands.map((brand: any, i: number) => {
            const initials = brand.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
            return (
              <Link key={brand.id} href={`/brands/${brand.id}`} className="brand-card">
                <div className={`brand-avatar color-${i % 5}`}>{initials}</div>
                <div className="brand-name">{brand.name}</div>
                <div className="brand-meta">{brand.ad_count || 0} ads</div>
                <div className="brand-tags">
                  {brand.countries?.map((c: string) => (
                    <span key={c} className="tag">{c}</span>
                  ))}
                </div>
              </Link>
            )
          })}
          <Link href="/brands" className="brand-card new-card">
            <div style={{ fontSize: 28, opacity: 0.3 }}>+</div>
            <div style={{ fontSize: 13 }}>Add your first brand</div>
          </Link>
        </div>

        <div className="section-header" style={{ marginTop: 28 }}>
          <div className="section-title">Recent Ads</div>
          <Link href="/ads-log" className="btn btn-sm">View all</Link>
        </div>

        {!recentAds.length ? (
          <div className="ads-table">
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: 13 }}>
              No ads generated yet.{' '}
              <Link href="/generator" style={{ color: 'var(--accent)' }}>Create your first →</Link>
            </div>
          </div>
        ) : (
          <div className="ads-table">
            <div className="ads-table-header">
              <span>ID</span><span>Brand</span><span>Country</span><span>Date</span><span>Preview</span><span></span>
            </div>
            {recentAds.map((ad: any) => (
              <div key={ad.id} className="ads-table-row">
                <span><span className="ad-id">{ad.ad_id}</span></span>
                <span style={{ fontSize: 13 }}>{ad.brand_name ?? '—'}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{ad.country}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {new Date(ad.created_at).toLocaleDateString('nl-NL')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ad.body?.slice(0, 80)}…
                </span>
                <span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
