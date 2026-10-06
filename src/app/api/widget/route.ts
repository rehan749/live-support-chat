import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { mockStore } from "@/lib/store";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const validUrl =
    url && (url.startsWith("http://") || url.startsWith("https://")) && !url.includes("your_supabase")
      ? url
      : "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient(validUrl, key);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const siteId = url.searchParams.get("site");
  const convId = url.searchParams.get("conversation");
  const token = url.searchParams.get("token");

  if (!siteId) {
    return NextResponse.json({ error: "Missing site ID" }, { status: 400, headers: corsHeaders() });
  }

  // Fallback to in-memory store if Supabase not configured
  if (!isSupabaseConfigured()) {
    if (!convId) {
      const site = mockStore.getSite(siteId);
      return NextResponse.json({ site }, { headers: corsHeaders() });
    }
    const messages = mockStore.getMessages(convId);
    return NextResponse.json({ messages }, { headers: corsHeaders() });
  }

  // Supabase connected mode
  try {
    const supabase = serviceClient();

    if (!convId) {
      const { data: site } = await supabase
        .from("websites")
        .select("id, name, color, greeting, position, online")
        .eq("id", siteId)
        .single();

      // If site not found in Supabase, fall back to mock site so it never breaks
      const finalSite = site || mockStore.getSite(siteId);
      return NextResponse.json({ site: finalSite }, { headers: corsHeaders() });
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
    }

    const { data: conv } = await supabase
      .from("conversations")
      .select("id, visitor_token")
      .eq("id", convId)
      .single();

    if (!conv || conv.visitor_token !== token) {
      // Check mock store fallback
      const mockConv = mockStore.getConversation(convId);
      if (mockConv) {
        return NextResponse.json({ messages: mockStore.getMessages(convId) }, { headers: corsHeaders() });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
    }

    const { data: messages } = await supabase
      .from("messages")
      .select("id, sender, body, file_url, created_at")
      .eq("conversation_id", convId)
      .neq("kind", "note")
      .order("created_at", { ascending: true });

    return NextResponse.json({ messages: messages || [] }, { headers: corsHeaders() });
  } catch (e: any) {
    const messages = mockStore.getMessages(convId || "");
    return NextResponse.json({ messages }, { headers: corsHeaders() });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, site_id } = body;

    if (!site_id) {
      return NextResponse.json({ error: "Missing site_id" }, { status: 400, headers: corsHeaders() });
    }

    // If Supabase is not configured, handle via Mock Store
    if (!isSupabaseConfigured()) {
      if (action === "start") {
        const { visitor_name, email, page, message } = body;
        const res = mockStore.startConversation({
          site_id,
          visitor_name,
          email,
          page,
          message,
        });
        return NextResponse.json(res, { status: 201, headers: corsHeaders() });
      }

      if (action === "message") {
        const { conversation_id, message } = body;
        const msg = mockStore.addMessage({
          conversation_id,
          sender: "visitor",
          kind: "reply",
          body: message,
        });
        return NextResponse.json({ id: msg.id }, { headers: corsHeaders() });
      }

      return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: corsHeaders() });
    }

    // Supabase connected mode
    const supabase = serviceClient();

    // Verify site exists
    let { data: site } = await supabase
      .from("websites")
      .select("id, origin, ai_enabled, greeting")
      .eq("id", site_id)
      .single();

    // Fallback if site doesn't exist in Supabase
    if (!site) {
      const mockSite = mockStore.getSite(site_id);
      if (action === "start") {
        const res = mockStore.startConversation(body);
        return NextResponse.json(res, { status: 201, headers: corsHeaders() });
      }
      if (action === "message") {
        const msg = mockStore.addMessage({
          conversation_id: body.conversation_id,
          sender: "visitor",
          kind: "reply",
          body: body.message,
        });
        return NextResponse.json({ id: msg.id }, { headers: corsHeaders() });
      }
    }

    if (action === "start") {
      const { visitor_name, email, page, message } = body;
      const token = crypto.randomUUID();

      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          site_id,
          visitor_name: visitor_name || "Visitor",
          email: email || "",
          visitor_token: token,
          page: page || "",
        })
        .select("id")
        .single();
      if (convErr) throw convErr;

      if (message?.trim()) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender: "visitor",
          kind: "reply",
          body: message.trim(),
        });
      }

      if (site?.ai_enabled && message?.trim()) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation_id: conv.id, message: message.trim(), site_greeting: site.greeting }),
          });
        } catch {}
      }

      return NextResponse.json({ conversation_id: conv.id, token }, { status: 201, headers: corsHeaders() });
    }

    if (action === "message") {
      const { conversation_id, token, message, file_url } = body;

      const { data: conv } = await supabase
        .from("conversations")
        .select("id, visitor_token, site_id")
        .eq("id", conversation_id)
        .single();

      if (!conv || conv.visitor_token !== token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
      }

      const { data: msg, error } = await supabase
        .from("messages")
        .insert({ conversation_id, sender: "visitor", kind: "reply", body: message, file_url: file_url || null })
        .select("id")
        .single();
      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString(), unread: 1 })
        .eq("id", conversation_id);

      if (site?.ai_enabled) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation_id, message, site_greeting: site.greeting }),
          });
        } catch {}
      }

      return NextResponse.json({ id: msg.id }, { headers: corsHeaders() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: corsHeaders() });
  } catch (e: any) {
    console.error("Widget POST error:", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500, headers: corsHeaders() });
  }
}
