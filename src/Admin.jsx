import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'

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
    const { data, error } = await supabase
      .from('sandwich_admin_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle()
    setBusy(false)
    if (error || !data) { setErr('Invalid username or password.'); return }
    onLogin(data)
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
          <p style={{ fontSize:12, color:'#666', marginBottom:4 }}>Username</p>
          <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="Username" style={{ ...inp, fontSize:16 }} />
          <p style={{ fontSize:12, color:'#666', marginBottom:4 }}>Password</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="Password" style={{ ...inp, fontSize:16, marginBottom:14 }} />
          {err && <p style={{ color:'#c62828', fontSize:12, marginBottom:10 }}>{err}</p>}
          <button onClick={go} disabled={busy} style={{ ...btn, width:'100%', padding:10 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports({ user, onLogout }) {
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
  const cheeseCounts = tally(rows.flatMap(r => r.cheeses || []))

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

        <div style={card}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Signature Sandwiches</div>
          <div style={{ color:'#999', fontSize:13 }}>Not available yet — this report will populate once the Signature Sandwiches menu is built and live.</div>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const [user, setUser] = useState(null)
  if (!user) return <Login onLogin={setUser} />
  return <Reports user={user} onLogout={() => setUser(null)} />
}
