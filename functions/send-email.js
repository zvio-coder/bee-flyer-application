// Cloudflare Pages Function (runs at /send-email)
// No npm packages needed. Uses Resend's REST API directly.

export async function onRequestPost({ request, env }) {
  try {
    if (!env.RESEND_API_KEY) {
      return json({ ok: false, error: 'RESEND_API_KEY not set' }, 500)
    }

    const { contact, answers, mapA, mapB, subject } = await request.json()

    const html = `
      <h2>Bee Flyer Application</h2>
      <p><strong>Name:</strong> ${escape(contact?.name)}</p>
      <p><strong>Phone:</strong> ${escape(contact?.phone)}</p>
      <p><strong>Email:</strong> ${escape(contact?.email)}</p>
      <hr/>
      <h3>Answers</h3>
      <ul>
        ${Object.entries(answers || {})
          .map(([q, a]) => `<li><strong>${escape(q)}</strong>: ${Array.isArray(a) ? a.map(escape).join(', ') : escape(a ?? '—')}</li>`)
          .join('')}
      </ul>
      <hr/>
      <h3>Map A</h3>
      ${mapA?.png ? `<img src="${mapA.png}" alt="Map A drawing" style="max-width:100%;"/>` : '<p>No drawing</p>'}
      <h3>Map B</h3>
      ${mapB?.png ? `<img src="${mapB.png}" alt="Map B drawing" style="max-width:100%;"/>` : '<p>No drawing</p>'}
    `

    // Send email via Resend REST API
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Bee Flyer <onboarding@resend.dev>', // switch to your verified sender later
        to: ['zvio@hotmail.co.uk'],                // add more recipients later if you want
        subject: subject || `Bee Flyer Application - ${contact?.name || 'Unknown'}`,
        html
      })
    })

    if (!resp.ok) {
      const err = await resp.text()
      return json({ ok: false, error: 'Resend error', details: err }, 500)
    }

    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, error: 'Server error', details: String(e) }, 500)
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function escape(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
