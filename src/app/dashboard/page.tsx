'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, Inbox, Globe, Code2, Search, Plus, ArrowUpRight, ArrowLeft,
  Check, CheckCheck, ChevronDown, Mail, Send, Star, Monitor, MessageSquare,
  ArrowRight, LifeBuoy, Copy, Play, Settings2, LockKeyhole, LogOut, Loader2,
  X, PanelRightClose, PanelRightOpen, Sparkles, AlertCircle
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Website, Conversation, Message } from '@/lib/types';
import { timeAgo, formatTime, initials } from '@/lib/utils';

const initialDemoSites: Website[] = [
  {
    id: 'demo-site-1',
    agent_id: 'agent-1',
    name: 'My Online Store',
    origin: 'https://mystore.example.com',
    color: '#6366f1',
    greeting: 'Hi there! 👋 How can we help you today?',
    position: 'right',
    online: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

const initialDemoChats: Conversation[] = [
  {
    id: 'demo-conv-1',
    site_id: 'demo-site-1',
    visitor_name: 'Sophie Wilson',
    email: 'sophie.wilson@example.com',
    page: 'https://mystore.example.com/checkout',
    status: 'open',
    priority: true,
    unread: 1,
    site_name: 'My Online Store',
    last_message: 'Do you ship to Germany or international addresses?',
    last_sender: 'visitor',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 60000 * 12).toISOString(),
  },
  {
    id: 'demo-conv-2',
    site_id: 'demo-site-1',
    visitor_name: 'James Chen',
    email: 'james.chen@example.com',
    page: 'https://mystore.example.com/pricing',
    status: 'resolved',
    priority: false,
    unread: 0,
    site_name: 'My Online Store',
    last_message: 'Thanks a lot for the discount code, worked like a charm!',
    last_sender: 'visitor',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'demo-conv-3',
    site_id: 'demo-site-1',
    visitor_name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    page: 'https://mystore.example.com/products/pro-suite',
    status: 'open',
    priority: false,
    unread: 0,
    site_name: 'My Online Store',
    last_message: 'I am comparing the Pro plan vs Enterprise. Can I upgrade later?',
    last_sender: 'visitor',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 60000 * 45).toISOString(),
  },
];

