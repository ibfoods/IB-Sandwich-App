import React, { useState, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import {
  ALL_BREADS, ROLL_BREADS, isHeroBread,
  PROTEINS, PROTEIN_CATEGORIES,
  CHEESES, cheesePrices,
  PAID_TOPPINGS, FREE_TOPPINGS, DRESSINGS,
} from './lib/menu.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

const LOGO_URL = '/logo.jpg'

function genOrderNum() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

function calcTotal(order) {
  if (!order.bread) return 0
  const hero = isHeroBread(order.bread)
  let total = 0
  order.proteins.forEach(p => {
    const found = PROTEINS.find(pr => pr.name === p)
    if (found) total += hero ? (found.hero || 0) : (found.roll || 0)
  })
  const cp = hero ? 2.00 : 1.50
  total += order.cheeses.length * cp
  order.paidToppings.forEach(t => {
    const found = PAID_TOPPINGS.find(pt => pt.name === t)
    if (found) total += hero ? found.hero : found.roll
  })
  return total
}

function fmtMoney(n) { return `$${n.toFixed(2)}` }

function emptyOrder() {
  return {
    bread: '',
    proteins: [],
    cheeses: [],
    paidToppings: [],
    freeToppings: [],
    dressings: [],
    notes: '',
  }
}

function emptyCustomer() {
  return { firstName: '', lastName: '', phone: '', email: '' }
}

// ─── Print label ─────────────────────────────────────────────────────────────

function printLabel(orderNum, customer, order) {
  const hero = order.bread ? isHeroBread(order.bread) : false
  const total = calcTotal(order)
  const proteinLines = order.proteins.map(p => `<div class="item-line">${p}</div>`).join('')
  const cheeseLines = order.cheeses.map(c => `<div class="item-line">${c}</div>`).join('')
  const toppingLines = [...order.paidToppings, ...order.freeToppings].map(t => `<div class="mod-line">${t}</div>`).join('')
  const dressingLines = order.dressings.map(d => `<div class="mod-line">${d}</div>`).join('')
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head><title>Order #${orderNum}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    @page { size: 4.25in 2.75in landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; width: 4.25in; height: 2.75in; padding: 0.1in 0.13in; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .logo { width: 0.48in; height: 0.48in; object-fit: contain; }
    .logo-area { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
    .website { font-size: 5.5pt; color: #666; }
    .customer-block { flex: 1; text-align: center; padding: 0 0.1in; }
    .cust-lbl { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; }
    .cust-name { font-size: 15pt; font-weight: 900; line-height: 1.1; }
    .order-box { border: 2.5px solid #000; padding: 2px 8px; text-align: center; }
    .order-lbl { font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #444; }
    .order-num { font-size: 34pt; font-weight: 900; line-height: 1; }
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
    <div class="top">
      <div class="logo-area">
        <img src="${window.location.origin}${LOGO_URL}" class="logo" onerror="this.style.display='none'" />
        <span class="website">ibfoods.com</span>
      </div>
      <div class="customer-block">
        <div class="cust-lbl">Customer</div>
        <div class="cust-name">${customer.firstName} ${customer.lastName}</div>
      </div>
      <div class="order-box">
        <div class="order-lbl">Order</div>
        <div class="order-num">${orderNum}</div>
      </div>
    </div>
    <div class="middle">
      <div class="mid-left">
        <div class="section-lbl">Item</div>
        <div class="bread-line">${order.bread}</div>
        ${proteinLines}
        ${cheeseLines}
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
        <svg class="barcode" id="bc"></svg>
      </div>
    </div>
    <script>
      window.onload = function() {
        try {
          JsBarcode("#bc", "${orderNum.padStart(12,'0')}", { format:"UPC", width:1.2, height:30, displayValue:false, margin:0 });
        } catch(e) {}
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
  screen: { position:'fixed', inset:0, background:'var(--bg)', display:'flex', flexDirection:'column', overflow:'hidden' },
  header: { background:'var(--white)', borderBottom:'1px solid var(--gray-light)', padding:'16px 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0 },
  body: { flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:16 },
  footer: { background:'var(--white)', borderTop:'1px solid var(--gray-light)', padding:'16px 20px', flexShrink:0 },
  card: { background:'var(--white)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-sm)', overflow:'hidden' },
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

function OrderSummaryCard({ order, customer, orderNum }) {
  const hero = order.bread ? isHeroBread(order.bread) : false
  const total = calcTotal(order)
  const rows = []
  if (order.bread) rows.push({ label: 'Bread', value: order.bread })
  if (order.proteins.length) rows.push({ label: 'Protein', value: order.proteins.join(', ') })
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
    <div style={{ ...S.card, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:12, color:'var(--gray)', fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>Order</div>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:900, color:'var(--red)' }}>#{orderNum}</div>
        </div>
        {customer && (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:16, fontWeight:700 }}>{customer.firstName} {customer.lastName}</div>
            <div style={{ fontSize:13, color:'var(--gray)' }}>{customer.phone}</div>
          </div>
        )}
      </div>
      <div style={{ borderTop:'1px solid var(--gray-light)', paddingTop:12, display:'flex', flexDirection:'column', gap:10 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, color:'var(--gray)', minWidth:72 }}>{r.label}</div>
            <div style={{ flex:1, fontSize:14, fontWeight:500, textAlign:'right' }}>{r.value}</div>
            {r.sub && <div style={{ fontSize:14, fontWeight:700, color:'var(--red)', minWidth:44, textAlign:'right' }}>{r.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ borderTop:'2px solid var(--black)', marginTop:12, paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:14, fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Total</div>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:900 }}>{fmtMoney(total)}</div>
      </div>
    </div>
  )
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────

// 1. Home
function HomeScreen({ onBuildYourOwn, onPremade }) {
  return (
    <div style={{ ...S.screen, alignItems:'center', justifyContent:'center', background:'var(--white)' }}>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:32, padding:40, width:'100%', maxWidth:480 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <img src={LOGO_URL} alt="IB" style={{ width:120, height:120, objectFit:'contain' }} onError={e => { e.target.style.display='none' }} />
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:900, color:'var(--black)', textAlign:'center', lineHeight:1.2 }}>
            Iavarone Bros.
          </div>
          <div style={{ fontSize:14, color:'var(--gray)', fontWeight:500, textTransform:'uppercase', letterSpacing:2 }}>Sandwich Bar</div>
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
            style={{ width:'100%', padding:'22px 24px', borderRadius:'var(--radius)', background:'var(--bg)', color:'var(--gray)', fontSize:19, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'space-between', border:'2px solid var(--gray-light)', cursor:'not-allowed' }}
          >
            <span>Signature Sandwiches</span>
            <span style={{ fontSize:13, fontWeight:500 }}>Coming Soon</span>
          </button>
        </div>
        <div style={{ fontSize:12, color:'var(--gray-light)', textAlign:'center' }}>Pay at the register · Please have your order number ready</div>
      </div>
    </div>
  )
}

// 2. Customer Info
function CustomerInfoScreen({ onBack, onNext, initial }) {
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
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Your Info</div>
          <ProgressBar step={1} total={6} />
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
          <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" type="tel" />
        </div>
        <div>
          <label style={labelStyle}>Email <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
          <input style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" type="email" autoCapitalize="none" />
        </div>
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(!valid)} disabled={!valid} onClick={() => onNext(form)}>
          Continue to Bread →
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
        <CategorySection title="Hero & Wraps">
          {['Hero', 'Plain Wrap', 'Spinach Wrap', 'Tomato Wrap', 'WW Wrap', 'Ciabatta', 'Sourdough', 'Focaccia', 'Lettuce Wrap'].map(b => (
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
function ProteinScreen({ onBack, onNext, bread, initial }) {
  const [selected, setSelected] = useState(initial || [])
  const hero = isHeroBread(bread)
  const MAX = 4

  const toggle = (name) => {
    const p = PROTEINS.find(pr => pr.name === name)
    if (hero === false && p.roll === null) return // hero-only, can't pick on roll
    setSelected(s => s.includes(name) ? s.filter(x => x !== name) : s.length < MAX ? [...s, name] : s)
  }

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
        <div style={S.sectionSub}>Up to {MAX} proteins · {bread} · {hero ? 'Hero/Wrap' : 'Roll'} pricing</div>
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
        <button style={S.primaryBtn(!selected.length)} disabled={!selected.length} onClick={() => onNext(selected)}>
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
function NotesScreen({ onBack, onNext, initial }) {
  const [notes, setNotes] = useState(initial || '')
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
          <div style={S.sectionSub}>Extra dressings, allergies, or special instructions</div>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. extra mayo on the side, no onions, allergic to nuts..."
          style={{ width:'100%', minHeight:140, padding:'16px', borderRadius:'var(--radius)', border:'2px solid var(--gray-light)', fontSize:16, resize:'none', background:'var(--white)' }}
        />
      </div>
      <div style={S.footer}>
        <div style={{ display:'flex', gap:12 }}>
          <button style={{ ...S.secondaryBtn, flex:'0 0 auto', width:'auto', padding:'16px 24px' }} onClick={() => onNext('')}>
            Skip
          </button>
          <button style={{ ...S.primaryBtn(false), flex:1 }} onClick={() => onNext(notes)}>
            Review Order →
          </button>
        </div>
      </div>
    </div>
  )
}

// 8. Review & Confirm
function ReviewScreen({ onBack, onConfirm, onEdit, order, customer, orderNum, saving }) {
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Review Order</div>
      </div>
      <div style={S.body}>
        <OrderSummaryCard order={order} customer={customer} orderNum={orderNum} />
        <button
          onClick={onEdit}
          style={{ background:'none', border:'none', color:'var(--gray)', fontSize:14, textDecoration:'underline', textAlign:'center', padding:8 }}
        >
          Edit order
        </button>
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(saving)} disabled={saving} onClick={onConfirm}>
          {saving ? 'Placing Order...' : `Confirm Order · ${fmtMoney(calcTotal(order))}`}
        </button>
      </div>
    </div>
  )
}

// 9. Confirmation
function ConfirmationScreen({ order, customer, orderNum, onNewOrder, onDuplicate }) {
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
        </div>
        <div className="fade-up" style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', gap:12, animationDelay:'0.2s' }}>
          <button
            onClick={() => { printLabel(orderNum, customer, order) }}
            style={{ ...S.secondaryBtn }}
          >
            Print Label
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
  const [order, setOrder] = useState(emptyOrder())
  const [orderNum, setOrderNum] = useState('')
  const [saving, setSaving] = useState(false)

  const startNew = useCallback((prefill = null) => {
    setOrder(prefill || emptyOrder())
    setCustomer(emptyCustomer())
    setOrderNum(genOrderNum())
    setScreen('customer')
  }, [])

  const startDuplicate = useCallback(() => {
    // Keep same order, reset customer, generate new order number
    setCustomer(emptyCustomer())
    setOrderNum(genOrderNum())
    setScreen('customer')
  }, [])

  const saveOrder = async () => {
    setSaving(true)
    try {
      await supabase.from('sandwich_orders').insert([{
        order_number: orderNum,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        email: customer.email || null,
        bread: order.bread,
        proteins: order.proteins,
        cheeses: order.cheeses,
        paid_toppings: order.paidToppings,
        free_toppings: order.freeToppings,
        dressings: order.dressings,
        notes: order.notes || null,
        total: calcTotal(order),
      }])
    } catch (e) {
      console.error('Supabase save error', e)
    }
    setSaving(false)
    setScreen('confirm')
  }

  // Initialize order number on mount
  React.useEffect(() => { setOrderNum(genOrderNum()) }, [])

  if (screen === 'home') return <HomeScreen onBuildYourOwn={() => setScreen('customer')} onPremade={() => {}} />

  if (screen === 'customer') return (
    <CustomerInfoScreen
      initial={customer}
      onBack={() => setScreen('home')}
      onNext={(c) => { setCustomer(c); setScreen('bread') }}
    />
  )

  if (screen === 'bread') return (
    <BreadScreen
      initial={order.bread}
      onBack={() => setScreen('customer')}
      onNext={(b) => { setOrder(o => ({ ...o, bread: b, proteins: [], cheeses: [] })); setScreen('protein') }}
    />
  )

  if (screen === 'protein') return (
    <ProteinScreen
      bread={order.bread}
      initial={order.proteins}
      onBack={() => setScreen('bread')}
      onNext={(p) => { setOrder(o => ({ ...o, proteins: p })); setScreen('cheese') }}
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
      onBack={() => setScreen('toppings')}
      onNext={(n) => { setOrder(o => ({ ...o, notes: n })); setScreen('review') }}
    />
  )

  if (screen === 'review') return (
    <ReviewScreen
      order={order}
      customer={customer}
      orderNum={orderNum}
      saving={saving}
      onBack={() => setScreen('notes')}
      onEdit={() => setScreen('bread')}
      onConfirm={saveOrder}
    />
  )

  if (screen === 'confirm') return (
    <ConfirmationScreen
      order={order}
      customer={customer}
      orderNum={orderNum}
      onNewOrder={() => { setOrder(emptyOrder()); setScreen('home') }}
      onDuplicate={startDuplicate}
    />
  )
}
