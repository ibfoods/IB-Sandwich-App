import React, { useState, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import { sendOrderSMS } from './lib/sms.js'
import {
  ALL_BREADS, ROLL_BREADS, isHeroBread,
  PROTEINS, PROTEIN_CATEGORIES,
  CHEESES, cheesePrices,
  PAID_TOPPINGS, FREE_TOPPINGS, DRESSINGS,
} from './lib/menu.js'
import { LOCATIONS, findLocation } from './lib/locations.js'
import { ACTIVE_SIGNATURES, SIGNATURE_CATEGORIES, findSignature, signatureBarcodeValue } from './lib/signatures.js'

const KIOSK_LOCATION_KEY = 'ib_kiosk_location'

// ─── Helpers ────────────────────────────────────────────────────────────────

const LOGO_URL = '/logo.jpg'
const MONOGRAM_URL = '/monogram.svg'

function genOrderNum() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

function calcTotal(order) {
  if (order.type === 'signature') {
    const sig = findSignature(order.signatureId)
    return sig ? sig.price : 0
  }
  if (!order.bread) return 0
  const hero = isHeroBread(order.bread)
  let total = 0
  // Price based on most expensive protein only
  const proteinPrices = order.proteins.map(p => {
    const found = PROTEINS.find(pr => pr.name === p)
    return found ? (hero ? (found.hero || 0) : (found.roll || 0)) : 0
  })
  if (proteinPrices.length) {
    const base = Math.max(...proteinPrices)
    total += order.doubleMeat ? base * 1.5 : base
  }
  const cp = hero ? 2.00 : 1.50
  total += order.cheeses.length * cp
  order.paidToppings.forEach(t => {
    const found = PAID_TOPPINGS.find(pt => pt.name === t)
    if (found) total += hero ? found.hero : found.roll
  })
  return total
}

function fmtMoney(n) { return `$${n.toFixed(2)}` }

function calcCartTotal(cart) {
  return cart.reduce((sum, o) => sum + calcTotal(o), 0)
}

function genCartId() {
  return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function emptyOrder() {
  return {
    type: 'byo',
    bread: '',
    proteins: [],
    cheeses: [],
    paidToppings: [],
    freeToppings: [],
    dressings: [],
    notes: '',
    doubleMeat: false,
    labelName: '',
  }
}

function signatureOrder(sig) {
  return {
    type: 'signature',
    signatureId: sig.id,
    bread: '', proteins: [], cheeses: [], paidToppings: [], freeToppings: [], dressings: [],
    notes: '', doubleMeat: false, labelName: '',
  }
}

function emptyCustomer() {
  return { firstName: '', lastName: '', phone: '', email: '', smsOptIn: false }
}

// ─── Print label ─────────────────────────────────────────────────────────────

function buildLabelHtml(orderNum, customer, order, sandwichIndex, sandwichTotal) {
  const sig = order.type === 'signature' ? findSignature(order.signatureId) : null
  const hero = order.bread ? isHeroBread(order.bread) : false
  const total = calcTotal(order)
  const proteinLines = order.proteins.map(p => `<div class="item-line">${p}${order.doubleMeat ? ' (2x)' : ''}</div>`).join('')
  const cheeseLines = order.cheeses.map(c => `<div class="item-line">${c}</div>`).join('')
  const toppingLines = [...order.paidToppings, ...order.freeToppings].map(t => `<div class="mod-line">${t}</div>`).join('')
  const dressingLines = order.dressings.map(d => `<div class="mod-line">${d}</div>`).join('')
  const orderLabel = sandwichTotal > 1 ? `${orderNum}-${sandwichIndex + 1}` : orderNum
  const orderSubLabel = sandwichTotal > 1 ? `Order (${sandwichIndex + 1}/${sandwichTotal})` : 'Order'
  const sandwichTag = order.labelName ? `${order.labelName}'s Sandwich` : ''
  return `<div class="label-page">
    <div class="top">
      <div class="logo-area">
        <img src="${window.location.origin}${LOGO_URL}" class="logo" onerror="this.style.display='none'" />
        <span class="website">ibfoods.com</span>
      </div>
      <div class="customer-block">
        <div class="cust-lbl">Customer</div>
        <div class="cust-name">${customer.firstName} ${customer.lastName}</div>
        ${sandwichTag ? `<div class="sandwich-tag">${sandwichTag}</div>` : ''}
      </div>
      <div class="order-box">
        <div class="order-lbl">${orderSubLabel}</div>
        <div class="order-num">${orderLabel}</div>
        ${order.doubleMeat ? '<div class="dbl-meat-flag">DOUBLE MEAT</div>' : ''}
      </div>
    </div>
    <div class="middle">
      <div class="mid-left">
        <div class="section-lbl">Item</div>
        ${sig
          ? `<div class="item-line">${sig.name}</div><div class="bread-line">Signature Sandwich</div>`
          : `<div class="bread-line">${order.bread}</div>${proteinLines}${cheeseLines}`}
      </div>
      <div class="mid-right">
        ${toppingLines || dressingLines ? `<div class="section-lbl">Add-ons</div>${toppingLines}${dressingLines}` : ''}
        ${order.notes ? `<div class="notes-line">Note: ${order.notes}</div>` : ''}
      </div>
    </div>
    <div class="footer">
      <div class="footer-col">
        <div class="lbl">Phone</div>
        <div class="val">${customer.phone}</div>
      </div>
      <div class="footer-col">
        <div class="lbl">Total</div>
        <div class="val">${fmtMoney(total)}</div>
      </div>
      <div class="barcode-cell">
        <svg class="barcode" id="bc${sandwichIndex}"></svg>
      </div>
    </div>
  </div>`
}

function printLabels(orderNum, customer, cart) {
  const win = window.open('', '_blank')
  const pages = cart.map((order, i) => buildLabelHtml(orderNum, customer, order, i, cart.length)).join('')
  const barcodeCalls = cart.map((sw, i) => {
    let code
    if (sw.type === 'signature') {
      const sig = findSignature(sw.signatureId)
      code = sig ? signatureBarcodeValue(sig) : orderNum.padStart(12, '0').slice(0, 12)
    } else {
      code = (cart.length > 1 ? `${orderNum}${i + 1}` : orderNum).padStart(12, '0').slice(0, 12)
    }
    return `try { JsBarcode("#bc${i}", "${code}", { format:"UPC", width:1.2, height:30, displayValue:false, margin:0 }); } catch(e) {}`
  }).join('\n')

  win.document.write(`<!DOCTYPE html><html><head><title>Order #${orderNum}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    @page { size: 4.25in 2.75in landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; }
    .label-page { width: 4.25in; height: 2.75in; padding: 0.1in 0.13in; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; page-break-after: always; }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .logo { width: 0.48in; height: 0.48in; object-fit: contain; }
    .logo-area { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
    .website { font-size: 5.5pt; color: #666; }
    .customer-block { flex: 1; text-align: center; padding: 0 0.1in; }
    .cust-lbl { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; }
    .cust-name { font-size: 15pt; font-weight: 900; line-height: 1.1; }
    .sandwich-tag { font-size: 8pt; font-weight: 700; color: #C9973A; margin-top: 1px; }
    .order-box { border: 2.5px solid #000; padding: 2px 8px; text-align: center; }
    .order-lbl { font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #444; }
    .order-num { font-size: 34pt; font-weight: 900; line-height: 1; }
    .dbl-meat-flag { font-size: 7pt; font-weight: 900; color: #8B1A2B; letter-spacing: 0.5px; margin-top: 1px; }
    .middle { border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 0.03in 0; flex: 1; display: flex; gap: 0.08in; }
    .mid-left { flex: 1; }
    .mid-right { flex: 1; }
    .section-lbl { font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 1px; }
    .item-line { font-size: 8pt; font-weight: 700; line-height: 1.2; }
    .mod-line { font-size: 7pt; line-height: 1.2; color: #333; }
    .bread-line { font-size: 7pt; color: #555; margin-bottom: 2px; }
    .notes-line { font-size: 7pt; font-style: italic; color: #444; margin-top: 2px; }
    .footer { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 0.08in; padding-top: 0.04in; align-items: end; }
    .footer-col .lbl { font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
    .footer-col .val { font-size: 9pt; font-weight: 600; margin-top: 1px; }
    .barcode-cell { text-align: right; }
    svg.barcode { height: 0.3in; }
  </style></head><body>
    ${pages}
    <script>
      window.onload = function() {
        ${barcodeCalls}
        var imgs = document.querySelectorAll('img');
        var loaded = 0;
        function tryPrint() { loaded++; if(loaded >= imgs.length) window.print(); }
        if(imgs.length === 0) { window.print(); return; }
        imgs.forEach(function(img) { if(img.complete) tryPrint(); else { img.onload = tryPrint; img.onerror = tryPrint; } });
      };
    <\/script>
  </body></html>`)
  win.document.close()
}

// ─── Shared UI components ────────────────────────────────────────────────────

const S = {
  screen: { position:'fixed', top:0, left:0, width:'100%', height:'100dvh', background:'var(--bg)', display:'grid', gridTemplateRows:'auto minmax(0,1fr) auto', overflow:'hidden' },
  header: { background:'var(--white)', borderBottom:'1px solid var(--gray-light)', padding:'calc(16px + env(safe-area-inset-top)) 20px 16px 20px', display:'flex', alignItems:'center', gap:12 },
  body: { minHeight:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', overscrollBehaviorY:'contain', transform:'translateZ(0)', WebkitTransform:'translateZ(0)', willChange:'scroll-position', padding:'20px', display:'flex', flexDirection:'column', gap:16 },
  footer: { background:'var(--white)', borderTop:'1px solid var(--gray-light)', padding:'16px 20px calc(16px + env(safe-area-inset-bottom)) 20px' },
  card: { background:'var(--white)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-sm)', overflow:'hidden', flexShrink:0 },
  sectionTitle: { fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, color:'var(--black)', marginBottom:4 },
  sectionSub: { fontSize:13, color:'var(--gray)', marginBottom:16 },
  chip: (active) => ({
    display:'inline-flex', alignItems:'center', padding:'10px 16px',
    borderRadius:50, border:`2px solid ${active ? 'var(--red)' : 'var(--gray-light)'}`,
    background: active ? 'var(--red)' : 'var(--white)',
    color: active ? 'var(--white)' : 'var(--black)',
    fontSize:14, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
  }),
  chipDisabled: {
    display:'inline-flex', alignItems:'center', padding:'10px 16px',
    borderRadius:50, border:'2px solid var(--gray-light)',
    background:'#f9f9f9', color:'var(--gray)', fontSize:14, fontWeight:600,
    cursor:'not-allowed', opacity:0.6,
  },
  primaryBtn: (disabled) => ({
    width:'100%', padding:'16px', borderRadius:'var(--radius)',
    background: disabled ? 'var(--gray-light)' : 'var(--red)',
    color: disabled ? 'var(--gray)' : 'var(--white)',
    fontSize:17, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer',
    transition:'background 0.15s',
  }),
  secondaryBtn: {
    width:'100%', padding:'16px', borderRadius:'var(--radius)',
    background:'var(--white)', color:'var(--red)',
    border:'2px solid var(--red)', fontSize:17, fontWeight:700,
  },
  backBtn: {
    width:40, height:40, borderRadius:20, background:'var(--gray-light)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:20, flexShrink:0,
  },
}

function ProgressBar({ step, total }) {
  return (
    <div style={{ display:'flex', gap:4, marginTop:8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex:1, height:3, borderRadius:2,
          background: i < step ? 'var(--red)' : 'var(--gray-light)',
          transition:'background 0.3s',
        }} />
      ))}
    </div>
  )
}