const initialDemoMessages: Record<string, Message[]> = {
  'demo-conv-1': [
    {
      id: 'm-1',
      conversation_id: 'demo-conv-1',
      sender: 'visitor',
      kind: 'reply',
      body: 'Hi! I am looking to buy the bundle, but I cannot see international shipping options.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'm-2',
      conversation_id: 'demo-conv-1',
      sender: 'agent',
      kind: 'reply',
      body: 'Hello Sophie! Glad you reached out. Yes, we support DHL Express for global delivery.',
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
    {
      id: 'm-3',
      conversation_id: 'demo-conv-1',
      sender: 'agent',
      kind: 'note',
      body: 'Customer is ready to buy bundle. Offered DHL priority.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'm-4',
      conversation_id: 'demo-conv-1',
      sender: 'visitor',
      kind: 'reply',
      body: 'Do you ship to Germany or international addresses?',
      created_at: new Date(Date.now() - 60000 * 12).toISOString(),
    },
  ],
  'demo-conv-2': [
    {
      id: 'm-21',
      conversation_id: 'demo-conv-2',
      sender: 'visitor',
      kind: 'reply',
      body: 'Thanks a lot for the discount code, worked like a charm!',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ],
  'demo-conv-3': [
    {
      id: 'm-31',
      conversation_id: 'demo-conv-3',
      sender: 'visitor',
      kind: 'reply',
      body: 'I am comparing the Pro plan vs Enterprise. Can I upgrade later?',
      created_at: new Date(Date.now() - 60000 * 45).toISOString(),
    },
  ],
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const configured = isSupabaseConfigured();

  // Navigation
  const [view, setView] = useState<'inbox' | 'websites' | 'widget'>('inbox');
  const [tab, setTab] = useState<'open' | 'resolved' | 'priority' | 'all'>('open');
  const [search, setSearch] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');

  const [authChecking, setAuthChecking] = useState(true);

  // Data states
  const [sites, setSites] = useState<Website[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentUser, setAgentUser] = useState<{ email: string; name: string }>({
    email: '',
    name: 'Support Agent',
  });

  // UI state
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [kind, setKind] = useState<'reply' | 'note'>('reply');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [activeSiteId, setActiveSiteId] = useState<string>('');

  // Site editing
  const [editingSite, setEditingSite] = useState<Partial<Website>>({
    name: '',
    origin: '',
    color: '#6366f1',
    greeting: 'Hi there! 👋 How can we help you today?',
    position: 'right',
    online: true,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load live data
  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/agent');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sites)) {
          setSites(data.sites);
          if (data.sites.length > 0) {
            setActiveSiteId((prev) => {
              const exists = data.sites.some((s: any) => s.id === prev);
              return exists ? prev : data.sites[0].id;
            });
          }
        }
        if (Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          setSelectedId((prev) => {
            if (!prev && data.conversations.length > 0) return data.conversations[0].id;
            const exists = data.conversations.some((c: any) => c.id === prev);
            return exists ? prev : (data.conversations[0]?.id || null);
          });
        }
      } else if (res.status === 401) {
        router.replace('/login');
      }
    } catch {}
  }, [router]);

  // Verify authentication on mount
  useEffect(() => {
    async function checkUser() {
      if (configured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        setAgentUser({
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Support Agent',
        });
        setAuthChecking(false);
        loadData();
      } else {
        setAuthChecking(false);
        loadData();
      }
    }
    checkUser();
  }, [configured, router, supabase, loadData]);

  // Poll for new conversations every 2 seconds
  useEffect(() => {
    if (authChecking) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadData();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [authChecking, loadData]);

  // Fetch messages for selected conversation
  const loadConversationMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/agent?conversation=${encodeURIComponent(convId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch {}
  }, []);

  // Poll for messages in active conversation every 2 seconds
  useEffect(() => {
    if (selectedId) {
      loadConversationMessages(selectedId);
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadConversationMessages(selectedId);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedId, loadConversationMessages]);

  const activeSite = sites.find((s) => s.id === activeSiteId) || sites[0] || initialDemoSites[0];
  const selectedConv = conversations.find((c) => c.id === selectedId);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesTab =
      tab === 'all' ? true :
      tab === 'priority' ? c.priority :
      c.status === tab;
    const matchesSite = selectedSiteFilter === 'all' || c.site_id === selectedSiteFilter;
    const matchesSearch =
      !search.trim() ||
      c.visitor_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.last_message || '').toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSite && matchesSearch;
  });

  // Send message or private note
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedId || !draft.trim() || busy) return;

    const bodyText = draft.trim();
    setDraft('');
    setBusy(true);

    const newMsg: Message = {
      id: 'local-' + Date.now(),
      conversation_id: selectedId,
      sender: 'agent',
      kind: kind,
      body: bodyText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          conversation: selectedId,
          body: bodyText,
          kind: kind,
        }),
      });
      loadConversationMessages(selectedId);
      loadData();
    } catch {}

    setBusy(false);
  };

  // Toggle status / priority
  const updateConversation = async (patch: { status?: 'open' | 'resolved'; priority?: boolean }) => {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, ...patch } : c))
    );

    if (patch.status) {
      showToast(patch.status === 'resolved' ? 'Conversation marked as resolved' : 'Conversation reopened');
    }

    try {
      await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          conversation: selectedId,
          ...patch,
        }),
      });
      loadData();
    } catch {}
  };

  // Save website settings
  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite?.id) return;
    setBusy(true);

    const siteToSave = {
      id: activeSite.id,
      name: editingSite.name || activeSite.name,
      origin: editingSite.origin || activeSite.origin || '*',
      color: editingSite.color || activeSite.color || '#6366f1',
      greeting: editingSite.greeting || activeSite.greeting || 'Hi there!',
      position: (editingSite.position as 'left' | 'right') || 'right',
      online: editingSite.online !== undefined ? Boolean(editingSite.online) : true,
    };

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveSite',
          ...siteToSave,
        }),
      });
      if (res.ok) {
        await loadData();
        showToast('Store settings updated live!');
      } else {
        showToast('Failed to update store.');
      }
    } catch {
      showToast('Error updating store.');
    } finally {
      setBusy(false);
    }
  };

  // Add new website
  const handleAddNewSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveSite',
          name: editingSite.name || 'My Store',
          origin: editingSite.origin || '*',
          color: editingSite.color || '#6366f1',
          greeting: editingSite.greeting || 'Hi there! How can we help?',
          position: 'right',
          online: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadData();
        if (data.id) {
          setActiveSiteId(data.id);
          setEditingSite((prev) => ({ ...prev, id: data.id }));
        }
        setAddSiteOpen(false);
        setView('widget');
        showToast('Store created! You can now copy your widget code below.');
      } else {
        showToast('Failed to create store.');
      }
    } catch {
      showToast('Error creating store.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (configured) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://live-support-chat.vercel.app';
  const embedCode = `<script src="${appOrigin}/widget.js" data-site="${activeSite?.id || ''}" defer></script>`;

  if (authChecking) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
        <p className="text-xs font-medium">Verifying your support workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800">
        {/* Brand */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <MessageCircle size={20} strokeWidth={2.4} />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight">Supportly<span className="text-indigo-400">.</span></span>
              <p className="text-[11px] text-slate-400 leading-none">Live Chat Suite</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 px-3 mb-1.5">
              WORKSPACE
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => setView('inbox')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${
                  view === 'inbox'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox size={18} />
                  <span>Inbox</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  view === 'inbox' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {conversations.filter((c) => c.status === 'open').length}
                </span>
              </button>

              <button
                onClick={() => setView('websites')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  view === 'websites'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Globe size={18} />
                <span>Websites</span>
              </button>

              <button
                onClick={() => setView('widget')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  view === 'widget'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Code2 size={18} />
                <span>Chat Widget</span>
              </button>
            </nav>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 px-3 mb-1.5">
              QUICK ACCESS
            </div>
            <nav className="space-y-1 text-sm">
              <button
                onClick={() => { setView('inbox'); setTab('priority'); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <Star size={16} className="text-amber-400" />
                <span>Priority chats</span>
              </button>
              <button
                onClick={() => { setView('inbox'); setTab('resolved'); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <CheckCheck size={16} className="text-emerald-400" />
                <span>Resolved</span>
              </button>
            </nav>
          </div>

          {/* Connect Website Card */}
          <div className="p-3.5 bg-gradient-to-br from-indigo-950/60 to-slate-800/60 rounded-2xl border border-indigo-900/40 text-left">
            <div className="flex items-center gap-2 text-indigo-400 mb-1.5">
              <Sparkles size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Embed Anywhere</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Add Supportly to any website with a single snippet tag.
            </p>
            <button
              onClick={() => { setEditingSite({ name: '', origin: '', color: '#6366f1', greeting: 'Hi there!' }); setAddSiteOpen(true); }}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <span>Connect site</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* User profile footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">
              {initials(agentUser.name)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">{agentUser.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{agentUser.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200 px-6 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-900 capitalize">{view}</span>
            <span>/</span>
            <span className="text-slate-500">Live Support Workspace</span>
          </div>

          <div className="flex items-center gap-3">
            {!configured && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-full font-medium">
                <AlertCircle size={13} />
                Demo Sandbox
              </span>
            )}
            <button
              onClick={() => setTestModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-xl border border-indigo-200 transition"
            >
              <Play size={13} />
              <span>Test Widget Live</span>
            </button>
          </div>
        </header>

        {/* ── INBOX VIEW ──────────────────────────────────── */}
        {view === 'inbox' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Conversation list column */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 flex-shrink-0">
              {/* Filter tabs */}
              <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-100 rounded-xl text-xs border border-transparent focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                  />
                </div>

                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  {(['open', 'resolved', 'all'] as const).map((tabKey) => (
                    <button
                      key={tabKey}
                      onClick={() => setTab(tabKey)}
                      className={`flex-1 py-1 rounded-lg capitalize transition ${
                        tab === tabKey ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tabKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation items */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Inbox size={32} className="mx-auto mb-2 opacity-50" />
                    No conversations found.
                  </div>
                ) : (
                  filteredConversations.map((c) => {
                    const isSelected = selectedId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full p-3.5 text-left flex items-start gap-3 transition ${
                          isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {initials(c.visitor_name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-slate-900 text-xs truncate">
                              {c.visitor_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {timeAgo(c.updated_at)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 truncate mb-1">
                            {c.last_sender === 'agent' && <span className="font-medium text-indigo-600">You: </span>}
                            {c.last_message || 'New conversation'}
                          </p>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-200/60 rounded text-slate-600 truncate max-w-[120px]">
                              <Globe size={10} />
                              {c.site_name || 'Website'}
                            </span>
                            {c.priority && <Star size={11} className="text-amber-500 fill-amber-500" />}
                            {c.status === 'resolved' && <CheckCheck size={12} className="text-emerald-500" />}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Conversation active thread */}
            {selectedConv ? (
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* Chat Header */}
                <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                      {initials(selectedConv.visitor_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-slate-900 text-sm">{selectedConv.visitor_name}</h2>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          selectedConv.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {selectedConv.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Globe size={11} />
                        {selectedConv.site_name || 'Connected site'}
                        <span>•</span>
                        <span>{selectedConv.email || 'Visitor'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateConversation({ priority: !selectedConv.priority })}
                      className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition ${
                        selectedConv.priority
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Star size={15} className={selectedConv.priority ? 'fill-amber-500' : ''} />
                    </button>

                    <button
                      onClick={() => updateConversation({ status: selectedConv.status === 'open' ? 'resolved' : 'open' })}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
                        selectedConv.status === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {selectedConv.status === 'open' ? (
                        <>
                          <Check size={14} />
                          <span>Resolve</span>
                        </>
                      ) : (
                        <>
                          <Inbox size={14} />
                          <span>Reopen</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setDetailsOpen(!detailsOpen)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                    >
                      {detailsOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                    </button>
                  </div>
                </div>

                {/* Messages scroll area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                  <div className="text-center my-2">
                    <span className="text-[11px] text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                      Conversation started with {selectedConv.visitor_name}
                    </span>
                  </div>

                  {messages.map((m) => {
                    const isAgent = m.sender === 'agent';
                    const isBot = m.sender === 'bot';
                    const isNote = m.kind === 'note';

                    if (isNote) {
                      return (
                        <div key={m.id} className="max-w-md mx-auto my-2 p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-900 shadow-sm">
                          <div className="flex items-center gap-1 font-semibold text-amber-700 mb-1">
                            <LockKeyhole size={12} />
                            <span>Private Internal Note</span>
                            <span className="text-[10px] text-amber-500 ml-auto">{formatTime(m.created_at)}</span>
                          </div>
                          <p>{m.body}</p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 max-w-lg ${
                          isAgent ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            isAgent
                              ? 'bg-indigo-600 text-white'
                              : isBot
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isAgent ? initials(agentUser.name) : isBot ? 'AI' : initials(selectedConv.visitor_name)}
                        </div>

                        <div>
                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                              isAgent
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : isBot
                                ? 'bg-purple-50 text-purple-950 border border-purple-200 rounded-tl-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }`}
                          >
                            {isBot && (
                              <div className="flex items-center gap-1 text-[10px] text-purple-600 font-semibold mb-1">
                                <Sparkles size={11} />
                                <span>Supportly AI Bot</span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{m.body}</p>
                          </div>
                          <div className={`text-[10px] text-slate-400 mt-1 px-1 ${isAgent ? 'text-right' : ''}`}>
                            {formatTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer area */}
                <div className="border-t border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    {/* Mode toggles */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs">
                      <button
                        onClick={() => setKind('reply')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
                          kind === 'reply' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <MessageSquare size={13} />
                        <span>Reply</span>
                      </button>
                      <button
                        onClick={() => setKind('note')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
                          kind === 'note' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <LockKeyhole size={13} />
                        <span>Private Note</span>
                      </button>
                    </div>

                    {/* Quick replies dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setQuickRepliesOpen(!quickRepliesOpen)}
                        className="text-xs text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                      >
                        <span>Quick templates</span>
                        <ChevronDown size={13} />
                      </button>

                      {quickRepliesOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20 text-xs">
                          {[
                            'Hi there! Thanks for reaching out. How can I help you today?',
                            'Thanks for your patience! I am looking into this right now.',
                            'Could you please share your order ID or screenshot?',
                            'You are all set! Let me know if there is anything else I can do.',
                          ].map((text, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setDraft(text);
                                setQuickRepliesOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 transition"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Textarea */}
                  <form onSubmit={handleSend} className="space-y-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={
                        kind === 'note'
                          ? 'Add a private note for your team (visitor will NOT see this)...'
                          : `Reply to ${selectedConv.visitor_name}... (Press Enter to send)`
                      }
                      rows={3}
                      className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-2 transition resize-none ${
                        kind === 'note'
                          ? 'bg-amber-50/50 border-amber-200 focus:ring-amber-400 text-amber-900'
                          : 'bg-white border-slate-200 focus:ring-indigo-500 focus:border-transparent text-slate-800'
                      }`}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Shift + Enter for new line • Enter to send
                      </span>

                      <button
                        type="submit"
                        disabled={!draft.trim() || busy}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition shadow-sm ${
                          kind === 'note'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
                        }`}
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        <span>{kind === 'note' ? 'Save Note' : 'Send Reply'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : sites.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <Globe size={32} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Welcome to your Support Workspace!</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-5 leading-relaxed">
                  You haven&apos;t connected a store yet. Click below to add your store name, website URL, and get your live chat widget snippet.
                </p>
                <button
                  onClick={() => {
                    setEditingSite({ name: '', origin: '', color: '#6366f1', greeting: 'Hi there! 👋 How can we help?' });
                    setAddSiteOpen(true);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 transition"
                >
                  <Plus size={16} />
                  <span>Connect Your First Store</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageCircle size={40} className="mb-3 opacity-40 text-slate-400" />
                <h3 className="font-semibold text-slate-700 text-sm">Select a conversation</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Choose an open conversation from the left to start replying, or use the widget tester to start a new chat.
                </p>
              </div>
            )}

            {/* Visitor Details sidebar */}
            {selectedConv && detailsOpen && (
              <div className="w-72 border-l border-slate-200 bg-white p-5 flex flex-col flex-shrink-0 overflow-y-auto space-y-6">
                <div className="text-center pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg flex items-center justify-center mx-auto mb-2 shadow-inner">
                    {initials(selectedConv.visitor_name)}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedConv.visitor_name}</h3>
                  <p className="text-xs text-slate-400">Website Visitor</p>
                  {selectedConv.email && (
                    <a
                      href={`mailto:${selectedConv.email}`}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-indigo-600 hover:underline"
                    >
                      <Mail size={13} />
                      <span>{selectedConv.email}</span>
                    </a>
                  )}
                </div>

                <div>
                  <h4 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2.5">
                    Visitor Session
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">CURRENT URL</span>
                      <span className="text-slate-700 font-medium truncate block" title={selectedConv.page}>
                        {selectedConv.page || 'Direct / Landing'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CONNECTED WEBSITE</span>
                      <span className="text-slate-700 font-medium">{selectedConv.site_name || 'Store'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">STARTED AT</span>
                      <span className="text-slate-700 font-medium">
                        {new Date(selectedConv.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 flex items-start gap-2">
                  <LockKeyhole size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px]">Visitor details are protected and only visible to authorized agents.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WEBSITES VIEW ───────────────────────────────── */}
        {view === 'websites' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Your Websites</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Manage connected domains and chat widgets.</p>
                </div>
                <button
                  onClick={() => { setEditingSite({ name: '', origin: '', color: '#6366f1', greeting: 'Hi there!' }); setAddSiteOpen(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <Plus size={15} />
                  <span>Connect Website</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sites.map((site) => (
                  <div
                    key={site.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: site.color || '#6366f1' }}
                        >
                          <Globe size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{site.name}</h3>
                          <p className="text-xs text-slate-400">{site.origin}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        site.online ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {site.online ? 'Online' : 'Away'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Greeting:</span>
                        <span className="font-medium truncate max-w-[200px]">{site.greeting}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Position:</span>
                        <span className="font-medium capitalize">{site.position} bottom</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setActiveSiteId(site.id);
                          setEditingSite(site);
                          setView('widget');
                        }}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
                      >
                        <Settings2 size={13} />
                        <span>Customize Widget</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveSiteId(site.id);
                          setTestModalOpen(true);
                        }}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1 transition"
                      >
                        <Play size={13} />
                        <span>Test</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT WIDGET CUSTOMIZER VIEW ─────────────────── */}
        {view === 'widget' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Chat Widget Customizer</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Customize appearance, colors, and grab your embed script tag.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Customizer Form */}
                <form onSubmit={handleSaveSite} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Settings2 size={16} className="text-indigo-600" />
                      <span>Widget Appearance</span>
                    </h2>
                    <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                      ID: {activeSite?.id}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Select Store / Client Website</label>
                    <select
                      value={activeSiteId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setActiveSiteId(sId);
                        const found = sites.find((s) => s.id === sId);
                        if (found) setEditingSite(found);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Store / Business Name</label>
                    <input
                      type="text"
                      value={editingSite.name || ''}
                      onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Website URL (Origin)</label>
                    <input
                      type="text"
                      value={editingSite.origin || ''}
                      onChange={(e) => setEditingSite({ ...editingSite, origin: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Welcome Greeting</label>
                    <textarea
                      value={editingSite.greeting || ''}
                      onChange={(e) => setEditingSite({ ...editingSite, greeting: e.target.value })}
                      required
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Brand Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingSite.color || '#6366f1'}
                          onChange={(e) => setEditingSite({ ...editingSite, color: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          value={editingSite.color || '#6366f1'}
                          onChange={(e) => setEditingSite({ ...editingSite, color: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Position</label>
                      <select
                        value={editingSite.position || 'right'}
                        onChange={(e) => setEditingSite({ ...editingSite, position: e.target.value as 'left' | 'right' })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="right">Bottom Right</option>
                        <option value="left">Bottom Left</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Available for Live Chat</span>
                      <span className="text-[11px] text-slate-400">When away, visitors can leave offline messages</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingSite.online !== false}
                      onChange={(e) => setEditingSite({ ...editingSite, online: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Save Changes</span>
                  </button>

                  {/* Embed Snippet */}
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                      <Code2 size={14} />
                      <span>Install on your website</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Paste this script snippet before the closing <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag of your website:
                    </p>
                    <div className="relative">
                      <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] overflow-x-auto font-mono">
                        {embedCode}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(embedCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs flex items-center gap-1 transition"
                      >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Live Widget Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Monitor size={15} />
                      <span>Live Widget Preview</span>
                    </span>
                    <button
                      onClick={() => setTestModalOpen(true)}
                      className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Play size={12} />
                      <span>Test interactive demo</span>
                    </button>
                  </div>

                  <div className="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                    {/* Widget Header Mockup */}
                    <div
                      className="p-4 text-white flex items-center justify-between"
                      style={{ backgroundColor: editingSite.color || '#6366f1' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                          <MessageCircle size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs">{editingSite.name || 'Support Team'}</h4>
                          <p className="text-[10px] opacity-80">
                            {editingSite.online !== false ? 'Active & ready to help' : 'Away • Leave a message'}
                          </p>
                        </div>
                      </div>
                      <X size={16} className="opacity-80" />
                    </div>

                    {/* Widget Body Mockup */}
                    <div className="p-4 space-y-3 bg-slate-50/70 text-xs">
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-700">
                        <p className="font-semibold text-slate-900 mb-1">👋 Welcome!</p>
                        <p>{editingSite.greeting || 'How can we help you today?'}</p>
                      </div>

                      <div className="space-y-2 pt-1">
                        <input
                          disabled
                          placeholder="Your name"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400"
                        />
                        <input
                          disabled
                          placeholder="Email address"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400"
                        />
                        <textarea
                          disabled
                          rows={2}
                          placeholder="How can we help?"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 resize-none"
                        />
                      </div>

                      <button
                        disabled
                        className="w-full py-2 text-white rounded-xl font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: editingSite.color || '#6366f1' }}
                      >
                        <span>Start Conversation</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <div className="p-2 text-center text-[10px] text-slate-400 border-t border-slate-100 bg-white">
                      Powered by Supportly Live Chat
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── ADD WEBSITE DIALOG ───────────────────────────── */}
      {addSiteOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Connect a Website</h3>
              </div>
              <button onClick={() => setAddSiteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewSite} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Website Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My SaaS App"
                  value={editingSite.name || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Website URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={editingSite.origin || ''}
                  onChange={(e) => setEditingSite({ ...editingSite, origin: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddSiteOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  Create Widget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TEST WIDGET MODAL ────────────────────────────── */}
      {testModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full h-[550px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Interactive Live Chat Tester</h3>
                <p className="text-xs text-slate-500">Test how a visitor interacts with your live widget</p>
              </div>
              <button onClick={() => setTestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={`/test?site=${encodeURIComponent(activeSite.id)}`}
                className="w-full h-full border-0"
                title="Widget Test Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <Check size={14} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
