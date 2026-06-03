// ─── SMS Notifications via Twilio ────────────────────────────────────────────
// To activate:
// 1. Create a Twilio account at twilio.com
// 2. Get your Account SID, Auth Token, and a Twilio phone number
// 3. Add these to Vercel environment variables:
//    VITE_TWILIO_ACCOUNT_SID
//    VITE_TWILIO_AUTH_TOKEN
//    VITE_TWILIO_FROM_NUMBER  (your Twilio number, e.g. +15165551234)
//    VITE_NOTIFY_PHONE        (the deli owner's number to receive texts)
// 4. Set VITE_SMS_ENABLED=true in Vercel environment variables
// ─────────────────────────────────────────────────────────────────────────────

const SMS_ENABLED = import.meta.env.VITE_SMS_ENABLED === 'true'
const ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID || ''
const AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN || ''
const FROM_NUMBER = import.meta.env.VITE_TWILIO_FROM_NUMBER || ''
const NOTIFY_PHONE = import.meta.env.VITE_NOTIFY_PHONE || ''

export async function sendOrderSMS(orderNum, customer, order) {
  if (!SMS_ENABLED) return // Not activated yet

  const hero = order.bread ? order.bread : ''
  const proteins = order.proteins.join(', ')
  const message = [
    `🥖 New Order #${orderNum}`,
    `${customer.firstName} ${customer.lastName} · ${customer.phone}`,
    `${hero} · ${proteins}`,
    order.cheeses.length ? `Cheese: ${order.cheeses.join(', ')}` : null,
    order.paidToppings.length ? `Add-ons: ${order.paidToppings.join(', ')}` : null,
    order.freeToppings.length ? `Toppings: ${order.freeToppings.join(', ')}` : null,
    order.dressings.length ? `Dressing: ${order.dressings.join(', ')}` : null,
    order.notes ? `Note: ${order.notes}` : null,
  ].filter(Boolean).join('\n')

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`
    const body = new URLSearchParams({ To: NOTIFY_PHONE, From: FROM_NUMBER, Body: message })
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  } catch (e) {
    console.error('SMS send error:', e)
  }
}