function ChipGrid({ children }) {
  return <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{children}</div>
}

function CategorySection({ title, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--gold)', marginBottom:8 }}>{title}</div>
      <ChipGrid>{children}</ChipGrid>
    </div>
  )
}

function SandwichSummaryRows({ order }) {
  const hero = order.bread ? isHeroBread(order.bread) : false
  const rows = []
  if (order.labelName) rows.push({ label: 'Label', value: `${order.labelName}'s Sandwich` })
  if (order.type === 'signature') {
    const sig = findSignature(order.signatureId)
    rows.push({ label: 'Signature', value: sig ? sig.name : 'Signature Sandwich', sub: sig ? fmtMoney(sig.price) : undefined })
    if (order.notes) rows.push({ label: 'Notes', value: order.notes })
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, color:'var(--gray)', minWidth:72 }}>{r.label}</div>
            <div style={{ flex:1, fontSize:14, fontWeight:500, textAlign:'right' }}>{r.value}</div>
            {r.sub && <div style={{ fontSize:14, fontWeight:700, color:'var(--red)', minWidth:44, textAlign:'right' }}>{r.sub}</div>}
          </div>
        ))}
      </div>
    )
  }
  if (order.bread) rows.push({ label: 'Bread', value: order.bread })
  if (order.proteins.length) rows.push({ label: 'Protein', value: order.proteins.join(', ') + (order.doubleMeat ? ' — Double Meat' : '') })
  if (order.cheeses.length) rows.push({ label: 'Cheese', value: order.cheeses.join(', '), sub: `${fmtMoney(order.cheeses.length * cheesePrices(order.bread))}` })
  if (order.paidToppings.length) {
    const pTotal = order.paidToppings.reduce((sum, t) => {
      const found = PAID_TOPPINGS.find(pt => pt.name === t)
      return sum + (found ? (hero ? found.hero : found.roll) : 0)
    }, 0)
    rows.push({ label: 'Add-ons', value: order.paidToppings.join(', '), sub: fmtMoney(pTotal) })
  }
  if (order.freeToppings.length) rows.push({ label: 'Toppings', value: order.freeToppings.join(', ') })
  if (order.dressings.length) rows.push({ label: 'Dressings', value: order.dressings.join(', ') })
  if (order.notes) rows.push({ label: 'Notes', value: order.notes })
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, color:'var(--gray)', minWidth:72 }}>{r.label}</div>
          <div style={{ flex:1, fontSize:14, fontWeight:500, textAlign:'right' }}>{r.value}</div>
          {r.sub && <div style={{ fontSize:14, fontWeight:700, color:'var(--red)', minWidth:44, textAlign:'right' }}>{r.sub}</div>}
        </div>
      ))}
    </div>
  )
}

