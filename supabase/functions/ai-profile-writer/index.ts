// Snapshot of the deployed ai-profile-writer (Supabase version 4, ACTIVE).
// Committed for traceability only — identical to what runs in production.
// The 2026-07-22 Contact 360 package proposed a variant that removed the
// authorization gate and downgraded the model; it was rejected. See
// docs/edge-functions-delta-2026-07-23.md.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("anthropic_api_key");
const MODEL = "claude-sonnet-5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function authorized(req: Request, token: unknown): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL")!;
  if (typeof token === "string" && token.trim() !== "") {
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data } = await admin.from("contact").select("contact_id").eq("profile_token", token).maybeSingle();
    if (data) return true;
  }
  const auth = req.headers.get("Authorization");
  if (auth) {
    const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await client.auth.getUser();
    if (user) return true;
  }
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
}

function extractText(result: any): string {
  const blocks = Array.isArray(result?.content) ? result.content : [];
  const t = blocks.find((b: any) => b?.type === "text" && typeof b?.text === "string" && b.text.trim() !== "")?.text ?? "";
  return t.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { currentData, userInput, token } = await req.json();
    if (!(await authorized(req, token))) return json({ error: "unauthorized" }, 403);
    if (!userInput || typeof userInput !== "string") return json({ error: "חסר טקסט" }, 400);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: `אתה מומחה גיוס דנטלי ישראלי ועורך תוכן מקצועי.
המידע הקיים בפרופיל:
${JSON.stringify({
  professional_title: currentData?.professional_title,
  personal_summary: currentData?.personal_summary,
  current_employer: currentData?.current_employer,
  previous_employers: currentData?.previous_employers,
  academic_education: currentData?.academic_education,
  professional_courses: currentData?.professional_courses,
  additional_skills_notes: currentData?.additional_skills_notes,
  languages: currentData?.languages,
})}

מידע חדש שהוסיף המועמד:
${userInput}

משימתך:
1. שלב את המידע הקיים עם המידע החדש
2. שדרג את הניסוח לשפה מקצועית ומרשימה
3. הוסף מספרים קונקרטיים היכן שניתן להסיק
4. החזר JSON בלבד:
{
  "professional_title": string,
  "personal_summary": string (3-4 משפטים שיווקיים בגוף ראשון),
  "previous_employers": [{"name": string, "role": string, "years": string, "description": string}],
  "current_employer": string,
  "academic_education": string,
  "professional_courses": string,
  "additional_skills_notes": string,
  "languages": string
}
החזר JSON בלבד. ללא markdown. ללא הסברים.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return json({ error: `Anthropic error: ${response.status}`, details: errText }, 502);
    }

    const result = await response.json();
    const text = extractText(result);
    let parsed;
    try { parsed = JSON.parse(text || "{}"); } catch { parsed = { raw: text }; }
    return json(parsed);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
