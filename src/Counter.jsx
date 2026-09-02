import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import {
  ALL_BREADS, ROLL_BREADS, isHeroBread,
  PROTEINS, PROTEIN_CATEGORIES,
  CHEESES,
  PAID_TOPPINGS, FREE_TOPPINGS, DRESSINGS,
} from './lib/menu.js'
import { LOCATIONS } from './lib/locations.js'
import { ACTIVE_SIGNATURES, SIGNATURE_CATEGORIES, findSignature } from './lib/signatures.js'
import { calcTotal, fmtMoney, printLabels, buildCartZpl } from './lib/labels.js'

const COUNTER_LOCATION_KEY = 'ib_counter_location'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genOrderNum() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
function genCartId() {
  return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
function calcCartTotal(cart) {
  return cart.reduce((sum, o) => sum + calcTotal(o), 0)
}

function emptyOrder() {
  return {
    type: 'byo',
    bread: '', proteins: [], cheeses: [],
    paidToppings: [], freeToppings: [], dressings: [],
    notes: '', doubleMeat: false, labelName: '',
    removeItems: [], addItems: [],
  }
}
function signatureOrder(sig) {
  return {
    type: 'signature', signatureId: sig.id,
    bread: '', proteins: [], cheeses: [],
    paidToppings: [], freeToppings: [], dressings: [],
    notes: '', doubleMeat: false, labelName: '',
    removeItems: [], addItems: [],
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  screen: { display:'flex', flexDirection:'column', height:'100dvh', maxWidth:480, margin:'0 auto', background:'var(--bg)', overflow:'hidden' },
  header: { display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'var(--white)', borderBottom:'1px solid var(--gray-light)', flexShrink:0 },
  body: { flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:14, minHeight:0 },
  footer: { padding:'14px 20px', background:'var(--white)', borderTop:'1px solid var(--gray-light)', flexShrink:0 },
  primaryBtn: (disabled) => ({ width:'100%', padding:'16px', borderRadius:'var(--radius)', background: disabled ? 'var(--gray-light)' : 'var(--red)', color: disabled ? 'var(--gray)' : 'var(--white)', fontSize:16, fontWeight:700, border:'none', cursor: disabled ? 'not-allowed' : 'pointer' }),
  secondaryBtn: { width:'100%', padding:'14px', borderRadius:'var(--radius)', background:'var(--white)', color:'var(--black)', fontSize:15, fontWeight:600, border:'2px solid var(--gray-light)', cursor:'pointer' },
  backBtn: { background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--gray-dark)', padding:'4px 8px', flexShrink:0 },
  card: { background:'var(--white)', borderRadius:'var(--radius)', padding:'14px 16px', flexShrink:0 },
  sectionTitle: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--gold)', marginBottom:10 },
  chip: (sel) => ({ padding:'10px 16px', borderRadius:20, fontSize:14, fontWeight:600, cursor:'pointer', border: sel ? '2px solid var(--red)' : '2px solid var(--gray-light)', background: sel ? 'var(--red-light)' : 'var(--white)', color: sel ? 'var(--red)' : 'var(--gray-dark)' }),
}

// ─── PIN Entry Screen ─────────────────────────────────────────────────────────
function PinScreen({ onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePin(digit) {
    const next = pin + digit
    setPin(next)
    setError('')
    if (next.length === 4) {
      setLoading(true)
      const { data } = await supabase
        .from('staff_pins')
        .select('id, name, initials')
        .eq('pin', next)
        .eq('active', true)
        .maybeSingle()
      setLoading(false)
      if (data) {
        onSuccess(data)
      } else {
        setError('PIN not recognised — try again')
        setPin('')
      }
    }
  }

  function handleBack() {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)', gap:32, padding:24 }}>
      <div style={{ textAlign:'center' }}>
        <img src="/app-icon.png" alt="IB" style={{ width:64, height:64, borderRadius:'50%', marginBottom:12 }} onError={e => e.target.style.display='none'} />
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:700, color:'var(--black)' }}>Employee Sign In</div>
        <div style={{ fontSize:14, color:'var(--gray)', marginTop:4 }}>Enter your 4-digit PIN</div>
      </div>

      {/* PIN dots */}
      <div style={{ display:'flex', gap:16 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width:18, height:18, borderRadius:'50%', background: pin.length > i ? 'var(--red)' : 'var(--gray-light)', transition:'background 0.15s' }} />
        ))}
      </div>

      {error && <div style={{ color:'var(--red)', fontSize:14, fontWeight:600, textAlign:'center' }}>{error}</div>}

      {/* Numpad */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 80px)', gap:12 }}>
        {digits.map((d, i) => (
          <button
            key={i}
            onClick={() => d === '⌫' ? handleBack() : d !== '' ? handlePin(d) : null}
            disabled={loading || d === ''}
            style={{
              width:80, height:80, borderRadius:'50%', fontSize: d === '⌫' ? 22 : 26, fontWeight:600,
              background: d === '' ? 'transparent' : 'var(--white)',
              border: d === '' ? 'none' : '2px solid var(--gray-light)',
              color:'var(--black)', cursor: d === '' ? 'default' : 'pointer',
              boxShadow: d === '' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >{d}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Order Type Screen ────────────────────────────────────────────────────────
function OrderTypeScreen({ staff, onInStore, onPhone }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)', gap:24, padding:32 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:14, color:'var(--gray)', marginBottom:4 }}>Signed in as</div>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700 }}>{staff.name}</div>
      </div>
      <div style={{ width:'100%', maxWidth:400, display:'flex', flexDirection:'column', gap:16 }}>
        <button onClick={onInStore} style={{ ...S.primaryBtn(false), padding:'24px', fontSize:18, borderRadius:'var(--radius)' }}>
          🏪  In-Store Order
        </button>
        <button onClick={onPhone} style={{ ...S.secondaryBtn, padding:'24px', fontSize:18, borderRadius:'var(--radius)', border:'2px solid var(--gray-light)' }}>
          📞  Phone Order
        </button>
      </div>
      <div style={{ fontSize:13, color:'var(--gray)' }}>In-store skips customer info · Phone order captures it</div>
    </div>
  )
}

// ─── Customer Info Screen (phone orders only) ─────────────────────────────────
function CustomerInfoScreen({ onBack, onNext }) {
  const [form, setForm] = useState({ firstName:'', lastName:'', phone:'', email:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.firstName.trim() && form.lastName.trim() && form.phone.trim().length >= 10

  function handlePhone(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0,10)
    let formatted = digits
    if (digits.length >= 7) formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
    else if (digits.length >= 4) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`
    else if (digits.length >= 1) formatted = `(${digits}`
    set('phone', formatted)
  }

  const inp = { width:'100%', padding:'14px 16px', borderRadius:12, border:'2px solid var(--gray-light)', fontSize:16, background:'var(--white)', color:'var(--black)', boxSizing:'border-box' }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Customer Info</div>
      </div>
      <div style={S.body}>
        <div style={{ display:'flex', gap:10 }}>
          <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" style={{ ...inp, flex:1 }} />
          <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" style={{ ...inp, flex:1 }} />
        </div>
        <input value={form.phone} onChange={handlePhone} placeholder="Phone number" inputMode="numeric" style={inp} />
        <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email (optional)" type="email" style={inp} />
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(!valid)} disabled={!valid} onClick={() => onNext(form)}>Continue →</button>
      </div>
    </div>
  )
}

// ─── Build Type Screen ────────────────────────────────────────────────────────
function BuildTypeScreen({ onBack, onByo, onSignature }) {
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>What are they having?</div>
      </div>
      <div style={{ ...S.body, justifyContent:'center', gap:16 }}>
        <button onClick={onByo} style={{ ...S.primaryBtn(false), padding:'24px', fontSize:18 }}>
          🥖  Build Your Own
        </button>
        <button onClick={onSignature} style={{ ...S.secondaryBtn, padding:'24px', fontSize:18, border:'2px solid var(--gold)', color:'var(--gold)' }}>
          ⭐  Signature Sandwich
        </button>
      </div>
    </div>
  )
}

// ─── Quick Build Screen (bread + proteins on one screen) ──────────────────────
function QuickBuildScreen({ onBack, onNext, initial }) {
  const [bread, setBread] = useState(initial?.bread || '')
  const [proteins, setProteins] = useState(initial?.proteins || [])
  const [doubleMeat, setDoubleMeat] = useState(initial?.doubleMeat || false)

  function toggleProtein(name) {
    setProteins(prev => prev.includes(name)
      ? prev.filter(p => p !== name)
      : prev.length < 4 ? [...prev, name] : prev)
  }

  const valid = bread && proteins.length > 0

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Quick Build</div>
          <div style={{ fontSize:12, color:'var(--gray)' }}>Bread + protein in one step</div>
        </div>
      </div>
      <div style={S.body}>
        {/* Bread */}
        <div>
          <div style={S.sectionTitle}>Bread</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {ALL_BREADS.map(b => (
              <button key={b.name} style={S.chip(bread === b.name)} onClick={() => { setBread(b.name); setProteins([]); setDoubleMeat(false) }}>{b.name}</button>
            ))}
          </div>
        </div>

        {/* Proteins */}
        {bread && (
          <div>
            <div style={S.sectionTitle}>Proteins <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>· up to 4</span></div>
            {PROTEIN_CATEGORIES.map(cat => {
              const items = PROTEINS.filter(p => p.category === cat)
              if (!items.length) return null
              return (
                <div key={cat} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'var(--gray)', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>{cat}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {items.map(p => {
                      const hero = isHeroBread(bread)
                      const price = hero ? p.hero : p.roll
                      return (
                        <button key={p.name} style={S.chip(proteins.includes(p.name))} onClick={() => toggleProtein(p.name)}>
                          {p.name} <span style={{ color:'var(--gray)', fontSize:12 }}>{fmtMoney(price)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Double meat toggle */}
        {proteins.length > 0 && (
          <button
            onClick={() => setDoubleMeat(d => !d)}
            style={{ ...S.card, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', border: doubleMeat ? '2px solid var(--red)' : '2px solid var(--gray-light)', cursor:'pointer' }}
          >
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>Double Meat</div>
              <div style={{ fontSize:12, color:'var(--gray)' }}>+50% of highest-priced protein</div>
            </div>
            <div style={{ width:28, height:28, borderRadius:'50%', background: doubleMeat ? 'var(--red)' : 'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:14 }}>
              {doubleMeat ? '✓' : ''}
            </div>
          </button>
        )}
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(!valid)} disabled={!valid} onClick={() => onNext({ bread, proteins, doubleMeat })}>
          Continue to Cheese & Toppings →
        </button>
      </div>
    </div>
  )
}

// ─── Cheese + Toppings Screen (combined for speed) ────────────────────────────
function CheeseAndToppingsScreen({ onBack, onNext, bread, initial }) {
  const hero = isHeroBread(bread)
  const [cheeses, setCheeses] = useState(initial?.cheeses || [])
  const [paidToppings, setPaidToppings] = useState(initial?.paidToppings || [])
  const [freeToppings, setFreeToppings] = useState(initial?.freeToppings || [])
  const [dressings, setDressings] = useState(initial?.dressings || [])

  function toggle(list, setList, item, max) {
    setList(prev => prev.includes(item)
      ? prev.filter(x => x !== item)
      : prev.length < max ? [...prev, item] : prev)
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Cheese & Toppings</div>
      </div>
      <div style={S.body}>
        {/* Cheese */}
        <div>
          <div style={S.sectionTitle}>Cheese <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>· up to 2</span></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {CHEESES.map(c => (
              <button key={c.name} style={S.chip(cheeses.includes(c.name))} onClick={() => toggle(cheeses, setCheeses, c.name, 2)}>
                {c.name} <span style={{ color:'var(--gray)', fontSize:12 }}>{fmtMoney(hero ? c.hero : c.roll)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Paid toppings */}
        {PAID_TOPPINGS.length > 0 && (
          <div>
            <div style={S.sectionTitle}>Paid Toppings</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {PAID_TOPPINGS.map(t => (
                <button key={t.name} style={S.chip(paidToppings.includes(t.name))} onClick={() => toggle(paidToppings, setPaidToppings, t.name, 99)}>
                  {t.name} <span style={{ color:'var(--gray)', fontSize:12 }}>{fmtMoney(hero ? t.hero : t.roll)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Free toppings */}
        <div>
          <div style={S.sectionTitle}>Toppings <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>· up to 2 free</span></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {FREE_TOPPINGS.map(t => (
              <button key={t.name} style={S.chip(freeToppings.includes(t.name))} onClick={() => toggle(freeToppings, setFreeToppings, t.name, 2)}>{t.name}</button>
            ))}
          </div>
        </div>

        {/* Dressings */}
        <div>
          <div style={S.sectionTitle}>Dressings <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>· up to 2</span></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {DRESSINGS.map(d => (
              <button key={d.name} style={S.chip(dressings.includes(d.name))} onClick={() => toggle(dressings, setDressings, d.name, 2)}>{d.name}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(false)} onClick={() => onNext({ cheeses, paidToppings, freeToppings, dressings })}>
          Continue to Notes →
        </button>
      </div>
    </div>
  )
}

// ─── Notes Screen ─────────────────────────────────────────────────────────────
function NotesScreen({ onBack, onNext, initial, initialLabelName }) {
  const [notes, setNotes] = useState(initial || '')
  const [labelName, setLabelName] = useState(initialLabelName || '')
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Notes</div>
      </div>
      <div style={S.body}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Prep instructions, allergies, special requests..."
          style={{ width:'100%', minHeight:120, padding:16, borderRadius:'var(--radius)', border:'2px solid var(--gray-light)', fontSize:16, resize:'none', background:'var(--white)', boxSizing:'border-box' }}
        />
        <div>
          <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--gray)', marginBottom:6 }}>
            For <span style={{ color:'var(--gray)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional — prints on label)</span>
          </div>
          <input
            value={labelName}
            onChange={e => setLabelName(e.target.value)}
            placeholder="e.g. Brian"
            style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:'2px solid var(--gray-light)', fontSize:16, background:'var(--white)', color:'var(--black)', boxSizing:'border-box' }}
          />
          <div style={{ fontSize:12, color:'var(--gray)', marginTop:4 }}>Useful when ordering for a group.</div>
        </div>
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(false)} onClick={() => onNext(notes, labelName)}>Review Order →</button>
      </div>
    </div>
  )
}

// ─── Signature Menu Screen (counter — tighter, no fluff) ──────────────────────
function SigMenuScreen({ onBack, onSelect }) {
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Signature Sandwiches</div>
      </div>
      <div style={S.body}>
        {SIGNATURE_CATEGORIES.map(cat => {
          const items = ACTIVE_SIGNATURES.filter(s => s.category === cat)
          if (!items.length) return null
          return (
            <div key={cat}>
              <div style={S.sectionTitle}>{cat}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:8 }}>
                {items.map(sig => (
                  <button key={sig.id} onClick={() => onSelect(sig)}
                    style={{ ...S.card, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', border:'1px solid var(--gray-light)', padding:'12px 14px' }}>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontSize:15, fontWeight:700 }}>{sig.name}</div>
                      <div style={{ fontSize:12, color:'var(--gray)', marginTop:2, lineHeight:1.4 }}>{sig.ingredients}</div>
                    </div>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--red)', flexShrink:0, marginLeft:12 }}>{fmtMoney(sig.price)}</div>
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

// ─── Signature Detail Screen (counter — ingredients prominent, no marketing) ──
const SIG_REMOVE_OPTIONS = ['Lettuce', 'Tomato', 'Onion', 'Hot Peppers', 'Dressing', 'Sauce']
const SIG_ADD_OPTIONS    = ['Extra Cheese', 'Extra Meat', 'Bacon', 'Avocado', 'Fresh Mozzarella']

function SigDetailScreen({ sig, onBack, onCommit, initialNotes, initialLabelName, initialRemove, initialAdd }) {
  const [notes, setNotes]           = useState(initialNotes || '')
  const [labelName, setLabelName]   = useState(initialLabelName || '')
  const [removeItems, setRemoveItems] = useState(initialRemove || [])
  const [addItems, setAddItems]     = useState(initialAdd || [])

  function toggle(list, setList, item) {
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])
  }
  const chipStyle = sel => ({
    padding:'8px 14px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
    border: sel ? '2px solid var(--red)' : '2px solid var(--gray-light)',
    background: sel ? 'var(--red-light)' : 'var(--white)',
    color: sel ? 'var(--red)' : 'var(--gray-dark)',
  })

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700 }}>{sig.name}</div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--red)' }}>{fmtMoney(sig.price)}</div>
        </div>
      </div>
      <div style={S.body}>
        {/* Ingredients — prominent for counter staff */}
        <div style={{ ...S.card, borderLeft:'3px solid var(--gold)', padding:'12px 14px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, color:'var(--gold)', marginBottom:6 }}>Ingredients</div>
          <div style={{ fontSize:14, fontWeight:600, lineHeight:1.6, color:'var(--black)' }}>{sig.ingredients}</div>
        </div>

        {/* Remove */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--gray)', marginBottom:6 }}>Remove</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {SIG_REMOVE_OPTIONS.map(item => (
              <button key={item} style={chipStyle(removeItems.includes(item))} onClick={() => toggle(removeItems, setRemoveItems, item)}>{item}</button>
            ))}
          </div>
        </div>

        {/* Add */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'var(--gray)', marginBottom:6 }}>Add <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(subject to upcharge)</span></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {SIG_ADD_OPTIONS.map(item => (
              <button key={item} style={chipStyle(addItems.includes(item))} onClick={() => toggle(addItems, setAddItems, item)}>{item}</button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Special requests..."
          style={{ width:'100%', minHeight:80, padding:14, borderRadius:'var(--radius)', border:'2px solid var(--gray-light)', fontSize:15, resize:'none', background:'var(--white)', boxSizing:'border-box' }}
        />

        {/* For name */}
        <input
          value={labelName}
          onChange={e => setLabelName(e.target.value)}
          placeholder="For (optional — prints on label)"
          style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:'2px solid var(--gray-light)', fontSize:15, background:'var(--white)', color:'var(--black)', boxSizing:'border-box' }}
        />
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(false)} onClick={() => onCommit(notes, labelName, removeItems, addItems)}>
          Add to Order →
        </button>
      </div>
    </div>
  )
}

// ─── Review Screen ────────────────────────────────────────────────────────────
function ReviewScreen({ cart, customer, orderType, onConfirm, onBack, saving, instoreLabelText }) {
  const total = calcCartTotal(cart)
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>Review Order</div>
      </div>
      <div style={S.body}>
        {/* Customer block */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{orderType === 'phone' ? 'Customer' : 'Order Type'}</div>
          {orderType === 'phone'
            ? <div style={{ fontSize:15, fontWeight:700 }}>{customer.firstName} {customer.lastName} · {customer.phone}</div>
            : <div style={{ fontSize:15, fontWeight:700 }}>{instoreLabelText || 'Sandwich Order'}</div>
          }
        </div>

        {/* Sandwiches */}
        {cart.map((order, i) => {
          const sig = order.type === 'signature' ? (findSignature(order.signatureId) || { name: order.signatureName }) : null
          return (
            <div key={i} style={{ ...S.card, border:'1px solid var(--gray-light)' }}>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:6, color:'var(--red)' }}>
                {i+1}. {sig ? sig.name : order.bread}
              </div>
              {!sig && order.proteins.length > 0 && <div style={{ fontSize:13, color:'var(--gray-dark)' }}>{order.proteins.join(', ')}{order.doubleMeat ? ' (2x)' : ''}</div>}
              {!sig && order.cheeses.length > 0 && <div style={{ fontSize:13, color:'var(--gray-dark)' }}>{order.cheeses.join(', ')}</div>}
              {sig && order.removeItems?.length > 0 && <div style={{ fontSize:13, color:'var(--red)' }}>NO: {order.removeItems.join(', ')}</div>}
              {sig && order.addItems?.length > 0 && <div style={{ fontSize:13, color:'var(--gray-dark)' }}>ADD: {order.addItems.join(', ')}</div>}
              {order.notes && <div style={{ fontSize:13, color:'var(--gray)', fontStyle:'italic' }}>Note: {order.notes}</div>}
              {order.labelName && <div style={{ fontSize:13, color:'var(--gold)', fontWeight:600 }}>For: {order.labelName}</div>}
              <div style={{ fontSize:13, fontWeight:700, marginTop:6 }}>{fmtMoney(calcTotal(order))}</div>
            </div>
          )
        })}

        <div style={{ ...S.card, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700 }}>Total</span>
          <span style={{ fontWeight:800, fontSize:18, color:'var(--red)' }}>{fmtMoney(total)}</span>
        </div>
      </div>
      <div style={S.footer}>
        <button style={S.primaryBtn(saving)} disabled={saving} onClick={onConfirm}>
          {saving ? 'Saving…' : 'Confirm & Print Label →'}
        </button>
      </div>
    </div>
  )
}

// ─── Confirmation Screen ──────────────────────────────────────────────────────
function ConfirmationScreen({ orderNum, onNewOrder }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)', gap:24, padding:32 }}>
      <div style={{ fontSize:64 }}>✅</div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:700 }}>Order Placed</div>
        <div style={{ fontSize:16, color:'var(--gray)', marginTop:4 }}>Order #{orderNum}</div>
        <div style={{ fontSize:14, color:'var(--gray)', marginTop:8 }}>Label printed to the deli Zebra</div>
      </div>
      <button onClick={onNewOrder} style={{ ...S.primaryBtn(false), maxWidth:320 }}>
        New Order →
      </button>
    </div>
  )
}

// ─── Main Counter App ─────────────────────────────────────────────────────────
export default function Counter() {
  const [screen, setScreen]           = useState('pin')
  const [staff, setStaff]             = useState(null)
  const [orderType, setOrderType]     = useState(null)   // 'instore' | 'phone'
  const [customer, setCustomer]       = useState(null)
  const [order, setOrder]             = useState(emptyOrder())
  const [cart, setCart]               = useState([])
  const [selectedSig, setSelectedSig] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [lastOrderNum, setLastOrderNum] = useState(null)
  const [instoreLabelText, setInstoreLabelText] = useState('Sandwich Order')
  const [location, setLocation]       = useState(() => localStorage.getItem(COUNTER_LOCATION_KEY) || '')

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('app_settings').select('key,value').is('location_id', null)
      if (data) {
        const s = Object.fromEntries(data.map(r => [r.key, r.value]))
        if (s.instore_label_text) setInstoreLabelText(s.instore_label_text)
      }
    }
    loadSettings()
  }, [])

  function commitToCart(finalOrder) {
    setCart(prev => [...prev, finalOrder])
    setOrder(emptyOrder())
    setSelectedSig(null)
  }

  async function handleConfirm() {
    setSaving(true)
    const orderNum = genOrderNum()
    const cartId = genCartId()
    const cust = orderType === 'phone' ? customer : { firstName: instoreLabelText, lastName: '', phone: '', email: '' }

    const rows = cart.map((sw, i) => ({
      order_number: orderNum,
      cart_id: cartId,
      item_index: i,
      item_count: cart.length,
      first_name: cust.firstName,
      last_name: cust.lastName,
      phone: cust.phone,
      email: cust.email || null,
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
      remove_items: sw.removeItems || [],
      add_items: sw.addItems || [],
      sms_opt_in: false,
      location: location || null,
      total: calcTotal(sw),
      made_by: staff?.initials || null,
      order_source: orderType === 'phone' ? 'counter_phone' : 'counter_instore',
      status: 'pending',
    }))

    const { error } = await supabase.from('sandwich_orders').insert(rows)
    setSaving(false)
    if (error) { alert('Error saving order — try again'); return }

    // Print labels
    printLabels(orderNum, cust, cart)
    setLastOrderNum(orderNum)
    setScreen('confirmation')
  }

  function resetForNewOrder() {
    setCart([])
    setOrder(emptyOrder())
    setSelectedSig(null)
    setOrderType(null)
    setCustomer(null)
    setScreen('orderType')
  }

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'pin') return (
    <PinScreen onSuccess={s => { setStaff(s); setScreen('orderType') }} />
  )

  if (screen === 'orderType') return (
    <OrderTypeScreen
      staff={staff}
      onInStore={() => { setOrderType('instore'); setScreen('buildType') }}
      onPhone={() => { setOrderType('phone'); setScreen('customerInfo') }}
    />
  )

  if (screen === 'customerInfo') return (
    <CustomerInfoScreen
      onBack={() => setScreen('orderType')}
      onNext={c => { setCustomer(c); setScreen('buildType') }}
    />
  )

  if (screen === 'buildType') return (
    <BuildTypeScreen
      onBack={() => setScreen(orderType === 'phone' ? 'customerInfo' : 'orderType')}
      onByo={() => setScreen('quickBuild')}
      onSignature={() => setScreen('sigMenu')}
    />
  )

  if (screen === 'quickBuild') return (
    <QuickBuildScreen
      onBack={() => setScreen('buildType')}
      initial={order}
      onNext={({ bread, proteins, doubleMeat }) => {
        setOrder(o => ({ ...o, type:'byo', bread, proteins, doubleMeat }))
        setScreen('cheeseAndToppings')
      }}
    />
  )

  if (screen === 'cheeseAndToppings') return (
    <CheeseAndToppingsScreen
      bread={order.bread}
      initial={order}
      onBack={() => setScreen('quickBuild')}
      onNext={({ cheeses, paidToppings, freeToppings, dressings }) => {
        setOrder(o => ({ ...o, cheeses, paidToppings, freeToppings, dressings }))
        setScreen('notes')
      }}
    />
  )

  if (screen === 'notes') return (
    <NotesScreen
      initial={order.notes}
      initialLabelName={order.labelName}
      onBack={() => setScreen('cheeseAndToppings')}
      onNext={(notes, labelName) => {
        const finalOrder = { ...order, notes, labelName }
        commitToCart(finalOrder)
        setScreen('review')
      }}
    />
  )

  if (screen === 'sigMenu') return (
    <SigMenuScreen
      onBack={() => setScreen('buildType')}
      onSelect={sig => { setSelectedSig(sig); setOrder(signatureOrder(sig)); setScreen('sigDetail') }}
    />
  )

  if (screen === 'sigDetail' && selectedSig) return (
    <SigDetailScreen
      sig={selectedSig}
      initialNotes={order.notes}
      initialLabelName={order.labelName}
      initialRemove={order.removeItems}
      initialAdd={order.addItems}
      onBack={() => setScreen('sigMenu')}
      onCommit={(notes, labelName, removeItems, addItems) => {
        const finalOrder = { ...order, notes, labelName, removeItems, addItems }
        commitToCart(finalOrder)
        setScreen('review')
      }}
    />
  )

  if (screen === 'review') return (
    <ReviewScreen
      cart={cart}
      customer={customer}
      orderType={orderType}
      instoreLabelText={instoreLabelText}
      saving={saving}
      onBack={() => setScreen('notes')}
      onConfirm={handleConfirm}
    />
  )

  if (screen === 'confirmation') return (
    <ConfirmationScreen orderNum={lastOrderNum} onNewOrder={resetForNewOrder} />
  )

  return null
}