function OrderSummaryCard({ cart, customer, orderNum, onEditSandwich, onRemoveSandwich, onDuplicateSandwich, onEditCustomer }) {
  const total = calcCartTotal(cart)
  return (
    <div style={{ ...S.card, padding:20, flexShrink:0 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:12, color:'var(--gray)', fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>Order</div>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:900, color:'var(--red)' }}>#{orderNum}</div>
        </div>
        {customer && (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:16, fontWeight:700 }}>{customer.firstName} {customer.lastName}</div>
            <div style={{ fontSize:13, color:'var(--gray)' }}>{customer.phone}</div>
            {onEditCustomer && (
              <button onClick={onEditCustomer} style={{ background:'none', border:'none', color:'var(--gray)', fontSize:12, textDecoration:'underline', cursor:'pointer', padding:0, marginTop:2 }}>
                Edit Info
              </button>
            )}
          </div>
        )}
      </div>
      {cart.map((order, i) => (
        <div key={i} style={{ borderTop:'1px solid var(--gray-light)', paddingTop:12, marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'var(--black)' }}>
              Sandwich {i + 1}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {onEditSandwich && (
                <button onClick={() => onEditSandwich(i)} style={{ background:'none', border:'none', color:'var(--gray)', fontSize:13, textDecoration:'underline', cursor:'pointer', padding:0 }}>
                  Edit
                </button>
              )}
              {onDuplicateSandwich && (
                <button onClick={() => onDuplicateSandwich(i)} style={{ background:'none', border:'none', color:'var(--gold)', fontSize:13, textDecoration:'underline', cursor:'pointer', padding:0 }}>
                  Duplicate
                </button>
              )}
              {onRemoveSandwich && cart.length > 1 && (
                <button onClick={() => onRemoveSandwich(i)} style={{ background:'none', border:'none', color:'var(--red)', fontSize:13, textDecoration:'underline', cursor:'pointer', padding:0 }}>
                  Remove
                </button>
              )}
            </div>
          </div>
          <SandwichSummaryRows order={order} />
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8, fontSize:13, fontWeight:700, color:'var(--gray-dark)' }}>
            {fmtMoney(calcTotal(order))}
          </div>
        </div>
      ))}
      <div style={{ borderTop:'2px solid var(--black)', marginTop:4, paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:14, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Total ({cart.length} {cart.length === 1 ? 'sandwich' : 'sandwiches'})</div>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:900 }}>{fmtMoney(total)}</div>
      </div>
    </div>
  )
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────

// 1. Home
function HomeScreen({ onBuildYourOwn, onPremade, kioskLocation, onOpenDeviceSettings }) {
  const tapRef = useRef({ count: 0, timer: null })
  const handleFooterTap = () => {
    const t = tapRef.current
    t.count += 1
    if (t.timer) clearTimeout(t.timer)
    t.timer = setTimeout(() => { t.count = 0 }, 1500)
    if (t.count >= 5) {
      t.count = 0
      onOpenDeviceSettings()
    }
  }
  return (
    <div style={{ ...S.screen, alignItems:'center', justifyContent:'center', background:'var(--white)' }}>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:32, padding:40, width:'100%', maxWidth:480 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <img src="/ib-script-logo.png" alt="Iavarone Bros." style={{ width:'85%', maxWidth:360, objectFit:'contain' }} onError={e => { e.target.style.display='none' }} />
          <div style={{ fontSize:14, color:'var(--gray)', fontWeight:500, textTransform:'uppercase', letterSpacing:2 }}>Sandwich Bar</div>
          {kioskLocation && (
            <div style={{ fontSize:12, color:'var(--gray)', background:'var(--bg)', padding:'4px 12px', borderRadius:20, marginTop:2 }}>
              📍 {kioskLocation}
            </div>
          )}
        </div>
        <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:14 }}>
          <button
            onClick={onBuildYourOwn}
            style={{ width:'100%', padding:'22px 24px', borderRadius:'var(--radius)', background:'var(--red)', color:'var(--white)', fontSize:19, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 8px 24px rgba(139,26,43,0.3)' }}
          >
            <span>Build Your Own</span>
            <span style={{ fontSize:22 }}>→</span>
          </button>
          <button
            onClick={onPremade}
            style={{ width:'100%', padding:'22px 24px', borderRadius:'var(--radius)', background:'var(--white)', color:'var(--gold)', fontSize:19, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'space-between', border:'2px solid var(--gold)', cursor:'pointer', boxShadow:'0 6px 18px rgba(201,151,58,0.18)' }}
          >
            <span>Signature Sandwiches</span>
            <span style={{ fontSize:22 }}>→</span>
          </button>
        </div>
        <div onClick={handleFooterTap} style={{ fontSize:12, color:'var(--gray-light)', textAlign:'center', padding:8 }}>Pay at the register · Please have your order number ready</div>
      </div>
    </div>
  )
}

