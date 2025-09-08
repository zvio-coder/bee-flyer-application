// functions/send-email.js
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    // Build simple HTML
    const answersHtml = `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; white-space: pre-wrap; font-size: 14px;">${
      body?.answers ? escapeHtml(JSON.stringify(body.answers, null, 2)) : ""
    }</pre>`;

    const mapAImg = body?.mapA?.png
      ? `<div><b>Map A:</b><br/><img src="${body.mapA.png}" width="500" style="max-width:100%;"/></div>`
      : `<div><b>Map A:</b> (no input)</div>`;

    const mapBImg = body?.mapB?.png
      ? `<div><b>Map B:</b><br/><img src="${body.mapB.png}" width="500" style="max-width:100%;"/></div>`
      : `<div><b>Map B:</b> (no input)</div>`;

    const html = `
      <h2>New Bee Flyer Application</h2>
      <p><b>Name:</b> ${escapeHtml(body?.contact?.name || "")}</p>
      <p><b>Phone:</b> ${escapeHtml(body?.contact?.phone || "")}</p>
      <p><b>Email:</b> ${escapeHtml(body?.contact?.email || "")}</p>
      ${answersHtml}
      ${mapAImg}
      <br/>
      ${mapBImg}
    `;

    // Resend REST API (use Workers-native fetch, not the Node SDK)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Bee Flyer <onboarding@resend.dev>",  // ok for testing
        to: ["zvio@hotmail.co.uk", "flyerbee4@gmail.com"], // multiple recipients
        subject: body?.subject || "Bee Flyer Application",
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(`Resend error: ${txt}`, { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("Error sending email", { status: 500 });
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
