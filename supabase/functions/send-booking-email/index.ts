// Supabase Edge Function - Send Booking/Cancellation Email via Resend
// Setup: Set RESEND_API_KEY in Supabase secrets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const adminEmail = 'kngcutsbarbershop@gmail.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('Resend API key not configured')
    }

    const body = await req.json()
    const {
      type,
      customerName,
      customerEmail,
      service,
      date,
      time,
      total,
      extras,
    } = body

    if (!customerName) {
      throw new Error('Customer name is required')
    }

    const extrasHtml = extras && extras.length > 0
      ? `<tr><td style="padding:8px 0;color:#aaa;">Extras</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${extras.map((e: { name: string }) => e.name).join(', ')}</td></tr>`
      : ''

    // ===== CANCELLATION =====
    if (type === 'cancellation') {
      const cancelAdminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#121212;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:30px;">
      <h1 style="color:#D4AF37;font-size:32px;margin:0;font-style:italic;">KINGCuts</h1>
      <p style="color:#aaa;margin:8px 0 0;">Cancellation Alert</p>
    </div>
    <div style="background:#1a1a1a;border-radius:16px;padding:32px;border:1px solid #333;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:60px;height:60px;background:#e74c3c;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h2 style="color:#f5f5f5;margin:16px 0 4px;font-size:20px;">Appointment Cancelled</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#aaa;">Client</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;font-weight:600;">${customerName}</td></tr>
        ${customerEmail ? `<tr><td style="padding:8px 0;color:#aaa;">Email</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${customerEmail}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#aaa;">Service</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${service}</td></tr>
        ${extrasHtml}
        <tr><td style="padding:8px 0;color:#aaa;">Date</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${date}</td></tr>
        <tr><td style="padding:8px 0;color:#aaa;">Time</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${time}</td></tr>
        ${total ? `<tr style="border-top:1px solid #333;"><td style="padding:12px 0;color:#aaa;">Total Was</td><td style="padding:12px 0;text-align:right;color:#e74c3c;font-weight:700;font-size:18px;">$${parseFloat(total).toFixed(2)}</td></tr>` : ''}
      </table>
      <p style="color:#aaa;font-size:13px;margin:16px 0 0;text-align:center;">This time slot is now available for booking.</p>
    </div>
  </div>
</body>
</html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'KNGCuts <kngcutsbarbershop@gmail.com>',
          to: [adminEmail],
          subject: `Cancellation: ${customerName} - ${service} on ${date} at ${time}`,
          html: cancelAdminHtml,
        }),
      })

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ===== NEW BOOKING (default) =====
    if (!customerEmail) {
      throw new Error('Customer email is required for booking confirmation')
    }

    const balanceDue = (parseFloat(total) - 5).toFixed(2)

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#121212;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:30px;">
      <h1 style="color:#D4AF37;font-size:32px;margin:0;font-style:italic;">KINGCuts</h1>
      <p style="color:#aaa;margin:8px 0 0;">Professional Barbershop</p>
    </div>

    <div style="background:#1a1a1a;border-radius:16px;padding:32px;border:1px solid #333;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:60px;height:60px;background:#27ae60;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style="color:#f5f5f5;margin:16px 0 4px;font-size:24px;">Booking Confirmed!</h2>
        <p style="color:#aaa;margin:0;">Thank you, ${customerName}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tr><td style="padding:8px 0;color:#aaa;">Service</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;font-weight:600;">${service}</td></tr>
        ${extrasHtml}
        <tr><td style="padding:8px 0;color:#aaa;">Date</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${date}</td></tr>
        <tr><td style="padding:8px 0;color:#aaa;">Time</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${time}</td></tr>
        <tr style="border-top:1px solid #333;"><td style="padding:12px 0 8px;color:#aaa;">Total</td><td style="padding:12px 0 8px;text-align:right;color:#D4AF37;font-weight:700;font-size:18px;">$${parseFloat(total).toFixed(2)}</td></tr>
        <tr><td style="padding:4px 0;color:#aaa;">Deposit Paid</td><td style="padding:4px 0;text-align:right;color:#27ae60;font-weight:600;">$5.00</td></tr>
        <tr><td style="padding:4px 0;color:#aaa;">Balance Due</td><td style="padding:4px 0;text-align:right;color:#f5f5f5;font-weight:600;">$${balanceDue}</td></tr>
      </table>

      <div style="background:#2a2518;border:1px solid #D4AF37;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="color:#D4AF37;margin:0 0 8px;font-weight:600;">Cancellation Policy</p>
        <p style="color:#ccc;margin:0;font-size:14px;">The $5.00 booking deposit is non-refundable. Please arrive 5 minutes early for your appointment.</p>
      </div>

      <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #333;">
        <p style="color:#aaa;font-size:14px;margin:0 0 4px;">KNGCuts Barbershop</p>
        <p style="color:#888;font-size:13px;margin:0;">84 Pinewood Ave, West Long Branch, NJ 07764</p>
        <p style="color:#888;font-size:13px;margin:4px 0 0;">(201) 414-0921</p>
      </div>
    </div>

    <p style="text-align:center;color:#666;font-size:12px;margin-top:20px;">This is an automated confirmation from KNGCuts.</p>
  </div>
</body>
</html>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'KNGCuts <kngcutsbarbershop@gmail.com>',
        to: [customerEmail],
        subject: `Booking Confirmed - ${service} on ${date}`,
        html: emailHtml,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send email')
    }

    // Send admin notification (non-blocking)
    const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#121212;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:30px;">
      <h1 style="color:#D4AF37;font-size:32px;margin:0;font-style:italic;">KINGCuts</h1>
      <p style="color:#aaa;margin:8px 0 0;">New Booking Alert</p>
    </div>
    <div style="background:#1a1a1a;border-radius:16px;padding:32px;border:1px solid #333;">
      <h2 style="color:#D4AF37;margin:0 0 16px;font-size:20px;">New Appointment Booked!</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#aaa;">Client</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;font-weight:600;">${customerName}</td></tr>
        <tr><td style="padding:8px 0;color:#aaa;">Email</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${customerEmail}</td></tr>
        <tr><td style="padding:8px 0;color:#aaa;">Service</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${service}</td></tr>
        ${extrasHtml}
        <tr><td style="padding:8px 0;color:#aaa;">Date</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${date}</td></tr>
        <tr><td style="padding:8px 0;color:#aaa;">Time</td><td style="padding:8px 0;text-align:right;color:#f5f5f5;">${time}</td></tr>
        <tr style="border-top:1px solid #333;"><td style="padding:12px 0;color:#aaa;">Total</td><td style="padding:12px 0;text-align:right;color:#D4AF37;font-weight:700;font-size:18px;">$${parseFloat(total).toFixed(2)}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'KNGCuts <kngcutsbarbershop@gmail.com>',
          to: [adminEmail],
          subject: `New Booking: ${customerName} - ${service} on ${date} at ${time}`,
          html: adminHtml,
        }),
      })
    } catch (adminErr) {
      console.error('Admin notification failed (non-blocking):', adminErr)
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