// 1.25 Device Settings (hidden — reached by tapping the Home screen footer 5x)
function DeviceSettingsScreen({ onBack, onLocked, onUnlocked, kioskLocation }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const login = async () => {
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: username.trim(),
      password: password.trim(),
    })
    setBusy(false)
    if (error) {
      setErr(error.message === 'Invalid login credentials'
        ? 'Invalid admin email or password.'
        : `Login error: ${error.message}`)
      return
    }
    // Kiosk is a shared device — don't leave an admin session on it.
    await supabase.auth.signOut()
    setAuthed(true)
  }

  const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:12, border:'2px solid var(--gray-light)', fontSize:16, background:'var(--white)', color:'var(--black)' }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Device Settings</div>
        </div>
      </div>
      <div style={S.body}>
        {!authed ? (
          <>
            <div>
              <div style={S.sectionTitle}>Staff login required</div>
              <div style={S.sectionSub}>Enter an admin username and password to change this device's location lock.</div>
            </div>
            <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="Admin email" type="email" autoCapitalize="none" />
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Admin password" />
            {err && <div style={{ color:'#c62828', fontSize:13 }}>{err}</div>}
            <button style={S.primaryBtn(busy)} disabled={busy} onClick={login}>{busy ? 'Checking…' : 'Log In'}</button>
          </>
        ) : (
          <>
            <div>
              <div style={S.sectionTitle}>Lock this device</div>
              <div style={S.sectionSub}>
                {kioskLocation ? `Currently locked to ${kioskLocation}.` : 'Not currently locked — customers will see the location picker.'}
              </div>
            </div>
            {LOCATIONS.map(loc => (
              <button
                key={loc.id}
                onClick={() => onLocked(loc.name)}
                style={{ ...S.card, textAlign:'left', padding:16, border: kioskLocation === loc.name ? '2px solid var(--red)' : '2px solid var(--gray-light)', background:'var(--white)' }}
              >
                <span style={{ fontSize:16, fontWeight:700, color:'var(--black)' }}>{loc.name}</span>
                {kioskLocation === loc.name && <span style={{ marginLeft:8, fontSize:12, color:'var(--red)', fontWeight:700 }}>ACTIVE</span>}
              </button>
            ))}
            {kioskLocation && (
              <button style={{ ...S.secondaryBtn, marginTop:8 }} onClick={onUnlocked}>Clear Lock (show picker again)</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// 1.5 Location
function LocationScreen({ onBack, onNext }) {
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Choose Your Store</div>
        </div>
      </div>
      <div style={S.body}>
        <div>
          <div style={S.sectionTitle}>Which location?</div>
          <div style={S.sectionSub}>We'll have your order ready there</div>
        </div>
        {LOCATIONS.map(loc => (
          <button
            key={loc.id}
            onClick={() => onNext(loc.name)}
            style={{ ...S.card, textAlign:'left', padding:16, border:'2px solid var(--gray-light)', background:'var(--white)' }}
          >
            <span style={{ fontSize:16, fontWeight:700, color:'var(--black)' }}>{loc.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// 2. Customer Info
function CustomerInfoScreen({ onBack, onNext, initial, editMode }) {
  const [form, setForm] = useState(initial || emptyCustomer())
  const valid = form.firstName.trim() && form.lastName.trim() && form.phone.trim().replace(/\D/g,'').length >= 10
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:12, border:'2px solid var(--gray-light)', fontSize:16, background:'var(--white)', color:'var(--black)', transition:'border-color 0.15s' }
  const labelStyle = { fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--gray)', marginBottom:6, display:'block' }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>{editMode ? 'Edit Your Info' : 'Your Info'}</div>
          {!editMode && <ProgressBar step={1} total={6} />}
        </div>
      </div>
      <div style={S.body}>
        <div>
          <div style={S.sectionTitle}>Who's ordering?</div>
          <div style={S.sectionSub}>We'll call your name when it's ready</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={labelStyle}>First Name *</label>
            <input style={inputStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First" autoCapitalize="words" />
          </div>
          <div>
            <label style={labelStyle}>Last Name *</label>
            <input style={inputStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last" autoCapitalize="words" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Phone Number *</label>
          <input style={inputStyle} value={form.phone} onChange={e => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
            let fmt = raw
            if (raw.length >= 7) fmt = `(${raw.slice(0,3)}) ${raw.slice(3,6)}-${raw.slice(6)}`
            else if (raw.length >= 4) fmt = `(${raw.slice(0,3)}) ${raw.slice(3)}`
            else if (raw.length > 0) fmt = `(${raw}`
            set('phone', fmt)
          }} placeholder="(555) 555-5555" type="tel" />
        </div>
        <div>
          <label style={labelStyle}>Email <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
          <input style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" autoCapitalize="none" />
        </div>
        <label style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:12, border:'2px solid var(--gray-light)', cursor:'pointer' }}>
          <input type="checkbox" checked={!!form.smsOptIn} onChange={e => set('smsOptIn', e.target.checked)} style={{ width:20, height:20, marginTop:2, flexShrink:0 }} />
          <span style={{ fontSize:13, lineHeight:1.5 }}>
            <strong>Text me my order confirmation</strong> and occasional promos from Iavarone Bros.
            <span style={{ display:'block', color:'var(--gray)', fontWeight:400, marginTop:2 }}>Msg &amp; data rates may apply. Reply STOP to opt out anytime.</span>
          </span>
        </label>
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(!valid)} disabled={!valid} onClick={() => onNext(form)}>
          {editMode ? 'Save Info' : 'Continue to Bread →'}
        </button>
      </div>
    </div>
  )
}

// 3. Bread
function BreadScreen({ onBack, onNext, initial }) {
  const [selected, setSelected] = useState(initial || '')

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Choose Your Bread</div>
          <ProgressBar step={2} total={6} />
        </div>
      </div>
      <div style={S.body}>
        <CategorySection title="Rolls">
          {ROLL_BREADS.map(b => (
            <button key={b} style={S.chip(selected === b)} onClick={() => setSelected(b)}>{b}</button>
          ))}
        </CategorySection>
        <CategorySection title="Hero">
          {['Hero', 'Ciabatta', 'Sourdough', 'Focaccia'].map(b => (
            <button key={b} style={S.chip(selected === b)} onClick={() => setSelected(b)}>{b}</button>
          ))}
        </CategorySection>
        <CategorySection title="Wraps">
          {['Plain Wrap', 'Spinach Wrap', 'Tomato Wrap', 'WW Wrap', 'Lettuce Wrap'].map(b => (
            <button key={b} style={S.chip(selected === b)} onClick={() => setSelected(b)}>{b}</button>
          ))}
        </CategorySection>
        {selected && (
          <div className="fade-in" style={{ fontSize:13, color:'var(--gray)', fontStyle:'italic', textAlign:'center' }}>
            {isHeroBread(selected) ? 'Hero / wrap pricing applies' : 'Roll pricing applies'}
          </div>
        )}
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(!selected)} disabled={!selected} onClick={() => onNext(selected)}>
          Continue to Protein →
        </button>
      </div>
    </div>
  )
}

// 4. Protein
function ProteinScreen({ onBack, onNext, bread, initial, initialDoubleMeat }) {
  const [selected, setSelected] = useState(initial || [])
  const [doubleMeat, setDoubleMeat] = useState(!!initialDoubleMeat)
  const hero = isHeroBread(bread)
  const MAX = 4

  const toggle = (name) => {
    const p = PROTEINS.find(pr => pr.name === name)
    if (hero === false && p.roll === null) return // hero-only, can't pick on roll
    setSelected(s => s.includes(name) ? s.filter(x => x !== name) : s.length < MAX ? [...s, name] : s)
  }

  const basePrice = selected.length
    ? Math.max(...selected.map(name => {
        const p = PROTEINS.find(pr => pr.name === name)
        return p ? (hero ? p.hero : (p.roll || 0)) : 0
      }))
    : 0

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Choose Protein</div>
          <ProgressBar step={3} total={6} />
        </div>
        <div style={{ fontSize:13, color:'var(--gray)', fontWeight:600 }}>{selected.length}/{MAX}</div>
      </div>
      <div style={S.body}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div style={{ ...S.sectionSub, marginBottom:0 }}>Up to {MAX} proteins · {bread} · {hero ? 'Hero/Wrap' : 'Roll'} pricing</div>
          {!!selected.length && (
            <label className="fade-in" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:50, border:`2px solid ${doubleMeat ? 'var(--red)' : 'var(--gray-light)'}`, background: doubleMeat ? 'var(--red-light)' : 'var(--white)', cursor:'pointer' }}>
              <input type="checkbox" checked={doubleMeat} onChange={e => setDoubleMeat(e.target.checked)} style={{ width:18, height:18, flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:700 }}>Double Meat</span>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--red)' }}>+{fmtMoney(basePrice * 0.5)}</span>
            </label>
          )}
        </div>
        {PROTEIN_CATEGORIES.map(cat => (
          <CategorySection key={cat} title={cat}>
            {PROTEINS.filter(p => p.category === cat).map(p => {
              const unavail = !hero && p.roll === null
              const price = hero ? p.hero : (p.roll || p.hero)
              const active = selected.includes(p.name)
              const maxed = !active && selected.length >= MAX
              return (
                <button
                  key={p.name}
                  style={unavail || maxed ? S.chipDisabled : S.chip(active)}
                  onClick={() => !unavail && !maxed && toggle(p.name)}
                >
                  {p.name} <span style={{ marginLeft:6, opacity:0.75, fontWeight:400 }}>{fmtMoney(price)}</span>
                </button>
              )
            })}
          </CategorySection>
        ))}
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(!selected.length)} disabled={!selected.length} onClick={() => onNext(selected, doubleMeat)}>
          Continue to Cheese →
        </button>
      </div>
    </div>
  )
}

