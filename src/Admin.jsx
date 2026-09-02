import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import { printLabels, rowsToPrintable } from './lib/labels.js'
import { LOCATIONS } from './lib/locations.js'

// ─── Shared styles (kept close to App.jsx's palette) ─────────────────────────
const inp = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #ddd', fontSize:14, marginBottom:10, boxSizing:'border-box' }
const card = { background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:20, marginBottom:16 }
const btn = { background:'#8B1A2B', color:'#fff', border:'none', borderRadius:8, padding:'10px 16px', fontSize:14, fontWeight:600, cursor:'pointer' }

function tod() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function fmtMoney(n) { return `$${(n || 0).toFixed(2)}` }

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setErr('')
    setBusy(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username.trim(),
      password: password.trim(),
    })
    setBusy(false)
    if (error) {
      setErr(error.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : `Login error: ${error.message}`)
      return
    }
    onLogin({ ...data.user, username: data.user.email })
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'2rem', background:'#f5f5f5', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:320 }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <img src="/logo.jpg" alt="Iavarone Bros." style={{ width:100, height:100, objectFit:'contain', display:'block', margin:'0 auto 10px' }} />
          <p style={{ fontSize:17, fontWeight:500 }}>Iavarone Bros.</p>
          <p style={{ color:'#888', fontSize:12 }}>Sandwich App Admin</p>
        </div>
        <div style={card}>
          <p style={{ fontSize:12, color:'#666', marginBottom:4 }}>Email</p>
          <input type="email" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="you@ibfoods.com" style={{ ...inp, fontSize:16 }} />
          <p style={{ fontSize:12, color:'#666', marginBottom:4 }}>Password</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="Password" style={{ ...inp, fontSize:16, marginBottom:14 }} />
          {err && <p style={{ color:'#c62828', fontSize:12, marginBottom:10 }}>{err}</p>}
          <button onClick={go} disabled={busy} style={{ ...btn, width:'100%', padding:10 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </div>
    </div>
  )
}


// ─── Orders (live feed / deli-side view) ─────────────────────────────────────
const REFRESH_MS = 15000

