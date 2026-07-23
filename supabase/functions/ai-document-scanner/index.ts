import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("anthropic_api_key");
const MODEL = "claude-sonnet-5";

const PROMPT = `אתה מערכת לחילוץ נתונים מקורות חיים (תחום דנטלי, ישראל).
עבור כל שדה בסכימה — חלץ את הערך מהטקסט. אם הערך לא מופיע, החזר null.
חלץ ביסודיות — שם פרטי, שם משפחה, כותרת, מעסיק, השכלה, קורסים ושפות בדרך כלל מופיעים.
אסור להמציא, להסיק או להשלים עובדות שלא כתובות במסמך. כאשר שדה לא נמצא — החזר null.
city_name ושפות מוחזרים כשמות בטקסט בלבד. אין להחזיר מזהי מילון.
סכימה:
{
  "first_name": string|null,
  "last_name": string|null,
  "phone": string|null,
  "email": string|null,
  "professional_title": string|null,
  "personal_summary": string|null (ניסוח מקצועי על בסיס עובדות מפורשות במסמך בלבד),
  "languages": string|null,
  "academic_education": string|null,
  "professional_courses": string|null,
  "current_employer": string|null,
  "previous_employers": array|null ([{"name","role","years","description"}]),
  "salary_expectation_monthly": number|null,
  "salary_expectation_hourly": number|null,
  "additional_skills_notes": string|null,
  "city_name": string|null
}
החזר JSON תקין בלבד עם כל המפתחות. ללא markdown. ללא הסברים.`;

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
  const t = blocks.find((b: any) => b?.type === "text" && typeof b?.text === "string")?.text ?? "";
  return t.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
}

function stripEmpty(obj: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = v;
    }
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { fileText, base64, mediaType, fileName, token } = await req.json();
    if (!(await authorized(req, token))) return json({ error: "unauthorized" }, 403);
    if (!fileText && !base64) return json({ error: "חסר תוכן קובץ" }, 400);

    const nameLine = fileName ? `\nשם הקובץ: ${fileName}` : "";

    let content: unknown[];
    if (base64) {
      // PDF must be sent as a `document` block — the Anthropic API rejects
      // application/pdf inside an `image` block.
      if (mediaType === "application/pdf") {
        content = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: PROMPT + nameLine },
        ];
      } else if (typeof mediaType === "string" && mediaType.startsWith("image/")) {
        content = [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT + nameLine },
        ];
      } else {
        // Preserve the previous permissive default for callers that omit mediaType.
        content = [
          { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: base64 } },
          { type: "text", text: PROMPT + nameLine },
        ];
      }
    } else {
      content = [{ type: "text", text: PROMPT + nameLine + "\n\n---\nטקסט קורות החיים:\n" + fileText }];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 3000, messages: [{ role: "user", content }] }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return json({ error: `Anthropic error: ${response.status}`, details: errText }, 502);
    }

    const result = await response.json();
    const text = extractText(result);
    let parsed;
    try { parsed = stripEmpty(JSON.parse(text || "{}")); } catch { parsed = { raw: text }; }
    return json(parsed);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