// 5. Cheese
function CheeseScreen({ onBack, onNext, bread, initial }) {
  const [selected, setSelected] = useState(initial || [])
  const MAX = 2
  const price = cheesePrices(bread)

  const toggle = (name) => {
    setSelected(s => s.includes(name) ? s.filter(x => x !== name) : s.length < MAX ? [...s, name] : s)
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Choose Cheese</div>
          <ProgressBar step={4} total={6} />
        </div>
        <div style={{ fontSize:13, color:'var(--gray)', fontWeight:600 }}>{selected.length}/{MAX}</div>
      </div>
      <div style={S.body}>
        <div style={S.sectionSub}>Up to {MAX} · {fmtMoney(price)} each</div>
        <ChipGrid>
          {CHEESES.map(c => {
            const active = selected.includes(c)
            const maxed = !active && selected.length >= MAX
            return (
              <button key={c} style={maxed ? S.chipDisabled : S.chip(active)} onClick={() => !maxed && toggle(c)}>
                {c}
              </button>
            )
          })}
        </ChipGrid>
      </div>
      <div style={S.footer}>
        <div style={{ display:'flex', gap:12 }}>
          <button style={{ ...S.secondaryBtn, flex:'0 0 auto', width:'auto', padding:'16px 24px' }} onClick={() => onNext([])}>
            Skip
          </button>
          <button style={{ ...S.primaryBtn(false), flex:1 }} onClick={() => onNext(selected)}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

// 6. Toppings & Dressings
function ToppingsScreen({ onBack, onNext, bread, initial }) {
  const hero = isHeroBread(bread)
  const [paidSelected, setPaidSelected] = useState(initial?.paid || [])
  const [freeSelected, setFreeSelected] = useState(initial?.free || [])
  const [dressSelected, setDressSelected] = useState(initial?.dressings || [])
  const FREE_MAX = 2
  const DRESS_MAX = 2

  const togglePaid = (name) => setPaidSelected(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name])
  const toggleFree = (name) => setFreeSelected(s => s.includes(name) ? s.filter(x => x !== name) : s.length < FREE_MAX ? [...s, name] : s)
  const toggleDress = (name) => setDressSelected(s => s.includes(name) ? s.filter(x => x !== name) : s.length < DRESS_MAX ? [...s, name] : s)

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Toppings & Dressings</div>
          <ProgressBar step={5} total={6} />
        </div>
      </div>
      <div style={S.body}>
        <CategorySection title={`Premium Add-ons (Upcharge · ${hero ? 'Hero' : 'Roll'} pricing)`}>
          {PAID_TOPPINGS.map(t => {
            const price = hero ? t.hero : t.roll
            const active = paidSelected.includes(t.name)
            return (
              <button key={t.name} style={S.chip(active)} onClick={() => togglePaid(t.name)}>
                {t.name} <span style={{ marginLeft:6, opacity:0.75, fontWeight:400 }}>+{fmtMoney(price)}</span>
              </button>
            )
          })}
        </CategorySection>
        <CategorySection title={`Free Toppings (Choose up to ${FREE_MAX})`}>
          {FREE_TOPPINGS.map(t => {
            const active = freeSelected.includes(t)
            const maxed = !active && freeSelected.length >= FREE_MAX
            return (
              <button key={t} style={maxed ? S.chipDisabled : S.chip(active)} onClick={() => !maxed && toggleFree(t)}>
                {t}
              </button>
            )
          })}
        </CategorySection>
        <CategorySection title={`Dressings (Choose up to ${DRESS_MAX})`}>
          {DRESSINGS.map(d => {
            const active = dressSelected.includes(d)
            const maxed = !active && dressSelected.length >= DRESS_MAX
            return (
              <button key={d} style={maxed ? S.chipDisabled : S.chip(active)} onClick={() => !maxed && toggleDress(d)}>
                {d}
              </button>
            )
          })}
        </CategorySection>
      </div>
      <div style={S.footer}>
        <div style={{ display:'flex', gap:12 }}>
          <button style={{ ...S.secondaryBtn, flex:'0 0 auto', width:'auto', padding:'16px 24px' }} onClick={() => onNext({ paid:[], free:[], dressings:[] })}>
            Skip All
          </button>
          <button style={{ ...S.primaryBtn(false), flex:1 }} onClick={() => onNext({ paid: paidSelected, free: freeSelected, dressings: dressSelected })}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

// 7. Notes
function NotesScreen({ onBack, onNext, initial, initialLabelName, cartCount, isEditing }) {
  const [notes, setNotes] = useState(initial || '')
  const [labelName, setLabelName] = useState(initialLabelName || '')
  const displayCount = isEditing ? cartCount : cartCount + 1
  const labelStyle = { fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--gray)', marginBottom:6, display:'block' }
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Special Requests</div>
          <ProgressBar step={6} total={6} />
        </div>
      </div>
      <div style={S.body}>
        <div>
          <div style={S.sectionTitle}>Anything else?</div>
          <div style={S.sectionSub}>Use this for prep instructions or special requests.</div>
          <div style={{ background:'var(--red-light)', borderRadius:12, padding:'12px 16px', marginTop:4, borderLeft:'3px solid var(--red)' }}>
            <div style={{ fontSize:13, color:'var(--gray-dark)', lineHeight:1.6 }}>
              <strong>Note:</strong> Any requests for additional proteins, cheese, or premium toppings added via this field are subject to upcharge at the register.
            </div>
          </div>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. extra mayo on the side, no onions, allergic to nuts..."
          style={{ width:'100%', minHeight:140, padding:'16px', borderRadius:'var(--radius)', border:'2px solid var(--gray-light)', fontSize:16, resize:'none', background:'var(--white)' }}
        />
        <div>
          <label style={labelStyle}>Name For This Sandwich <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional — prints on label)</span></label>
          <input
            value={labelName}
            onChange={e => setLabelName(e.target.value)}
            placeholder="e.g. Brian"
            style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:'2px solid var(--gray-light)', fontSize:16, background:'var(--white)', color:'var(--black)' }}
          />
          <div style={{ fontSize:12, color:'var(--gray)', marginTop:4 }}>Useful when ordering for a group.</div>
        </div>
      </div>
      <div style={S.footer}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', gap:12 }}>
            <button style={{ ...S.secondaryBtn, flex:'0 0 auto', width:'auto', padding:'16px 24px' }} onClick={() => onNext(notes, labelName, 'review')}>
              Skip
            </button>
            <button style={{ ...S.primaryBtn(false), flex:1 }} onClick={() => onNext(notes, labelName, 'review')}>
              {cartCount > 0 ? `Review Order (${displayCount}) →` : 'Review Order →'}
            </button>
          </div>
          <button
            style={{ background:'none', border:'2px solid var(--gray-light)', borderRadius:'var(--radius)', padding:'14px', fontSize:15, fontWeight:700, color:'var(--black)', cursor:'pointer' }}
            onClick={() => onNext(notes, labelName, 'addAnother')}
          >
            ➕ Add Another Sandwich
          </button>
        </div>
      </div>
    </div>
  )
}

