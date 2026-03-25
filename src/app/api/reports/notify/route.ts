import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const { reportId } = await req.json()

  const { data: report } = await supabase
    .from('weekly_reports')
    .select('*, author:profiles!authored_by(full_name, email)')
    .eq('id', reportId)
    .single()

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  // Mark as submitted
  await supabase.from('weekly_reports').update({
    status: 'submitted',
    submitted_at: new Date().toISOString()
  }).eq('id', reportId)

  // Notify Edward
  const { data: edward } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('role', 'edward')
    .single()

  if (edward?.email) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: edward.email,
      subject: `📋 Nouveau CR Meshuga — ${report.week_label}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1A1714; padding: 28px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #F5C842; font-size: 32px; margin: 0; letter-spacing: 3px; font-family: monospace;">MESHUGA</h1>
            <p style="color: #8C7B6E; font-size: 11px; margin: 4px 0 0; letter-spacing: 3px; text-transform: uppercase;">Compte-rendu hebdomadaire</p>
          </div>
          <div style="background: #FDFAF5; padding: 28px; border-radius: 0 0 12px 12px; border: 1px solid #E0D8CC;">
            <h2 style="color: #1A1714; margin: 0 0 4px; font-size: 20px;">${report.week_label}</h2>
            <p style="color: #8C7B6E; font-size: 13px; margin: 0 0 24px;">Par ${report.author?.full_name}</p>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
              ${[
                ['📞', 'Prospects contactés', report.prospects_contacted],
                ['🤝', 'RDV', report.meetings_held],
                ['📦', 'Commandes', report.orders_received],
              ].map(([icon, label, val]) => `
                <div style="background: #F5F0E8; border-radius: 10px; padding: 14px; text-align: center;">
                  <div style="font-size: 22px;">${icon}</div>
                  <div style="font-size: 24px; font-weight: 700; color: #1A1714;">${val}</div>
                  <div style="font-size: 11px; color: #8C7B6E; text-transform: uppercase; letter-spacing: 1px;">${label}</div>
                </div>
              `).join('')}
            </div>

            ${report.wins ? `
              <div style="margin-bottom: 16px;">
                <h3 style="color: #2E7D32; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px;">✅ Victoires</h3>
                <p style="color: #3D3530; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${report.wins}</p>
              </div>` : ''}

            ${report.challenges ? `
              <div style="margin-bottom: 16px;">
                <h3 style="color: #B8860B; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px;">⚡ Challenges</h3>
                <p style="color: #3D3530; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${report.challenges}</p>
              </div>` : ''}

            ${report.next_week_priorities ? `
              <div style="margin-bottom: 16px;">
                <h3 style="color: #E8412C; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px;">🎯 Priorités S+1</h3>
                <p style="color: #3D3530; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${report.next_week_priorities}</p>
              </div>` : ''}

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/reporting/${reportId}"
               style="display: inline-block; background: #E8412C; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 8px; font-size: 14px;">
              Voir & répondre dans l'app →
            </a>
          </div>
        </div>
      `
    })

    // In-app notification for Edward
    await supabase.from('notifications').insert({
      user_id: edward.email, // we'll resolve by email
      title: `📋 Nouveau CR — ${report.week_label}`,
      message: `Soumis par ${report.author?.full_name}`,
      type: 'report',
      link: `/reporting/${reportId}`
    })
  }

  return NextResponse.json({ success: true })
}
