// netlify/functions/send-email.js
import { Resend } from 'resend'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Clear error message if the env var wasn’t set at build time
    return json({ ok: false, error: 'RESEND_API_KEY is not set on Netlify' }, 500)
  }

  const resend = new Resend(apiKey)

  try {
    const { contact, answers, mapA, mapB, subject } = JSON.parse(event.body || '{}')

    const html = `
      <h2>Bee Flyer Application</h2>
      <p><strong>Name:</strong> ${contact?.name || ''}</p>
      <p><strong>Phone:</strong> ${contact?.phone || ''}</p>
      <p><strong>Email:</strong> ${contact?.email || ''}</p>
      <hr/>
      <h3>Answers</h3>
      <ul>
        ${Object.entries(answers || {})
          .map(([q, a]) => `<li><strong>${escapeHtml(q)}</strong>: ${Array.isArray(a) ? a.map(escapeHtml).join(', ') : escapeHtml(a ?? '—')}</li>`)
          .join('')}
      </ul>
      <hr/>
      <h3>Map A</h3>
      ${mapA?.png ? `<img src="${mapA.png}" alt="Map A drawing" style="max-width:100%;"/>` : '<p>No drawing</p>'}
      <h3>Map B</h3>
      ${mapB?.png ? `<img src="${mapB.png}" alt="Map B drawing" style="max-width:100%;"/>` : '<p>No drawing</p>'}
    `

    const { error } = await resend.emails.send({
      from: 'Bee Flyer <onboarding@resend.dev>',
      to: 'zvio@hotmail.co.uk',
      subject: subject || `Bee Flyer Application - ${contact?.name || 'Unknown'}`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return json({ ok: false, error: 'Email provider error' }, 500)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('Function error:', err)
    return json({ ok: false, error: 'Bad request or server error' }, 500)
  }
}

function json(payload, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(payload),
  }
}
function escapeHtml(v) {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