// 7.5 Signature Sandwiches — menu (preset items, no modifiers yet)
function SignatureMenuScreen({ onBack, onSelect, cartCount }) {
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Signature Sandwiches</div>
          <div style={{ fontSize:12, color:'var(--gray)' }}>Chef-built favorites, ready to order{cartCount ? ` · ${cartCount} in your order` : ''}</div>
        </div>
      </div>
      <div style={S.body}>
        {SIGNATURE_CATEGORIES.map(cat => {
          const items = ACTIVE_SIGNATURES.filter(s => s.category === cat)
          if (!items.length) return null
          return (
            <div key={cat} style={{ flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--gold)', marginBottom:10 }}>{cat}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:8 }}>
                {items.map(sig => (
                  <button key={sig.id} onClick={() => onSelect(sig)} style={{ ...S.card, display:'flex', alignItems:'stretch', gap:0, textAlign:'left', padding:0, cursor:'pointer', border:'1px solid var(--gray-light)' }}>
                    <div style={{ width:92, minHeight:92, flexShrink:0, background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                      {sig.photo
                        ? <img src={sig.photo} alt={sig.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none' }} />
                        : <img src="/app-icon.png" alt="" style={{ width:44, height:44, opacity:0.35 }} onError={e => { e.target.style.display='none' }} />}
                    </div>
                    <div style={{ flex:1, padding:'12px 14px', display:'flex', flexDirection:'column', gap:4, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
                        <span style={{ fontSize:15, fontWeight:800, color:'var(--black)' }}>{sig.name}</span>
                        <span style={{ fontSize:15, fontWeight:800, color:'var(--red)', flexShrink:0 }}>{fmtMoney(sig.price)}</span>
                      </div>
                      <div style={{ fontSize:12.5, color:'var(--gray)', lineHeight:1.45 }}>{sig.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 7.6 Signature Sandwich — detail + special requests
function SignatureDetailScreen({ sig, onBack, onCommit, initialNotes, initialLabelName, cartCount, isEditing }) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [labelName, setLabelName] = useState(initialLabelName || '')
  const displayCount = isEditing ? cartCount : cartCount + 1
  const labelStyle = { fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--gray)', marginBottom:6, display:'block' }
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>{sig.name}</div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--red)' }}>{fmtMoney(sig.price)}</div>
        </div>
      </div>
      <div style={S.body}>
        {sig.photo && (
          <div style={{ ...S.card, height:180, flexShrink:0 }}>
            <img src={sig.photo} alt={sig.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.parentElement.style.display='none' }} />
          </div>
        )}
        <div style={{ ...S.card, padding:16 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--gold)', marginBottom:6 }}>What's On It</div>
          <div style={{ fontSize:14, lineHeight:1.6, color:'var(--gray-dark)' }}>{sig.description}</div>
        </div>
        <div style={{ background:'var(--red-light)', borderRadius:12, padding:'12px 16px', borderLeft:'3px solid var(--red)' }}>
          <div style={{ fontSize:13, color:'var(--gray-dark)', lineHeight:1.6 }}>
            <strong>Note:</strong> Signature sandwiches are made as described. Requests for changes or additions via the field below are subject to upcharge at the register.
          </div>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Special requests — e.g. no onions, dressing on the side, allergic to nuts..."
          style={{ width:'100%', minHeight:100, padding:'16px', borderRadius:'var(--radius)', border:'2px solid var(--gray-light)', fontSize:16, resize:'none', background:'var(--white)' }}
        />
        <div>
          <label style={labelStyle}>Name For This Sandwich <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional — prints on label)</span></label>
          <input
            value={labelName}
            onChange={e => setLabelName(e.target.value)}
            placeholder="e.g. Brian"
            style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:'2px solid var(--gray-light)', fontSize:16, background:'var(--white)', color:'var(--black)' }}
          />
          <div style={{ fontSize:12, color:'var(--gray)', marginTop:4 }}>Useful when ordering for a group.</div>
        </div>
      </div>
      <div style={S.footer}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button style={S.primaryBtn(false)} onClick={() => onCommit(notes, labelName, 'review')}>
            {isEditing ? 'Save Changes →' : cartCount > 0 ? `Add & Review Order (${displayCount}) →` : `Add to Order · ${fmtMoney(sig.price)} →`}
          </button>
          {!isEditing && (
            <button
              style={{ background:'none', border:'2px solid var(--gray-light)', borderRadius:'var(--radius)', padding:'14px', fontSize:15, fontWeight:700, color:'var(--black)', cursor:'pointer' }}
              onClick={() => onCommit(notes, labelName, 'addAnother')}
            >
              ➕ Add & Choose Another Sandwich
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// 7.7 Add Another — choose build-your-own or signature
function AddTypeScreen({ onBack, onByo, onSignature }) {
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Add Another Sandwich</div>
      </div>
      <div style={{ ...S.body, justifyContent:'center' }}>
        <button
          onClick={onByo}
          style={{ width:'100%', padding:'22px 24px', borderRadius:'var(--radius)', background:'var(--red)', color:'var(--white)', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}
        >
          <span>Build Your Own</span>
          <span style={{ fontSize:22 }}>→</span>
        </button>
        <button
          onClick={onSignature}
          style={{ width:'100%', padding:'22px 24px', borderRadius:'var(--radius)', background:'var(--white)', color:'var(--gold)', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'space-between', border:'2px solid var(--gold)', flexShrink:0 }}
        >
          <span>Signature Sandwiches</span>
          <span style={{ fontSize:22 }}>→</span>
        </button>
      </div>
    </div>
  )
}

// 8. Review & Confirm
function ReviewScreen({ onBack, onConfirm, onAddAnother, onEditSandwich, onRemoveSandwich, onDuplicateSandwich, onEditCustomer, cart, customer, orderNum, saving }) {
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Review Order</div>
      </div>
      <div style={S.body}>
        <OrderSummaryCard cart={cart} customer={customer} orderNum={orderNum} onEditSandwich={onEditSandwich} onRemoveSandwich={onRemoveSandwich} onDuplicateSandwich={onDuplicateSandwich} onEditCustomer={onEditCustomer} />
        <button
          onClick={onAddAnother}
          style={{ background:'none', border:'2px solid var(--gray-light)', borderRadius:'var(--radius)', padding:'14px', fontSize:15, fontWeight:700, color:'var(--black)', cursor:'pointer' }}
        >
          ➕ Add Another Sandwich
        </button>
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(saving)} disabled={saving} onClick={onConfirm}>
          {saving ? 'Placing Order...' : `Confirm Order · ${fmtMoney(calcCartTotal(cart))}`}
        </button>
      </div>
    </div>
  )
}

// 9. Confirmation
function ConfirmationScreen({ cart, customer, orderNum, onNewOrder, onDuplicate }) {
  const total = calcCartTotal(cart)
  return (
    <div style={S.screen}>
      <div style={{ ...S.body, justifyContent:'center', alignItems:'center', gap:24 }}>
        <div className="fade-up" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <div style={{ width:72, height:72, borderRadius:36, background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>✓</div>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:900, textAlign:'center' }}>Order Placed!</div>
          <div style={{ fontSize:15, color:'var(--gray)', textAlign:'center' }}>Please pay at the register and have your order number ready</div>
        </div>
        <div className="fade-up" style={{ ...S.card, padding:'20px 32px', textAlign:'center', width:'100%', maxWidth:320, animationDelay:'0.1s' }}>
          <div style={{ fontSize:13, color:'var(--gray)', fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>Order Number</div>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:64, fontWeight:900, color:'var(--red)', lineHeight:1 }}>#{orderNum}</div>
          <div style={{ fontSize:16, fontWeight:700, marginTop:4 }}>{customer.firstName} {customer.lastName}</div>
          <div style={{ fontSize:13, color:'var(--gray)', marginTop:6 }}>{cart.length} {cart.length === 1 ? 'sandwich' : 'sandwiches'} · {fmtMoney(total)}</div>
        </div>
        <div className="fade-up" style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', gap:12, animationDelay:'0.2s' }}>
          <button
            onClick={() => { printLabels(orderNum, customer, cart) }}
            style={{ ...S.secondaryBtn }}
          >
            {cart.length > 1 ? `Print Labels (${cart.length})` : 'Print Label'}
          </button>
          <button
            onClick={onDuplicate}
            style={{ width:'100%', padding:'16px', borderRadius:'var(--radius)', background:'var(--gold)', color:'var(--white)', fontSize:17, fontWeight:700, border:'none' }}
          >
            📋 Duplicate This Order
          </button>
          <button onClick={onNewOrder} style={S.primaryBtn(false)}>
            New Order
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const STEPS = ['home', 'customer', 'bread', 'protein', 'cheese', 'toppings', 'notes', 'review', 'confirm']

export default function App() {
  const [screen, setScreen] = useState('home')
  const [customer, setCustomer] = useState(emptyCustomer())
  const [order, setOrder] = useState(emptyOrder())   // sandwich currently being built/edited
  const [cart, setCart] = useState([])               // sandwiches already added in this order
  const [editingIndex, setEditingIndex] = useState(null) // index in cart being edited, or null if building a new one
  const [buildMode, setBuildMode] = useState('byo')       // 'byo' | 'signature' — what flow starts after customer info
  const [selectedSig, setSelectedSig] = useState(null)    // signature item currently being viewed/edited
  const [orderNum, setOrderNum] = useState('')
  const [cartId, setCartId] = useState('')
  const [saving, setSaving] = useState(false)
  const [location, setLocation] = useState('')                 // location for the order currently being built
  const [kioskLocation, setKioskLocation] = useState(() => {    // non-empty = this device is locked to one store
    try { return localStorage.getItem(KIOSK_LOCATION_KEY) || '' } catch { return '' }
  })

  // One-time kiosk setup via URL: visit once with ?lockLocation=Maspeth to pin this
  // device, or ?unlockLocation=1 to clear it. Then add the plain URL to the Home Screen.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const lockParam = params.get('lockLocation')
    const unlockParam = params.get('unlockLocation')
    if (lockParam) {
      const loc = findLocation(lockParam)
      if (loc) {
        try { localStorage.setItem(KIOSK_LOCATION_KEY, loc.name) } catch {}
        setKioskLocation(loc.name)
      }
      window.history.replaceState({}, '', window.location.pathname)
    } else if (unlockParam) {
      try { localStorage.removeItem(KIOSK_LOCATION_KEY) } catch {}
      setKioskLocation('')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const startNew = useCallback((prefill = null) => {
    setCart(prefill ? [prefill] : [])
    setOrder(emptyOrder())
    setEditingIndex(null)
    setCustomer(emptyCustomer())
    setOrderNum(genOrderNum())
    setCartId(genCartId())
    setLocation(kioskLocation || '')
    setScreen('customer')
  }, [kioskLocation])

  const startDuplicate = useCallback(() => {
    // Keep same sandwiches (and same location — same kiosk/counter), reset customer, generate new order number + cart id
    setCustomer(emptyCustomer())
    setOrderNum(genOrderNum())
    setCartId(genCartId())
    setScreen('customer')
  }, [])

  // Commit the sandwich currently in `order` into the cart (either appended or replacing editingIndex)
  const commitSandwichToCart = useCallback((finalOrder) => {
    setCart(c => {
      if (editingIndex !== null) {
        const copy = [...c]
        copy[editingIndex] = finalOrder
        return copy
      }
      return [...c, finalOrder]
    })
    setEditingIndex(null)
  }, [editingIndex])

  const saveOrder = async () => {
    setSaving(true)
    try {
      const rows = cart.map((sw, i) => ({
        order_number: orderNum,
        cart_id: cartId,
        item_index: i,
        item_count: cart.length,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        email: customer.email || null,
        item_type: sw.type || 'byo',
        signature_id: sw.type === 'signature' ? sw.signatureId : null,
        signature_name: sw.type === 'signature' ? (findSignature(sw.signatureId)?.name || null) : null,
        signature_upc: sw.type === 'signature' ? (findSignature(sw.signatureId)?.upc || null) : null,
        bread: sw.type === 'signature' ? null : sw.bread,
        proteins: sw.proteins,
        cheeses: sw.cheeses,
        paid_toppings: sw.paidToppings,
        free_toppings: sw.freeToppings,
        dressings: sw.dressings,
        notes: sw.notes || null,
        double_meat: !!sw.doubleMeat,
        label_name: sw.labelName || null,
        sms_opt_in: !!customer.smsOptIn,
        location: location || null,
        total: calcTotal(sw),
      }))
      const { error } = await supabase.from('sandwich_orders').insert(rows)
      if (error) console.error('Supabase insert error:', error)
      else sendOrderSMS(orderNum, customer, cart)
    } catch (e) {
      console.error('Supabase save error', e)
    }
    setSaving(false)
    setScreen('confirm')
  }

  // Initialize order number / cart id on mount
  React.useEffect(() => { setOrderNum(genOrderNum()); setCartId(genCartId()) }, [])

  if (screen === 'home') return (
    <HomeScreen
      kioskLocation={kioskLocation}
      onBuildYourOwn={() => {
        setBuildMode('byo')
        setLocation(kioskLocation || '')
        setScreen(kioskLocation ? 'customer' : 'location')
      }}
      onPremade={() => {
        setBuildMode('signature')
        setLocation(kioskLocation || '')
        setScreen(kioskLocation ? 'customer' : 'location')
      }}
      onOpenDeviceSettings={() => setScreen('deviceSettings')}
    />
  )

  if (screen === 'deviceSettings') return (
    <DeviceSettingsScreen
      kioskLocation={kioskLocation}
      onBack={() => setScreen('home')}
      onLocked={(locName) => {
        try { localStorage.setItem(KIOSK_LOCATION_KEY, locName) } catch {}
        setKioskLocation(locName)
      }}
      onUnlocked={() => {
        try { localStorage.removeItem(KIOSK_LOCATION_KEY) } catch {}
        setKioskLocation('')
      }}
    />
  )

  if (screen === 'location') return (
    <LocationScreen
      onBack={() => setScreen('home')}
      onNext={(locName) => { setLocation(locName); setScreen('customer') }}
    />
  )

  if (screen === 'customer') return (
    <CustomerInfoScreen
      initial={customer}
      onBack={() => setScreen(kioskLocation ? 'home' : 'location')}
      onNext={(c) => { setCustomer(c); setScreen(buildMode === 'signature' ? 'sigMenu' : 'bread') }}
    />
  )

  if (screen === 'sigMenu') return (
    <SignatureMenuScreen
      cartCount={cart.length}
      onBack={() => setScreen(cart.length ? 'review' : 'customer')}
      onSelect={(sig) => {
        setSelectedSig(sig)
        setOrder(o => (editingIndex !== null && o.type === 'signature')
          ? { ...o, signatureId: sig.id }          // editing: swap the item, keep notes/label name
          : signatureOrder(sig))
        setScreen('sigDetail')
      }}
    />
  )

  if (screen === 'sigDetail' && selectedSig) return (
    <SignatureDetailScreen
      sig={selectedSig}
      cartCount={cart.length}
      isEditing={editingIndex !== null}
      initialNotes={order.notes}
      initialLabelName={order.labelName}
      onBack={() => setScreen('sigMenu')}
      onCommit={(n, labelName, action) => {
        const finalOrder = { ...order, notes: n, labelName }
        commitSandwichToCart(finalOrder)
        setOrder(emptyOrder())
        setSelectedSig(null)
        setScreen(action === 'addAnother' ? 'addType' : 'review')
      }}
    />
  )

  if (screen === 'addType') return (
    <AddTypeScreen
      onBack={() => setScreen('review')}
      onByo={() => { setOrder(emptyOrder()); setEditingIndex(null); setScreen('bread') }}
      onSignature={() => { setOrder(emptyOrder()); setEditingIndex(null); setScreen('sigMenu') }}
    />
  )

  if (screen === 'bread') return (
    <BreadScreen
      initial={order.bread}
      onBack={() => setScreen(cart.length ? 'review' : 'customer')}
      onNext={(b) => { setOrder(o => ({ ...o, bread: b, proteins: o.bread === b ? o.proteins : [], cheeses: o.bread === b ? o.cheeses : [] })); setScreen('protein') }}
    />
  )

  if (screen === 'protein') return (
    <ProteinScreen
      bread={order.bread}
      initial={order.proteins}
      initialDoubleMeat={order.doubleMeat}
      onBack={() => setScreen('bread')}
      onNext={(p, dm) => { setOrder(o => ({ ...o, proteins: p, doubleMeat: dm })); setScreen('cheese') }}
    />
  )

  if (screen === 'cheese') return (
    <CheeseScreen
      bread={order.bread}
      initial={order.cheeses}
      onBack={() => setScreen('protein')}
      onNext={(c) => { setOrder(o => ({ ...o, cheeses: c })); setScreen('toppings') }}
    />
  )

  if (screen === 'toppings') return (
    <ToppingsScreen
      bread={order.bread}
      initial={{ paid: order.paidToppings, free: order.freeToppings, dressings: order.dressings }}
      onBack={() => setScreen('cheese')}
      onNext={(t) => { setOrder(o => ({ ...o, paidToppings: t.paid, freeToppings: t.free, dressings: t.dressings })); setScreen('notes') }}
    />
  )

  if (screen === 'notes') return (
    <NotesScreen
      initial={order.notes}
      initialLabelName={order.labelName}
      cartCount={cart.length}
      isEditing={editingIndex !== null}
      onBack={() => setScreen('toppings')}
      onNext={(n, labelName, action) => {
        const finalOrder = { ...order, notes: n, labelName }
        commitSandwichToCart(finalOrder)
        setOrder(emptyOrder())
        if (action === 'addAnother') {
          setScreen('addType')
        } else {
          setScreen('review')
        }
      }}
    />
  )

  if (screen === 'review') return (
    <ReviewScreen
      cart={cart}
      customer={customer}
      orderNum={orderNum}
      saving={saving}
      onBack={() => {
        const lastIdx = cart.length - 1
        if (lastIdx >= 0) {
          const last = cart[lastIdx]
          setOrder(last)
          setEditingIndex(lastIdx)
          if (last.type === 'signature') {
            setSelectedSig(findSignature(last.signatureId) || null)
            setScreen('sigDetail')
          } else {
            setScreen('notes')
          }
        } else {
          setScreen('customer')
        }
      }}
      onAddAnother={() => { setOrder(emptyOrder()); setEditingIndex(null); setScreen('addType') }}
      onEditSandwich={(i) => {
        const sw = cart[i]
        setOrder(sw)
        setEditingIndex(i)
        if (sw.type === 'signature') {
          setSelectedSig(findSignature(sw.signatureId) || null)
          setScreen('sigDetail')
        } else {
          setScreen('bread')
        }
      }}
      onRemoveSandwich={(i) => setCart(c => c.filter((_, idx) => idx !== i))}
      onDuplicateSandwich={(i) => setCart(c => {
        const copy = [...c]
        copy.splice(i + 1, 0, { ...c[i] })
        return copy
      })}
      onEditCustomer={() => setScreen('editCustomer')}
      onConfirm={saveOrder}
    />
  )

  if (screen === 'editCustomer') return (
    <CustomerInfoScreen
      editMode
      initial={customer}
      onBack={() => setScreen('review')}
      onNext={(c) => { setCustomer(c); setScreen('review') }}
    />
  )

  if (screen === 'confirm') return (
    <ConfirmationScreen
      cart={cart}
      customer={customer}
      orderNum={orderNum}
      onNewOrder={() => { setCart([]); setOrder(emptyOrder()); setEditingIndex(null); setLocation(kioskLocation || ''); setScreen('home') }}
      onDuplicate={startDuplicate}
    />
  )
}
