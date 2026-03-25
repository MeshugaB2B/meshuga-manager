import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import twilio from 'twilio'

const resend = new Resend(process.env.RESEND_API_KEY)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

// Called by Vercel Cron every 15 minutes
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const fifteenMinsLater = new Date(now.getTime() + 15 * 60 * 1000)

  // Fetch pending reminders due in the next 15 minutes
  const { data: reminders } = await supabase
    .from('reminders')
    .select(`*, assigned_profile:profiles!assigned_to(email, full_name, whatsapp, phone), prospect:prospects(company_name)`)
    .eq('status', 'pending')
    .lte('remind_at', fifteenMinsLater.toISOString())
    .gte('remind_at', now.toISOString())

  if (!reminders?.length) return NextResponse.json({ processed: 0 })

  const results = []

  for (const reminder of reminders) {
    const profile = reminder.assigned_profile
    const prospectName = reminder.prospect?.company_name || ''
    const channels = reminder.channels as string[]

    // 1. In-app notification
    if (channels.includes('app')) {
      await supabase.from('notifications').insert({
        user_id: reminder.assigned_to,
        title: `⏰ ${reminder.title}`,
        message: reminder.message || (prospectName ? `Relancer ${prospectName}` : ''),
        type: 'reminder',
        link: reminder.prospect_id ? `/crm/${reminder.prospect_id}` : '/crm',
      })
    }

    // 2. Email
    if (channels.includes('email') && profile?.email) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: profile.email,
        subject: `⏰ Rappel Meshuga : ${reminder.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: #1A1714; padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #F5C842; font-size: 28px; margin: 0; letter-spacing: 2px;">MESHUGA</h1>
              <p style="color: #8C7B6E; font-size: 11px; margin: 4px 0 0; letter-spacing: 2px;">B2B MANAGER</p>
            </div>
            <div style="background: #FDFAF5; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #E0D8CC;">
              <h2 style="color: #E8412C; margin: 0 0 8px;">⏰ ${reminder.title}</h2>
              ${prospectName ? `<p style="color: #3D3530; font-size: 14px;">Prospect : <strong>${prospectName}</strong></p>` : ''}
              ${reminder.message ? `<p style="color: #3D3530; font-size: 14px;">${reminder.message}</p>` : ''}
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/crm${reminder.prospect_id ? `/${reminder.prospect_id}` : ''}" 
                 style="display: inline-block; background: #E8412C; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
                Voir dans l'app →
              </a>
            </div>
          </div>
        `
      })
    }

    // 3. WhatsApp
    if (channels.includes('whatsapp') && profile?.whatsapp) {
      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM!,
        to: `whatsapp:${profile.whatsapp}`,
        body: `⏰ *Rappel Meshuga*\n\n${reminder.title}${prospectName ? `\nProspect : ${prospectName}` : ''}${reminder.message ? `\n${reminder.message}` : ''}\n\n👉 ${process.env.NEXT_PUBLIC_APP_URL}/crm`
      })
    }

    // 4. SMS
    if (channels.includes('sms') && profile?.phone) {
      await twilioClient.messages.create({
        from: process.env.TWILIO_SMS_FROM!,
        to: profile.phone,
        body: `⏰ Rappel Meshuga: ${reminder.title}${prospectName ? ` — ${prospectName}` : ''}. ${process.env.NEXT_PUBLIC_APP_URL}/crm`
      })
    }

    // Mark as sent
    await supabase.from('reminders').update({ status: 'sent' }).eq('id', reminder.id)
    results.push({ id: reminder.id, channels })
  }

  return NextResponse.json({ processed: results.length, results })
}

// Create reminder
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  const { data, error } = await supabase.from('reminders').insert(body).select().single()
  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json(data)
}
