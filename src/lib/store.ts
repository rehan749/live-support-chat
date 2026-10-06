import type { Website, Conversation, Message } from "./types";

interface MockDatabase {
  sites: Map<string, Website>;
  conversations: Map<string, Conversation>;
  messages: Map<string, Message[]>;
}

declare global {
  var __liveChatMockDb: MockDatabase | undefined;
}

if (!globalThis.__liveChatMockDb) {
  const defaultSite: Website = {
    id: "demo-site-1",
    agent_id: "agent-1",
    name: "My Online Store",
    origin: "http://localhost",
    color: "#6366f1",
    greeting: "Hi there! 👋 How can we help you today?",
    position: "right",
    online: true,
    created_at: new Date().toISOString(),
  };

  const initialSites = new Map<string, Website>();
  initialSites.set(defaultSite.id, defaultSite);

  const initialConversations = new Map<string, Conversation>();
  const initialMessages = new Map<string, Message[]>();

  globalThis.__liveChatMockDb = {
    sites: initialSites,
    conversations: initialConversations,
    messages: initialMessages,
  };
}

const db = globalThis.__liveChatMockDb!;

export const mockStore = {
  getSite(id: string): Website | null {
    if (db.sites.has(id)) return db.sites.get(id)!;
    // Auto-create site on the fly if test/custom site id is passed so it NEVER 404s!
    const newSite: Website = {
      id,
      agent_id: "agent-1",
      name: "Connected Website",
      origin: "*",
      color: "#6366f1",
      greeting: "Hello! Welcome to our support chat.",
      position: "right",
      online: true,
      created_at: new Date().toISOString(),
    };
    db.sites.set(id, newSite);
    return newSite;
  },

  getAllSites(): Website[] {
    return Array.from(db.sites.values());
  },

  saveSite(site: Partial<Website> & { id?: string; name: string }): Website {
    const id = site.id || "site-" + Date.now();
    const existing = db.sites.get(id);
    const updated: Website = {
      id,
      agent_id: "agent-1",
      name: site.name,
      origin: site.origin || "*",
      color: site.color || "#6366f1",
      greeting: site.greeting || "Hi there!",
      position: (site.position as "left" | "right") || "right",
      online: site.online !== undefined ? Boolean(site.online) : true,
      created_at: existing ? existing.created_at : new Date().toISOString(),
    };
    db.sites.set(id, updated);
    return updated;
  },

  getAllConversations(): (Conversation & { site_name?: string; last_message?: string; last_sender?: string })[] {
    const list = Array.from(db.conversations.values());
    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return list.map((c) => {
      const site = db.sites.get(c.site_id);
      const msgs = db.messages.get(c.id) || [];
      const last = msgs[msgs.length - 1];
      return {
        ...c,
        site_name: site?.name || "Website",
        last_message: last?.body || "",
        last_sender: last?.sender || "visitor",
      };
    });
  },

  getConversation(id: string): Conversation | null {
    return db.conversations.get(id) || null;
  },

  startConversation(data: {
    site_id: string;
    visitor_name: string;
    email: string;
    page: string;
    message?: string;
  }): { conversation_id: string; token: string } {
    const convId = "conv-" + Date.now();
    const token = "tok-" + Math.random().toString(36).substring(2, 12);
    const site = this.getSite(data.site_id);

    const conv: Conversation = {
      id: convId,
      site_id: data.site_id,
      visitor_name: data.visitor_name || "Visitor",
      email: data.email || "",
      page: data.page || "",
      status: "open",
      priority: false,
      unread: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site_name: site?.name || "Website",
      last_message: data.message || "",
      last_sender: "visitor",
    };

    db.conversations.set(convId, conv);
    db.messages.set(convId, []);

    if (data.message && data.message.trim()) {
      this.addMessage({
        conversation_id: convId,
        sender: "visitor",
        kind: "reply",
        body: data.message.trim(),
      });
    }

    return { conversation_id: convId, token };
  },

  addMessage(data: {
    conversation_id: string;
    sender: "visitor" | "agent" | "bot";
    kind: "reply" | "note";
    body: string;
  }): Message {
    const msgs = db.messages.get(data.conversation_id) || [];
    const msg: Message = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      conversation_id: data.conversation_id,
      sender: data.sender,
      kind: data.kind,
      body: data.body,
      created_at: new Date().toISOString(),
    };
    msgs.push(msg);
    db.messages.set(data.conversation_id, msgs);

    const conv = db.conversations.get(data.conversation_id);
    if (conv) {
      conv.updated_at = new Date().toISOString();
      if (data.sender === "visitor") {
        conv.unread = (conv.unread || 0) + 1;
      }
      conv.last_message = data.body;
      conv.last_sender = data.sender;
    }

    return msg;
  },

  getMessages(conversation_id: string): Message[] {
    return db.messages.get(conversation_id) || [];
  },

  updateConversation(id: string, patch: Partial<Conversation>): boolean {
    const conv = db.conversations.get(id);
    if (!conv) return false;
    Object.assign(conv, patch);
    return true;
  },
};
