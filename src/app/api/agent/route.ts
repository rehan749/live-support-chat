import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { mockStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET — fetch sites + conversations (agent dashboard)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversation");

    // Local sandbox mode (if Supabase not configured in .env)
    if (!isSupabaseConfigured()) {
      if (conversationId) {
        const messages = mockStore.getMessages(conversationId);
        return NextResponse.json({ messages });
      }
      return NextResponse.json({
        sites: mockStore.getAllSites(),
        conversations: mockStore.getAllConversations(),
      });
    }

    // Production Supabase mode
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch messages for a specific conversation
    if (conversationId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, websites!inner(agent_id)")
        .eq("id", conversationId)
        .single();

      if (!conv || (conv.websites as any)?.agent_id !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      return NextResponse.json({ messages: messages || [] });
    }

    // Fetch ONLY this agent's websites
    const { data: userSites } = await supabase
      .from("websites")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at");

    const sites = userSites || [];
    const siteIds = sites.map((s) => s.id);

    let conversations: any[] = [];
    if (siteIds.length > 0) {
      const { data } = await supabase
        .from("conversations")
        .select(`
          id, site_id, visitor_name, email, page, status, priority, unread, created_at, updated_at,
          websites(name)
        `)
        .in("site_id", siteIds)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (data && data.length > 0) {
        for (const c of data) {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("body, sender")
            .eq("conversation_id", c.id)
            .eq("kind", "reply")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          conversations.push({
            ...c,
            site_name: (c.websites as any)?.name,
            last_message: lastMsg?.body || "",
            last_sender: lastMsg?.sender || "visitor",
          });
        }
      }
    }

    return NextResponse.json({ sites, conversations });
  } catch (e: any) {
    console.error("Agent GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — agent actions (saveSite, message, update)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Local sandbox mode
    if (!isSupabaseConfigured()) {
      if (action === "saveSite") {
        const saved = mockStore.saveSite(body);
        return NextResponse.json({ id: saved.id });
      }
      if (action === "message") {
        const msg = mockStore.addMessage({
          conversation_id: body.conversation,
          sender: "agent",
          kind: body.kind || "reply",
          body: body.body,
        });
        return NextResponse.json({ id: msg.id }, { status: 201 });
      }
      if (action === "update") {
        mockStore.updateConversation(body.conversation, {
          status: body.status,
          priority: body.priority,
          unread: body.read ? 0 : undefined,
        });
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Production Supabase mode
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Save / Update a website ──────────────────────────────
    if (action === "saveSite") {
      const payload = {
        agent_id: user.id, // Strictly tied to logged-in client
        name: body.name,
        origin: body.origin || "*",
        color: body.color || "#6366f1",
        greeting: body.greeting || "Hi there! How can we help?",
        position: body.position || "right",
        online: body.online !== false,
        ai_enabled: body.ai_enabled ?? false,
      };

      if (body.id && !body.id.startsWith("site-") && !body.id.startsWith("demo-")) {
        const { error } = await supabase
          .from("websites")
          .update(payload)
          .eq("id", body.id)
          .eq("agent_id", user.id);
        if (error) throw error;
        return NextResponse.json({ id: body.id });
      } else {
        const { data, error } = await supabase
          .from("websites")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return NextResponse.json({ id: data.id }, { status: 201 });
      }
    }

    // ── Send agent message / note ────────────────────────────
    if (action === "message") {
      const { conversation, body: msgBody, kind } = body;

      // Verify ownership
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, websites!inner(agent_id)")
        .eq("id", conversation)
        .single();

      if (!conv || (conv.websites as any)?.agent_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const { data: msg, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation,
          sender: "agent",
          kind: kind || "reply",
          body: msgBody,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString(), unread: 0 })
        .eq("id", conversation);

      return NextResponse.json({ id: msg.id }, { status: 201 });
    }

    // ── Update conversation (status, priority, read) ─────────
    if (action === "update") {
      const { conversation, status, priority, read } = body;

      // Verify ownership
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, websites!inner(agent_id)")
        .eq("id", conversation)
        .single();

      if (!conv || (conv.websites as any)?.agent_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const patch: any = {};
      if (status !== undefined) patch.status = status;
      if (priority !== undefined) patch.priority = priority;
      if (read) patch.unread = 0;

      if (Object.keys(patch).length > 0) {
        await supabase.from("conversations").update(patch).eq("id", conversation);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("Agent POST error:", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
