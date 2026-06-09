import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Referee Match Manager <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") || "https://dreamy-sfogliatella-f12b45.netlify.app";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function refereeEmailHtml(
  refereeName: string,
  role: string,
  homeTeam: string,
  awayTeam: string,
  dateTime: string,
  location: string,
  matchId: string,
  refereeId: string
) {
  const acceptUrl = `${SITE_URL}/matches?accept=${matchId}`;
  const declineUrl = `${SITE_URL}/matches?decline=${matchId}`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#16a34a);padding:32px;text-align:center">
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700">Referee Match Manager</h1>
              <p style="color:#a7f3d0;font-size:14px;margin:8px 0 0">New Match Assignment</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px">
              <p style="color:#374151;font-size:16px;margin:0 0 8px">Hi ${refereeName},</p>
              <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6">You have been assigned as <strong>${role}</strong> for the following match:</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px">
                <tr>
                  <td style="padding:4px 0"><span style="color:#9ca3af;font-size:12px">Match:</span></td>
                  <td style="padding:4px 0;text-align:right"><span style="color:#374151;font-size:14px;font-weight:600">${homeTeam} vs ${awayTeam}</span></td>
                </tr>
                <tr>
                  <td style="padding:4px 0"><span style="color:#9ca3af;font-size:12px">Date:</span></td>
                  <td style="padding:4px 0;text-align:right"><span style="color:#374151;font-size:14px">${dateTime}</span></td>
                </tr>
                <tr>
                  <td style="padding:4px 0"><span style="color:#9ca3af;font-size:12px">Location:</span></td>
                  <td style="padding:4px 0;text-align:right"><span style="color:#374151;font-size:14px">${location}</span></td>
                </tr>
                <tr>
                  <td style="padding:4px 0"><span style="color:#9ca3af;font-size:12px">Role:</span></td>
                  <td style="padding:4px 0;text-align:right"><span style="color:#374151;font-size:14px;text-transform:capitalize">${role}</span></td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
                <tr>
                  <td style="background:#059669;border-radius:12px;padding:14px 36px">
                    <a href="${acceptUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:inline-block">
                      Accept Assignment
                    </a>
                  </td>
                  <td style="width:12px"></td>
                  <td style="background:#ef4444;border-radius:12px;padding:14px 36px">
                    <a href="${declineUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:inline-block">
                      Decline
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5">You can also respond from the app. If the buttons above don't work, copy this link into your browser:<br>
              <span style="color:#6b7280">${acceptUrl}</span></p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb">
              <p style="color:#9ca3af;font-size:12px;margin:0">If you have any questions, please contact the match administrator.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function coachEmailHtml(
  coachName: string,
  homeTeam: string,
  awayTeam: string,
  dateTime: string,
  location: string,
  matchId: string
) {
  const matchUrl = `${SITE_URL}/matches?highlight=${matchId}`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#16a34a);padding:32px;text-align:center">
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700">Referee Match Manager</h1>
              <p style="color:#a7f3d0;font-size:14px;margin:8px 0 0">New Match Scheduled</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px">
              <p style="color:#374151;font-size:16px;margin:0 0 8px">Hi ${coachName},</p>
              <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6">A new match has been scheduled for your team:</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px">
                <tr>
                  <td style="padding:4px 0"><span style="color:#9ca3af;font-size:12px">Match:</span></td>
                  <td style="padding:4px 0;text-align:right"><span style="color:#374151;font-size:14px;font-weight:600">${homeTeam} vs ${awayTeam}</span></td>
                </tr>
                <tr>
                  <td style="padding:4px 0"><span style="color:#9ca3af;font-size:12px">Date:</span></td>
                  <td style="padding:4px 0;text-align:right"><span style="color:#374151;font-size:14px">${dateTime}</span></td>
                </tr>
                <tr>
                  <td style="padding:4px 0"><span style="color:#9ca3af;font-size:12px">Location:</span></td>
                  <td style="padding:4px 0;text-align:right"><span style="color:#374151;font-size:14px">${location}</span></td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin:0 auto">
                <tr>
                  <td style="background:#059669;border-radius:12px;padding:14px 36px">
                    <a href="${matchUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:inline-block">
                      View Match Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb">
              <p style="color:#9ca3af;font-size:12px;margin:0">Please ensure your team lineup is submitted before the match.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL] Would send to ${to}: ${subject}`);
    console.log(`[EMAIL] HTML content:\n${html}`);
    return { error: null };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend API error:", err);
    return { error: err };
  }

  return { error: null };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { type } = body;

    if (type === "referee-assignment") {
      const { userId, refereeName, refereeId, role, matchId, homeTeam, awayTeam, dateTime, location } = body;

      const { data: user } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
      const userEmail = user?.email;
      if (!userEmail) {
        console.error(`User ${userId} has no email`);
        return new Response(JSON.stringify({ error: "User email not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const html = refereeEmailHtml(refereeName, role, homeTeam, awayTeam, dateTime, location, matchId, refereeId);
      const result = await sendEmail(userEmail, `Match Assignment: ${homeTeam} vs ${awayTeam}`, html);

      return new Response(JSON.stringify({ success: !result.error, error: result.error }), {
        status: result.error ? 500 : 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (type === "new-match") {
      const { userIds, homeTeam, awayTeam, dateTime, location, matchId } = body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return new Response(JSON.stringify({ error: "userIds array is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: users } = await supabase.from("profiles").select("id, name, email").in("id", userIds);
      if (!users) {
        return new Response(JSON.stringify({ error: "No users found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const results = await Promise.allSettled(users.map(u => {
        if (!u.email) return Promise.resolve();
        const html = coachEmailHtml(u.name || "Coach", homeTeam, awayTeam, dateTime, location, matchId);
        return sendEmail(u.email, `New Match: ${homeTeam} vs ${awayTeam}`, html);
      }));

      const errors = results.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason);

      return new Response(JSON.stringify({ success: errors.length === 0, errors }), {
        status: errors.length ? 500 : 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type. Use 'referee-assignment' or 'new-match'." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