function Orders({ user, onLogout, onNav }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('today')          // 'today' | '7d'
  const [locFilter, setLocFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const start = range === 'today' ? `${tod()}T00:00:00` : `${daysAgo(7)}T00:00:00`
    const { data, error } = await supabase
      .from('sandwich_orders')
      .select('*')
      .gte('created_at', start)
      .order('created_at', { ascending: false })
      .limit(600)
    if (error) console.error('Orders load error:', error)
    else { setRows(data || []); setLastUpdated(new Date()) }
    setLoading(false)
  }, [range])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => load(true), REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  // group rows into orders by cart_id (fallback: order_number)
  const orderMap = {}
  rows.forEach(r => {
    const key = r.cart_id || r.order_number
    if (!orderMap[key]) orderMap[key] = []
    orderMap[key].push(r)
  })
  let orders = Object.values(orderMap).map(list => {
    const sorted = [...list].sort((a, b) => (a.item_index ?? 0) - (b.item_index ?? 0))
    const first = sorted[0]
    return {
      key: first.cart_id || first.order_number,
      orderNum: first.order_number,
      createdAt: list.reduce((min, r) => r.created_at < min ? r.created_at : min, list[0].created_at),
      location: first.location || '',
      name: `${first.first_name || ''} ${first.last_name || ''}`.trim(),
      phone: first.phone || '',
      items: sorted,
      total: list.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0),
    }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const locations = LOCATIONS.map(l => l.name)
  if (locFilter !== 'all') orders = orders.filter(o => o.location === locFilter)
  const q = search.trim().toLowerCase()
  if (q) orders = orders.filter(o =>
    o.orderNum.toLowerCase().includes(q) || o.name.toLowerCase().includes(q) || o.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000')
  )

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const fmtDay = (iso) => new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })
  const isFresh = (iso) => Date.now() - new Date(iso).getTime() < 2 * 60 * 1000

  const itemLine = (r) => {
    if (r.item_type === 'signature') return `★ ${r.signature_name || 'Signature Sandwich'}`
    const parts = [(r.proteins || []).join(', ')]
    if (r.double_meat) parts.push('Double Meat')
    if ((r.cheeses || []).length) parts.push((r.cheeses || []).join(', '))
    return `${parts.filter(Boolean).join(' · ')} on ${r.bread || '—'}`
  }

  const reprint = (o) => {
    const { orderNum, customer, cart } = rowsToPrintable(o.items)
    printLabels(orderNum, customer, cart)
  }

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', fontSize:14, background:'#f5f5f5', minHeight:'100vh' }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700 }}>Sandwich App · Orders</div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ color:'#888', fontSize:13 }}>{user.username}</span>
          <button onClick={onLogout} style={{ background:'none', border:'1px solid #ddd', borderRadius:8, padding:'6px 12px', fontSize:13, cursor:'pointer' }}>Log out</button>
        </div>
      </div>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'1.25rem' }}>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <button onClick={() => onNav('orders')} style={btn}>Orders</button>
          <button onClick={() => onNav('reports')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Reports</button>
          <button onClick={() => onNav('sms')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>SMS Opt-Ins</button>
          <button onClick={() => onNav('users')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Users</button>
        </div>

        <div style={{ ...card, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setRange('today')} style={range === 'today' ? btn : { ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Today</button>
            <button onClick={() => setRange('7d')} style={range === '7d' ? btn : { ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Last 7 Days</button>
          </div>
          <select value={locFilter} onChange={e => setLocFilter(e.target.value)} style={{ ...inp, width:'auto', marginBottom:0 }}>
            <option value="all">All locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, or order #" style={{ ...inp, flex:1, minWidth:180, marginBottom:0 }} />
          <span style={{ color:'#999', fontSize:12, marginLeft:'auto' }}>
            {loading ? 'Loading…' : lastUpdated ? `Auto-refreshes · updated ${lastUpdated.toLocaleTimeString([], { hour:'numeric', minute:'2-digit', second:'2-digit' })}` : ''}
          </span>
        </div>

        {!orders.length && !loading && (
          <div style={{ ...card, textAlign:'center', color:'#999' }}>No orders {range === 'today' ? 'yet today' : 'in the last 7 days'}{locFilter !== 'all' ? ` at ${locFilter}` : ''}.</div>
        )}

        {orders.map(o => (
          <div key={o.key} style={{ ...card, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:20, fontWeight:800, color:'#8B1A2B' }}>#{o.orderNum}</span>
                {isFresh(o.createdAt) && <span style={{ background:'#8B1A2B', color:'#fff', fontSize:10, fontWeight:800, borderRadius:20, padding:'2px 8px', letterSpacing:0.5 }}>JUST IN</span>}
                <span style={{ color:'#666', fontSize:13 }}>{range === '7d' ? `${fmtDay(o.createdAt)} · ` : ''}{fmtTime(o.createdAt)}</span>
                {o.location && <span style={{ background:'#f0f0f0', borderRadius:20, padding:'2px 10px', fontSize:12, color:'#555' }}>{o.location}</span>}
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700 }}>{o.name}</div>
                <div style={{ color:'#888', fontSize:12 }}>{o.phone}</div>
              </div>
            </div>
            <div style={{ margin:'10px 0', borderTop:'1px solid #f0f0f0' }}>
              {o.items.map((r, i) => (
                <div key={r.id || i} style={{ padding:'8px 0', borderBottom:'1px solid #f7f7f7', display:'flex', justifyContent:'space-between', gap:10 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13.5 }}>
                      {r.label_name ? `${r.label_name}'s — ` : ''}{itemLine(r)}
                    </div>
                    {(r.paid_toppings || []).concat(r.free_toppings || [], r.dressings || []).length > 0 && r.item_type !== 'signature' && (
                      <div style={{ color:'#888', fontSize:12, marginTop:2 }}>{(r.paid_toppings || []).concat(r.free_toppings || [], r.dressings || []).join(', ')}</div>
                    )}
                    {r.notes && <div style={{ color:'#b05a00', fontSize:12, marginTop:2 }}>Note: {r.notes}</div>}
                  </div>
                  <div style={{ fontWeight:700, fontSize:13, whiteSpace:'nowrap' }}>{fmtMoney(parseFloat(r.total) || 0)}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={() => reprint(o)} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B', padding:'8px 14px' }}>
                🖨 Reprint Label{o.items.length > 1 ? `s (${o.items.length})` : ''}
              </button>
              <div style={{ fontWeight:800, fontSize:15 }}>{fmtMoney(o.total)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports({ user, onLogout, onNav }) {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(tod())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sandwich_orders')
      .select('*')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
    if (error) console.error('Report load error:', error)
    setRows(data || [])
    setLoading(false)
  }, [from, to])

  useEffect(() => { load() }, [load])

  // ── Aggregate ──
  const orderCount = new Set(rows.map(r => r.cart_id || r.order_number)).size
  const sandwichCount = rows.length
  const revenue = rows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
  const doubleMeatCount = rows.filter(r => r.double_meat).length
  const smsOptInCount = rows.filter(r => r.sms_opt_in).length

  const tally = (arr) => {
    const m = {}
    arr.forEach(name => { m[name] = (m[name] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }

  const proteinCounts = tally(rows.flatMap(r => r.proteins || []))
  const signatureCounts = tally(rows.filter(r => r.item_type === 'signature').map(r => r.signature_name).filter(Boolean))
  const cheeseCounts = tally(rows.flatMap(r => r.cheeses || []))
  const locationCounts = tally(rows.map(r => r.location).filter(Boolean))

  const comboMap = {}
  rows.forEach(r => {
    const proteins = r.proteins || []
    const cheeses = r.cheeses || []
    if (!proteins.length || !cheeses.length) return
    proteins.forEach(p => cheeses.forEach(c => {
      const key = `${p} + ${c}`
      comboMap[key] = (comboMap[key] || 0) + 1
    }))
  })
  const comboCounts = Object.entries(comboMap).sort((a, b) => b[1] - a[1]).slice(0, 15)

  const StatBox = ({ label, value }) => (
    <div style={{ ...card, textAlign:'center', flex:1, padding:16 }}>
      <div style={{ fontSize:24, fontWeight:800, color:'#8B1A2B' }}>{value}</div>
      <div style={{ fontSize:12, color:'#888', textTransform:'uppercase', letterSpacing:0.5, marginTop:4 }}>{label}</div>
    </div>
  )

  const RankTable = ({ title, data, emptyMsg }) => (
    <div style={card}>
      <div style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>{title}</div>
      {!data.length ? (
        <div style={{ color:'#999', fontSize:13 }}>{emptyMsg || 'No data for this range.'}</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <tbody>
            {data.slice(0, 15).map(([name, count], i) => (
              <tr key={name} style={{ borderBottom:'1px solid #f0f0f0' }}>
                <td style={{ padding:'6px 4px', color:'#999', width:24 }}>{i + 1}</td>
                <td style={{ padding:'6px 4px' }}>{name}</td>
                <td style={{ padding:'6px 4px', textAlign:'right', fontWeight:700 }}>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', fontSize:14, background:'#f5f5f5', minHeight:'100vh' }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700 }}>Sandwich App · Admin Reports</div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ color:'#888', fontSize:13 }}>{user.username}</span>
          <button onClick={onLogout} style={{ background:'none', border:'1px solid #ddd', borderRadius:8, padding:'6px 12px', fontSize:13, cursor:'pointer' }}>Log out</button>
        </div>
      </div>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'1.25rem' }}>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <button onClick={() => onNav('orders')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Orders</button>
          <button onClick={() => onNav('reports')} style={btn}>Reports</button>
          <button onClick={() => onNav('sms')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>SMS Opt-Ins</button>
          <button onClick={() => onNav('users')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Users</button>
        </div>
        <div style={{ ...card, display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:12, color:'#666', marginBottom:4 }}>From</div>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inp, marginBottom:0 }} />
          </div>
          <div>
            <div style={{ fontSize:12, color:'#666', marginBottom:4 }}>To</div>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, marginBottom:0 }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setFrom(daysAgo(7)); setTo(tod()) }} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>7d</button>
            <button onClick={() => { setFrom(daysAgo(30)); setTo(tod()) }} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>30d</button>
            <button onClick={() => { setFrom(daysAgo(90)); setTo(tod()) }} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>90d</button>
          </div>
          {loading && <span style={{ color:'#999', fontSize:13 }}>Loading…</span>}
        </div>

        <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
          <StatBox label="Orders" value={orderCount} />
          <StatBox label="Sandwiches" value={sandwichCount} />
          <StatBox label="Revenue" value={fmtMoney(revenue)} />
          <StatBox label="Double Meat" value={doubleMeatCount} />
          <StatBox label="SMS Opt-Ins" value={smsOptInCount} />
        </div>

        <RankTable title="Most Popular Proteins" data={proteinCounts} />
        <RankTable title="Most Popular Cheeses" data={cheeseCounts} />
        <RankTable title="Most Popular Protein + Cheese Combos" data={comboCounts} />
        <RankTable title="Orders by Location" data={locationCounts} emptyMsg="No location data for this range yet." />

        <RankTable title="Most Popular Signature Sandwiches" data={signatureCounts} emptyMsg="No signature sandwich orders in this range yet." />
      </div>
    </div>
  )
}

// ─── SMS Opt-Ins ────────────────────────────────────────────────────────────
function SmsOptIns({ user, onLogout, onNav }) {
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(tod())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sandwich_orders')
      .select('first_name, last_name, phone, email, location, created_at')
      .eq('sms_opt_in', true)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false })
    if (error) console.error('SMS opt-in load error:', error)
    setRows(data || [])
    setLoading(false)
  }, [from, to])

  useEffect(() => { load() }, [load])

  // De-dupe by phone, keep most recent opt-in per customer
  const byPhone = {}
  rows.forEach(r => { if (!byPhone[r.phone]) byPhone[r.phone] = r })
  const contacts = Object.values(byPhone)

  const downloadCsv = () => {
    const header = ['First Name', 'Last Name', 'Phone', 'Email', 'Location', 'Most Recent Order']
    const lines = contacts.map(c => [c.first_name, c.last_name, c.phone, c.email || '', c.location || '', new Date(c.created_at).toLocaleDateString()])
    const csv = [header, ...lines].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sms-opt-ins-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', fontSize:14, background:'#f5f5f5', minHeight:'100vh' }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700 }}>Sandwich App · Admin Reports</div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ color:'#888', fontSize:13 }}>{user.username}</span>
          <button onClick={onLogout} style={{ background:'none', border:'1px solid #ddd', borderRadius:8, padding:'6px 12px', fontSize:13, cursor:'pointer' }}>Log out</button>
        </div>
      </div>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'1.25rem' }}>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <button onClick={() => onNav('orders')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Orders</button>
          <button onClick={() => onNav('reports')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Reports</button>
          <button onClick={() => onNav('sms')} style={btn}>SMS Opt-Ins</button>
          <button onClick={() => onNav('users')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Users</button>
        </div>

        <div style={{ ...card, display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:12, color:'#666', marginBottom:4 }}>From</div>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inp, marginBottom:0 }} />
          </div>
          <div>
            <div style={{ fontSize:12, color:'#666', marginBottom:4 }}>To</div>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, marginBottom:0 }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { setFrom(daysAgo(7)); setTo(tod()) }} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>7d</button>
            <button onClick={() => { setFrom(daysAgo(30)); setTo(tod()) }} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>30d</button>
            <button onClick={() => { setFrom(daysAgo(90)); setTo(tod()) }} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>90d</button>
            <button onClick={() => { setFrom('2020-01-01'); setTo(tod()) }} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>All time</button>
          </div>
          {loading && <span style={{ color:'#999', fontSize:13 }}>Loading…</span>}
        </div>

        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:15 }}>Opted-in contacts ({contacts.length})</div>
            <button onClick={downloadCsv} disabled={!contacts.length} style={{ ...btn, padding:'6px 12px', fontSize:13 }}>Download CSV</button>
          </div>
          {!contacts.length ? (
            <div style={{ color:'#999', fontSize:13 }}>No opted-in customers in this range.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #eee', textAlign:'left' }}>
                  <th style={{ padding:'6px 4px' }}>Name</th>
                  <th style={{ padding:'6px 4px' }}>Phone</th>
                  <th style={{ padding:'6px 4px' }}>Location</th>
                  <th style={{ padding:'6px 4px' }}>Last Order</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={c.phone + i} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'6px 4px' }}>{c.first_name} {c.last_name}</td>
                    <td style={{ padding:'6px 4px' }}>{c.phone}</td>
                    <td style={{ padding:'6px 4px' }}>{c.location || '—'}</td>
                    <td style={{ padding:'6px 4px', color:'#999' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize:11, color:'#aaa', marginTop:12 }}>
            Only customers who checked the SMS opt-in box are listed. De-duplicated by phone number (most recent order shown).
          </p>
        </div>
      </div>
    </div>
  )
}


function Users({ user, onLogout, onNav }) {
  return (
    <div style={{ fontFamily:'system-ui,sans-serif', fontSize:14, background:'#f5f5f5', minHeight:'100vh' }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #e8e8e8', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:700 }}>Sandwich App · Admin Reports</div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ color:'#888', fontSize:13 }}>{user.username}</span>
          <button onClick={onLogout} style={{ background:'none', border:'1px solid #ddd', borderRadius:8, padding:'6px 12px', fontSize:13, cursor:'pointer' }}>Log out</button>
        </div>
      </div>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'1.25rem' }}>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <button onClick={() => onNav('orders')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Orders</button>
          <button onClick={() => onNav('reports')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Reports</button>
          <button onClick={() => onNav('sms')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>SMS Opt-Ins</button>
          <button onClick={() => onNav('users')} style={{ ...btn }}>Users</button>
          <button onClick={() => onNav('settings')} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }}>Settings</button>
        </div>

        <div style={card}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>Admin users</div>
          <p style={{ fontSize:13, color:'#666', lineHeight:1.6, marginBottom:12 }}>
            Admin logins are managed in Supabase Authentication, not here. Passwords are
            hashed and never stored in this app.
          </p>
          <p style={{ fontSize:13, color:'#666', lineHeight:1.6, marginBottom:12 }}>
            To add someone: Supabase dashboard → Authentication → Users → Add user →
            Create new user. Use their email address and turn on <strong>Auto Confirm User</strong>.
            To remove someone, delete them from that same list.
          </p>
          <a
            href="https://supabase.com/dashboard/project/jrdylryrawprhvefzfid/auth/users"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btn, display:'inline-block', textDecoration:'none' }}
          >
            Open Supabase Users
          </a>
        </div>
      </div>
    </div>
  )
}


// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({ user, onLogout, onNav }) {
  const [pins, setPins] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // New PIN form
  const [newName, setNewName] = useState('')
  const [newInitials, setNewInitials] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinErr, setPinErr] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: pinData }, { data: settingsData }] = await Promise.all([
      supabase.from('staff_pins').select('*').order('name'),
      supabase.from('app_settings').select('key,value').is('location_id', null),
    ])
    setPins(pinData || [])
    const s = Object.fromEntries((settingsData || []).map(r => [r.key, r.value]))
    setSettings(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Auto-derive initials from name
  function handleNameChange(val) {
    setNewName(val)
    const parts = val.trim().split(/\s+/).filter(Boolean)
    setNewInitials(parts.map(p => p[0].toUpperCase()).join('').slice(0, 3))
  }

  async function addPin() {
    setPinErr('')
    if (!newName.trim()) return setPinErr('Name is required')
    if (!newPin.match(/^\d{4}$/)) return setPinErr('PIN must be exactly 4 digits')
    if (!newInitials.trim()) return setPinErr('Initials are required')
    const { error } = await supabase.from('staff_pins').insert({ name: newName.trim(), initials: newInitials.trim().toUpperCase(), pin: newPin })
    if (error) return setPinErr(error.message.includes('unique') ? 'That PIN is already taken' : error.message)
    setNewName(''); setNewInitials(''); setNewPin('')
    load()
  }

  async function togglePin(id, active) {
    await supabase.from('staff_pins').update({ active: !active }).eq('id', id)
    load()
  }

  async function deletePin(id) {
    if (!window.confirm('Remove this staff PIN?')) return
    await supabase.from('staff_pins').delete().eq('id', id)
    load()
  }

  async function saveSetting(key, value) {
    setSaving(true)
    await supabase.from('app_settings').upsert({ location_id: null, key, value }, { onConflict: 'location_id,key' })
    setSettings(s => ({ ...s, [key]: value }))
    setSaving(false)
    setMsg('Saved')
    setTimeout(() => setMsg(''), 2000)
  }

  const sectionHead = { fontSize:16, fontWeight:700, marginBottom:16, color:'#1a1a1a', borderBottom:'2px solid #f0f0f0', paddingBottom:8 }
  const toggle = (key) => (
    <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
      <div
        onClick={() => saveSetting(key, settings[key] === 'true' ? 'false' : 'true')}
        style={{
          width:44, height:24, borderRadius:12, cursor:'pointer', flexShrink:0,
          background: settings[key] === 'true' ? '#8B1A2B' : '#ddd',
          position:'relative', transition:'background 0.2s',
        }}
      >
        <div style={{
          position:'absolute', top:2, left: settings[key] === 'true' ? 22 : 2,
          width:20, height:20, borderRadius:'50%', background:'#fff',
          transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </label>
  )

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', maxWidth:700, margin:'0 auto', padding:20 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.jpg" alt="IB" style={{ width:32, height:32, objectFit:'contain' }} />
          <span style={{ fontWeight:700, fontSize:16 }}>Settings</span>
          {msg && <span style={{ fontSize:12, color:'#4caf50', fontWeight:600 }}>{msg}</span>}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[['orders','Orders'],['reports','Reports'],['sms','SMS Opt-Ins'],['users','Users'],['settings','Settings']].map(([t,l]) => (
            <button key={t} onClick={() => onNav(t)} style={{ ...btn, ...(t === 'settings' ? {} : { background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B' }) }}>{l}</button>
          ))}
          <button onClick={onLogout} style={{ ...btn, background:'#fff', color:'#888', border:'1px solid #ddd' }}>Log out</button>
        </div>
      </div>

      {loading ? <div style={{ color:'#888', fontSize:14 }}>Loading…</div> : <>

        {/* ── App Settings ──────────────────────────────────────────────── */}
        <div style={card}>
          <div style={sectionHead}>App Settings</div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:16, borderBottom:'1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>Deli Ticket Number</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Show a ticket number field on the customer kiosk (0–99)</div>
            </div>
            {toggle('deli_number_enabled')}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:16, borderBottom:'1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>Auto-Print Labels</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Automatically print when a new order arrives (requires Zebra setup)</div>
            </div>
            {toggle('auto_print_enabled')}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:16, borderBottom:'1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>Staff PIN Login</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Require PIN at the counter screen</div>
            </div>
            {toggle('staff_pin_enabled')}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:16, borderBottom:'1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>Order-Ready Notifications</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Send customer SMS when order is marked complete (requires Twilio)</div>
            </div>
            {toggle('notifications_enabled')}
          </div>

          <div>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>In-Store Label Text</div>
            <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>Appears on the label instead of a customer name for in-store counter orders</div>
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={settings.instore_label_text || ''}
                onChange={e => setSettings(s => ({ ...s, instore_label_text: e.target.value }))}
                placeholder="Sandwich Order"
                style={{ ...inp, marginBottom:0, flex:1 }}
              />
              <button onClick={() => saveSetting('instore_label_text', settings.instore_label_text || 'Sandwich Order')} style={btn}>Save</button>
            </div>
          </div>
        </div>

        {/* ── Staff PINs ────────────────────────────────────────────────── */}
        <div style={card}>
          <div style={sectionHead}>Staff PINs</div>

          {/* Existing pins */}
          {pins.length === 0 && <div style={{ fontSize:13, color:'#888', marginBottom:16 }}>No staff PINs added yet.</div>}
          {pins.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background: p.active ? '#8B1A2B' : '#ddd', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0 }}>
                {p.initials}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14, color: p.active ? '#1a1a1a' : '#999' }}>{p.name}</div>
                <div style={{ fontSize:12, color:'#888' }}>PIN: {p.pin} · {p.active ? 'Active' : 'Inactive'}</div>
              </div>
              <button onClick={() => togglePin(p.id, p.active)} style={{ ...btn, background:'#fff', color:'#8B1A2B', border:'1px solid #8B1A2B', padding:'6px 12px', fontSize:12 }}>
                {p.active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => deletePin(p.id)} style={{ ...btn, background:'#fff', color:'#c62828', border:'1px solid #c62828', padding:'6px 12px', fontSize:12 }}>
                Remove
              </button>
            </div>
          ))}

          {/* Add new PIN */}
          <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid #f0f0f0' }}>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Add Staff Member</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <input value={newName} onChange={e => handleNameChange(e.target.value)} placeholder="Full name" style={{ ...inp, marginBottom:0, flex:'2 1 140px' }} />
              <input value={newInitials} onChange={e => setNewInitials(e.target.value.toUpperCase().slice(0,3))} placeholder="Initials" style={{ ...inp, marginBottom:0, flex:'0 1 80px', textTransform:'uppercase' }} />
              <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="4-digit PIN" inputMode="numeric" style={{ ...inp, marginBottom:0, flex:'0 1 100px' }} />
              <button onClick={addPin} style={{ ...btn, flex:'0 0 auto' }}>Add</button>
            </div>
            {pinErr && <div style={{ color:'#c62828', fontSize:12, marginTop:8 }}>{pinErr}</div>}
          </div>
        </div>

        {/* ── Supabase Auth Users note ──────────────────────────────────── */}
        <div style={card}>
          <div style={sectionHead}>Admin Users</div>
          <p style={{ fontSize:13, color:'#555', lineHeight:1.6, margin:0 }}>
            Admin logins are managed through Supabase Authentication.
            To add or remove admin users, go to the{' '}
            <a href="https://supabase.com/dashboard/project/jrdylryrawprhvefzfid/auth/users" target="_blank" rel="noreferrer" style={{ color:'#8B1A2B' }}>
              Supabase Auth dashboard
            </a>.
          </p>
        </div>

      </>}
    </div>
  )
}

export default function Admin() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('orders')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setUser({ ...data.session.user, username: data.session.user.email })
      }
      setChecking(false)
    })
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setTab('reports')
  }

  if (checking) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'system-ui,sans-serif', color:'#999', fontSize:14 }}>
        Loading…
      </div>
    )
  }

  if (!user) return <Login onLogin={setUser} />
  if (tab === 'settings') return <Settings user={user} onLogout={logout} onNav={setTab} />
  if (tab === 'users') return <Users user={user} onLogout={logout} onNav={setTab} />
  if (tab === 'sms') return <SmsOptIns user={user} onLogout={logout} onNav={setTab} />
  if (tab === 'reports') return <Reports user={user} onLogout={logout} onNav={setTab} />
  return <Orders user={user} onLogout={logout} onNav={setTab} />
}
