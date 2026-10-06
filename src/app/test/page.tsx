'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, ShieldCheck, Zap, Star } from 'lucide-react';

function TestContent() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('site') || 'demo-site-1';
  const [, setLoaded] = useState(false);

  useEffect(() => {
    // Dynamically inject widget.js for this test page
    const existing = document.getElementById('supportly-widget-script');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'supportly-widget-script';
    script.src = '/widget.js';
    script.setAttribute('data-site', siteId);
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);

    return () => {
      const el = document.getElementById('supportly-widget-script');
      if (el) el.remove();
    };
  }, [siteId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mock Store Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <ShoppingBag size={18} />
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">Acme Online Store</span>
        </div>
        <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          Demo External Website (Testing Widget)
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-4">
          <Star size={12} className="fill-indigo-600" />
          <span>Interactive Widget Test Mode</span>
        </div>

        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">
          Test Your Live Chat Widget
        </h1>

        <p className="text-base text-slate-600 max-w-xl mx-auto mb-8 leading-relaxed">
          Look at the bottom right corner of this page! Click the floating chat bubble icon to start a conversation as a website visitor.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left my-8">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Zap className="text-indigo-600 mb-2" size={24} />
            <h3 className="font-bold text-sm text-slate-900 mb-1">1. Click Chat Bubble</h3>
            <p className="text-xs text-slate-500">Tap the floating widget button in the bottom right corner.</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <ShoppingBag className="text-indigo-600 mb-2" size={24} />
            <h3 className="font-bold text-sm text-slate-900 mb-1">2. Fill Visitor Form</h3>
            <p className="text-xs text-slate-500">Enter a name, email, and type any question to test.</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <ShieldCheck className="text-indigo-600 mb-2" size={24} />
            <h3 className="font-bold text-sm text-slate-900 mb-1">3. Check Inbox</h3>
            <p className="text-xs text-slate-500">Open your Supportly Inbox dashboard and reply instantly.</p>
          </div>
        </div>

        <div className="p-4 bg-indigo-50/70 border border-indigo-200/60 rounded-xl text-xs text-indigo-900 inline-flex items-center gap-2">
          <span>Connected Site ID: <code className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">{siteId}</code></span>
        </div>
      </main>
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading test page...</div>}>
      <TestContent />
    </Suspense>
  );
}
