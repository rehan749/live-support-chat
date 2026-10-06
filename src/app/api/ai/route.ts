import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const validUrl = url && (url.startsWith("http://") || url.startsWith("https://")) && !url.includes("your_supabase")
    ? url
    : "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient(validUrl, key);
}

export async function POST(req: Request) {
  try {
    const { conversation_id, message, site_greeting } = await req.json();
    const supabase = serviceClient();

    // Get recent conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("sender, body")
      .eq("conversation_id", conversation_id)
      .eq("kind", "reply")
      .order("created_at", { ascending: true })
      .limit(10);

    const chatHistory = (history || []).map((m) => ({
      role: m.sender === "visitor" ? ("user" as const) : ("assistant" as const),
      content: m.body,
    }));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes("your_openai")) {
      return NextResponse.json({ ok: true, notice: "OpenAI key not configured" });
    }
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a friendly and helpful live chat support agent. Keep replies concise and helpful. 
Your greeting style: "${site_greeting}". 
Always be professional, empathetic, and solution-focused.
If you cannot resolve an issue, politely let the visitor know a human agent will follow up.`,
        },
        ...chatHistory,
        { role: "user", content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) return NextResponse.json({ ok: true });

    // Insert AI reply as bot message
    await supabase.from("messages").insert({
      conversation_id,
      sender: "bot",
      kind: "reply",
      body: reply,
    });

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("AI reply error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
