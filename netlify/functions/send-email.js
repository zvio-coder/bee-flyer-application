// netlify/functions/send-email.js
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { contact, answers, mapA, mapB, subject } = req.body

    const html = `
      <h2>Bee Flyer Application</h2>
      <p><strong>Name:</strong> ${contact?.name || ''}</p>
      <p><strong>Phone:</strong> ${contact?.phone || ''}</p>
      <p><strong>Email:</strong> ${contact?.email || ''}</p>
      <hr/>
      <h3>Answers</h3>
      <ul>
        ${Object.entries(answers || {})
          .map(
            ([q, a]) =>
              `<li><strong>${q}</strong>: ${
                Array.isArray(a) ? a.join(', ') : a || '—'
              }</li>`
          )
          .join('')}
      </ul>
      <hr/>
      <h3>Map A</h3>
      ${mapA?.png ? `<img src="${mapA.png}" alt="Map A drawing" style="max-width:100%;"/>` : '<p>No drawing</p>'}
      <h3>Map B</h3>
      ${mapB?.png ? `<img src="${mapB.png}" alt="Map B drawing" style="max-width:100%;"/>` : '<p>No drawing</p>'}
    `

    await resend.emails.send({
      // ✅ Safe default sender for testing
      from: 'Bee Flyer <onboarding@resend.dev>',
      to: 'zvio@hotmail.co.uk',
      subject: subject || `Bee Flyer Application - ${contact?.name || 'Unknown'}`,
      html,
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Email send error:', err)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
