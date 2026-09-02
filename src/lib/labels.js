// Shared label printing + sandwich pricing.
// Used by the customer app (App.jsx) and the admin Orders tab (Admin.jsx reprint).
// When the WiFi Zebra ZD421 auto-print lands, its ZPL generator belongs here too,
// alongside rowsToPrintable(), so browser-print and auto-print share one data path.
import { isHeroBread, PROTEINS, PAID_TOPPINGS } from './menu.js'
import { findSignature, signatureBarcodeValue } from './signatures.js'

const LOGO_URL = '/logo.jpg'

export function calcTotal(order) {
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

export function fmtMoney(n) { return `$${n.toFixed(2)}` }

export function buildLabelHtml(orderNum, customer, order, sandwichIndex, sandwichTotal) {
  const sig = order.type === 'signature'
    ? (findSignature(order.signatureId) || { name: order.signatureName || 'Signature Sandwich', upc: order.signatureUpc || '' })
    : null
  const hero = order.bread ? isHeroBread(order.bread) : false
  const total = order.storedTotal != null ? order.storedTotal : calcTotal(order)
  const proteinLines = order.proteins.map(p => `<div class="item-line">${p}${order.doubleMeat ? ' (2x)' : ''}</div>`).join('')
  const cheeseLines = order.cheeses.map(c => `<div class="item-line">${c}</div>`).join('')
  const toppingLines = [...order.paidToppings, ...order.freeToppings].map(t => `<div class="mod-line">${t}</div>`).join('')
  const dressingLines = order.dressings.map(d => `<div class="mod-line">${d}</div>`).join('')
  const orderLabel = sandwichTotal > 1 ? `${orderNum}-${sandwichIndex + 1}` : orderNum
  const orderSubLabel = sandwichTotal > 1 ? `Order (${sandwichIndex + 1}/${sandwichTotal})` : 'Order'
  const sandwichTag = order.labelName ? `${order.labelName}'s Sandwich` : ''
  const removeLine = order.removeItems?.length ? `<div class="mod-line"><strong>NO:</strong> ${order.removeItems.join(', ')}</div>` : ''
  const addLine = order.addItems?.length ? `<div class="mod-line"><strong>ADD:</strong> ${order.addItems.join(', ')}</div>` : ''
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
          ? `<div class="item-line">${sig.name}</div><div class="bread-line">Signature Sandwich</div>${removeLine}${addLine}`
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

export function printLabels(orderNum, customer, cart) {
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


// ── DB rows → printable order ────────────────────────────────────────────────
// Takes the sandwich_orders rows of ONE order (same cart_id / order_number)
// and returns { orderNum, customer, cart } ready for printLabels().
export function rowsToPrintable(rows) {
  const sorted = [...rows].sort((a, b) => (a.item_index ?? 0) - (b.item_index ?? 0))
  const first = sorted[0]
  const customer = {
    firstName: first.first_name || '',
    lastName: first.last_name || '',
    phone: first.phone || '',
    email: first.email || '',
  }
  const cart = sorted.map(r => ({
    type: r.item_type === 'signature' ? 'signature' : 'byo',
    signatureId: r.signature_id || '',
    signatureName: r.signature_name || '',
    signatureUpc: r.signature_upc || '',
    bread: r.bread || '',
    proteins: r.proteins || [],
    cheeses: r.cheeses || [],
    paidToppings: r.paid_toppings || [],
    freeToppings: r.free_toppings || [],
    dressings: r.dressings || [],
    notes: r.notes || '',
    doubleMeat: !!r.double_meat,
    labelName: r.label_name || '',
    removeItems: r.remove_items || [],
    addItems: r.add_items || [],
    storedTotal: r.total != null ? parseFloat(r.total) : null,
  }))
  return { orderNum: first.order_number, customer, cart }
}


// ── ZPL Label Generator ──────────────────────────────────────────────────────
// Generates ZPL II for the Zebra GK420t / ZD421
// Label: 4" × 2.5" @ 203 DPI = 812 × 508 dots
//
// Layout:
//   TOP:    Logo (left) | ibfoods.com small under logo | Customer name + "For: X" (center) | Order # box (right)
//   SEP:    Full-width horizontal rule
//   MIDDLE: Bread, proteins, cheeses, toppings, dressings (comma-joined per category) | notes
//           Signature: item name + "Signature Sandwich" + notes
//   SEP:    Full-width horizontal rule
//   FOOTER: Phone | Total | Location
//   BAR:    Full-width barcode (UPC-A, scannable height)

// Location display names for footer
const LOC_ABBR = {
  'new-hyde-park': 'New Hyde Park',
  'wantagh':       'Wantagh',
  'maspeth':       'Maspeth',
  'woodbury':      'Woodbury',
  'garden-city':   'Garden City',
}


// ── ZPL Logo graphic ─────────────────────────────────────────────────────────
// IB monogram SVG converted to ZPL ~DG format at 88x88 dots (203 DPI)
// To update: re-run the SVG→ZPL conversion script and paste new hex data here,
// OR use the admin logo upload (coming soon) which regenerates this automatically.
const ZPL_LOGO_GRF = '~DGR:LOGO.GRF,968,11,00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003FFE000000000000000003FFFFF0000000000000001FFFFFFE00000000000000FFFFFFFF80000000000003FFFFFFFFE000000000000FFFFFFFFFF800000000001FFFFFFFFFFE00000000007FFFE7FFFFFF0000000000FFFEEFFF5FFF8000000001FFFDF7FF9DFFE000000003FFFFFFFFFEFFF000000007FFAFFFFFFBFFF80000000FFFAFFFFFFFEFFC0000001FFDFFFFFFFFFFFE0000003FFFFFF3F9FFFFFE0000007FFFFF3FFFBFFFFF000000FFD7FDFFFFF7FDFF800000FFF7F7FFFFF9FEFFC00001FFFFEFFFFFFEFF7FC00003FFFFBFFFFFFF7FBFE00003FEFF7FFFFFFFDFDFF00007FEFEFFFFFFFFEFDFF00007FDFDFFC000FFF7EFF8000FFBFBFFF80FFFFFF7F8000FFBF7FFF81FFFFBF7FC001FF7FFFFF83FFFFDFBFC001FF7EFFFF03FFFFFFBFC001FEFFFFFF07FFFFEFDFE003FEFDFFFE07FFFFF7DFE003FFFFFFFE0FFFFFFFFFE003FDFBFFFC0F001FFFEFF003FDFFFFFC1F0007FBEFF007FDF7FFF81FC3C3FFEFF007FFF7FFF83FC3E1FFFFF007FBFFFFF03F87F1FDF7F007FBFFFFF07F87F1FDF7F007FBFFFFE07F0FE1FFF7F807FBEFFFE0FF0FE1FFF7F807FBEFFFC0FE1FE3FFF7F807FBEFFFC1FE1FC3FFF7F807FBEFFF81FC1F87FFF7F807FBEFFF83FC3F8FFFF7F807FBEFFF03F8003FFFF7F807FBEFFF07F8187FFFF7F807FBFFFE07F07E1FFFF7F007FBFFFE0FF0FE0FFFF7F007FFFFFC0FE0FF0FFDFFF007FFF7F80FE1FF07FDFFF003FDF78001C1FE07FFEFF003FDFF8003C3FE07FBEFF003FFFBFFFF83FE07FBFFE003FEFBFFFF83FC0FFFDFE001FEFFFFFF07F80FF7DFE001FF7DFFFF07F01FFFBFC001FF7EFFFE0FE03FEFBFC000FFFFFFFE0F80FFDFFFC000FFFF7FFC0E03FFFFFF80007FEFBFE0001FFFBFFF80007FDFDFFFFFFFFF70FF00003FFFFFFFFFFFFEFFFF00003FFFF7FFFFFFFDFFFE00001FF3FBFFFFFFFBDFFC00000FFBFDFFFFFFF7BFFC00000FFFFE7FFFFFDFBFF8000007FFFFBFFFFF7FDFF0000003FF3FE7FFFDFCFFE0000001FFFFFCFFEFFAFFE0000000FFF3FFFBFFFDFFC00000007FE3FFFFFF9FFF800000003FFB9FFFFFAFFF000000001FFF1DFFFF9FFE000000000FFFDBEF3FFFF80000000007FFFBE37FFFF00000000001FFFCFBBFFFE00000000000FFFFFFFFFF8000000000003FFFFFFFFE0000000000000FFFFFFFF800000000000001FFFFFFE0000000000000003FFFFF000000000000000003FFE0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

// Truncate a string to maxLen chars, adding ellipsis if needed
function zTrunc(str, maxLen) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '\u2026' : str
}

// Escape ZPL field data (^ and ~ are ZPL control chars)
function zEsc(str) {
  return String(str || '').replace(/\^/g, ' ').replace(/~/g, ' ')
}

// Build a single ZPL label string
// orderNum    — string e.g. "1042"
// customer    — { firstName, lastName, phone }
// order       — same shape as buildLabelHtml order param
// sandwichIndex — 0-based index within cart
// sandwichTotal — total sandwiches in cart
// location    — location id string e.g. "woodbury" (optional)
// madeBy      — staff initials e.g. "JI" (optional)
export function buildZpl(orderNum, customer, order, sandwichIndex, sandwichTotal, location, madeBy) {
  const DPI    = 203
  const W      = 812   // label width dots  (4.00")
  const H      = 508   // label height dots (2.50")
  const M      = 20    // left/right margin dots

  // ── Derived values ─────────────────────────────────────────────────────────
  const isMulti     = sandwichTotal > 1
  const orderLabel  = isMulti ? `${orderNum}-${sandwichIndex + 1}` : orderNum
  const isSig       = order.type === 'signature'
  const total       = order.storedTotal != null ? order.storedTotal : calcTotal(order)
  const locAbbr     = LOC_ABBR[location] || (location ? location.slice(0,3).toUpperCase() : '')
  const custName    = zEsc(`${customer.firstName} ${customer.lastName}`)
  const forName     = order.labelName ? zEsc(`For: ${order.labelName}`) : ''
  const phone       = zEsc(customer.phone || '')

  // ── Barcode value ──────────────────────────────────────────────────────────
  let barcodeVal
  if (isSig) {
    barcodeVal = String(order.signatureUpc || '').padStart(11, '0').slice(0, 11)
  } else {
    const raw  = isMulti ? `${orderNum}${sandwichIndex + 1}` : orderNum
    barcodeVal = raw.padStart(11, '0').slice(0, 11)
  }

  // ── Item lines (BYO) — comma-joined per category ───────────────────────────
  const itemLines = []
  if (!isSig) {
    if (order.bread)                           itemLines.push(zEsc(order.bread))
    if (order.proteins?.length)                itemLines.push(zEsc(order.proteins.join(', ')))
    if (order.cheeses?.length)                 itemLines.push(zEsc(order.cheeses.join(', ')))
    const tops = [...(order.paidToppings||[]), ...(order.freeToppings||[])]
    if (tops.length)                           itemLines.push(zEsc(zTrunc(tops.join(', '), 55)))
    if (order.dressings?.length)               itemLines.push(zEsc(zTrunc(order.dressings.join(', '), 55)))
  } else {
    const sigName = order.signatureName || 'Signature Sandwich'
    itemLines.push(zEsc(sigName))
    itemLines.push('Signature Sandwich')
    if (order.removeItems?.length) itemLines.push(zEsc(zTrunc(`NO: ${order.removeItems.join(', ')}`, 55)))
    if (order.addItems?.length)    itemLines.push(zEsc(zTrunc(`ADD: ${order.addItems.join(', ')}`, 55)))
  }
  if (order.notes) itemLines.push(zEsc(zTrunc(`Note: ${order.notes}`, 55)))

  // ── ZPL coordinates ────────────────────────────────────────────────────────
  // Top section: logo placeholder box | customer block | order box
  // Logo area: x=M, y=10, ~90×90 dots
  const logoX = M
  const logoY = 8
  const logoSize = 88

  // Order box: right side, ~140 wide
  const orderBoxW = 148
  const orderBoxX = W - M - orderBoxW
  const orderBoxY = 8
  const orderBoxH = 110

  // Customer block: between logo and order box
  const custX = logoX + logoSize + 18
  const custNameY = 18
  const forNameY  = 58

  // Separator Y positions
  const sep1Y = 122   // below header
  const sep2Y = 370   // above footer

  // Item block starts below sep1
  let itemY = sep1Y + 14
  const itemLineH = 30  // dots per line (~14pt at 203dpi)

  // Footer Y
  const footerY = sep2Y + 14

  // Barcode: bottom strip, full width
  const bcY    = 408
  const bcH    = 80   // scannable height
  const bcX    = M + 10

  // ── Build ZPL ──────────────────────────────────────────────────────────────
  const lines = []

  lines.push('^XA')                          // start label
  lines.push(`^PW${W}`)                      // print width
  lines.push(`^LL${H}`)                      // label length
  lines.push('^LH0,0')                       // label home
  lines.push('^CI28')                        // UTF-8 encoding

  // ── Logo graphic (IB monogram, ~DG embedded) ─────────────────────────────
  // ~DG is prepended before ^XA in buildCartZpl so the printer only loads it once
  lines.push(`^FO${logoX},${logoY}^XGR:LOGO.GRF,1,1^FS`)
  lines.push(`^FO${logoX+2},${logoY+logoSize+4}^A0N,16,14^FDibfoods.com^FS`)

  // ── Customer name ──────────────────────────────────────────────────────────
  lines.push(`^FO${custX},${custNameY}^A0N,34,32^FD${zTrunc(custName, 22)}^FS`)
  if (forName) {
    lines.push(`^FO${custX},${forNameY}^A0N,24,22^FD${forName}^FS`)
  }

  // ── Order box ──────────────────────────────────────────────────────────────
  lines.push(`^FO${orderBoxX},${orderBoxY}^GB${orderBoxW},${orderBoxH},3^FS`)
  lines.push(`^FO${orderBoxX+6},${orderBoxY+6}^A0N,18,16^FDORDER^FS`)
  // Big order number — scale font size based on length
  const orderFontSize = orderLabel.length > 4 ? 36 : 52
  const orderNumY = orderBoxY + 28
  lines.push(`^FO${orderBoxX+6},${orderNumY}^A0N,${orderFontSize},${orderFontSize}^FD${orderLabel}^FS`)
  if (isMulti) {
    lines.push(`^FO${orderBoxX+6},${orderBoxY+orderBoxH-22}^A0N,16,14^FD${sandwichIndex+1}/${sandwichTotal}^FS`)
  }

  // ── Separator 1 ────────────────────────────────────────────────────────────
  lines.push(`^FO${M},${sep1Y}^GB${W - M*2},2,2^FS`)

  // ── Item lines ─────────────────────────────────────────────────────────────
  // First line slightly larger (bread / signature name)
  itemLines.forEach((line, i) => {
    const fontSize = i === 0 ? 28 : 22
    const y = itemY + i * itemLineH
    if (y < sep2Y - 10) {   // don't overflow into footer
      lines.push(`^FO${M},${y}^A0N,${fontSize},${fontSize - 2}^FD${line}^FS`)
    }
  })

  // ── Separator 2 ────────────────────────────────────────────────────────────
  lines.push(`^FO${M},${sep2Y}^GB${W - M*2},2,2^FS`)

  // ── Footer: Phone | Total | Location | Made by ─────────────────────────────
  lines.push(`^FO${M},${footerY}^A0N,22,20^FD${phone}^FS`)
  lines.push(`^FO340,${footerY}^A0N,22,20^FD${fmtMoney(total)}^FS`)
  if (locAbbr) {
    lines.push(`^FO${W - M - 200},${footerY}^A0N,22,20^FD${locAbbr}^FS`)
  }
  if (madeBy) {
    lines.push(`^FO${M},${footerY + 24}^A0N,18,16^FDMade by: ${zEsc(madeBy)}^FS`)
  }

  // ── Barcode (UPC-A, full width, scannable height) ──────────────────────────
  // ^BCN = barcode field, N=normal, height, printInterpretationLine, printInterpretationLineAbove, checkDigit
  lines.push(`^FO${bcX},${bcY}^BY2,3,${bcH}^BCN,${bcH},Y,N,N^FD${barcodeVal}^FS`)

  lines.push('^XZ')   // end label

  return lines.join('\n')
}

// Build ZPL for a full cart (one ZPL job = all sandwiches concatenated)
export function buildCartZpl(orderNum, customer, cart, location, madeBy) {
  // Prepend ~DG logo graphic once — printer stores it in RAM for all labels in the job
  const labels = cart.map((order, i) => buildZpl(orderNum, customer, order, i, cart.length, location, madeBy)).join('\n')
  return ZPL_LOGO_GRF + '\n' + labels
}
