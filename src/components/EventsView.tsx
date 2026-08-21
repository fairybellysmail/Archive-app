import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  GitBranch,
  ShieldCheck,
  AlertCircle,
  Play,
  Layers,
  Activity,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Terminal
} from 'lucide-react';

export const EventsView: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('judicial.case.intake');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDispatchTest = async () => {
    setDispatching(true);
    try {
      await api.dispatchTestEvent(selectedTopic, {
        docket_reference: 'FHC/ABJ/TEST/2026/001',
        intake_time: new Date().toISOString(),
        validation_status: 'PASSED',
        compliance_check: 'NO_OCR_NO_AI_POLICY_VERIFIED'
      });
      await loadEvents();
    } catch (err: any) {
      alert(err.message || 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
              Event Emitter & Queue Interface
            </span>
            <span className="text-xs text-slate-500">• Async Event Pipeline</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-judicial-display tracking-wide mt-1">
            Judicial Event Hooks & Queue Interface
          </h1>
        </div>

        <button
          onClick={loadEvents}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Pipeline Logs
        </button>
      </div>

      {/* Strict Compliance Banner: No OCR / No AI */}
      <div className="p-5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center gap-2.5 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-sm font-semibold uppercase tracking-wider font-judicial-display">
            Domain Compliance: Absolute Zero-OCR & Zero-AI Extraction Architecture
          </h3>
        </div>
        <p className="text-xs text-slate-300 font-judicial-serif leading-relaxed">
          Pursuant to judicial integrity guidelines, document ingestion operates strictly via deterministic byte hashing (SHA-256) and verified cryptographic registration. No probabilistic OCR, generative AI extraction, or synthetic fake mockups are permitted in the pipeline.
        </p>
      </div>

      {/* Event Topics & Dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Event Dispatcher */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-100 font-judicial-display">
              Dispatch Test Hook
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            Publish an asynchronous event into the event bus to verify event queue handlers.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Event Topic
            </label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="judicial.case.intake">judicial.case.intake</option>
              <option value="judicial.document.verified">judicial.document.verified</option>
              <option value="judicial.proceeding.published">judicial.proceeding.published</option>
              <option value="judicial.audit.alert">judicial.audit.alert</option>
            </select>
          </div>

          <button
            onClick={handleDispatchTest}
            disabled={dispatching}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            {dispatching ? 'Publishing Event...' : 'Dispatch Event to Bus'}
          </button>
        </div>

        {/* Right 2 Cols: Pipeline Event Stream */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-100 font-judicial-display">
                Event Dispatch Stream & Handlers ({events.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono-code">FIFO Queue Active</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 animate-pulse text-xs">
              Streaming event queue records...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 bg-slate-950/40 rounded-lg border border-slate-800 text-center text-xs text-slate-500">
              No recent events logged in bus queue.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {events.map(ev => (
                <div key={ev.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 font-mono-code text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold">{ev.topic}</span>
                    <span className="text-[10px] text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    UUID: {ev.id} • Status: <span className="text-emerald-400">ACKNOWLEDGED</span>
                  </div>
                  <pre className="text-[10px] text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
