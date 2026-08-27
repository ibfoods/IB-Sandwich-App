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
    storedTotal: r.total != null ? parseFloat(r.total) : null,
  }))
  return { orderNum: first.order_number, customer, cart }
}
