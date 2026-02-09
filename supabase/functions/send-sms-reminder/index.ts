// Supabase Edge Function - Send SMS Appointment Reminder via Twilio
// Setup: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in Supabase secrets

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured')
    }

    const { customerName, customerPhone, service, date, time } = await req.json()

    if (!customerPhone || !customerName) {
      throw new Error('Customer name and phone are required')
    }

    const message = `Hi ${customerName}! This is a reminder from KNGCuts: You have a ${service} appointment on ${date} at ${time}. Please arrive 5 min early. To cancel, visit your profile at kngcuts.com/profile.html. See you soon!`

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: customerPhone,
        From: twilioPhone,
        Body: message,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send SMS')
    }

    return new Response(
      JSON.stringify({ success: true, sid: result.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error sending SMS:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send SMS' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
