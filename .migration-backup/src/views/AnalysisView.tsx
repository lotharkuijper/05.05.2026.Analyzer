import {
  Upload, FileText, Trash2, Play, Bot,
  CheckSquare, Square, Loader2, FileDown, Presentation, Sparkles, Image,
  ChevronDown, ChevronUp, CheckCircle, AlertCircle, Clock, PanelLeftOpen, PanelLeftClose
} from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react';
import type { Agent, UploadedDocument, Analysis, ApiKeys } from '../types';
import { runAgentAnalysis, runSynthesisAgent } from '../lib/aiProviders';
import { parseDocument } from '../lib/documentParser';
import { exportToDocx, exportToPptx, exportToPoster } from '../lib/exporters';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';

const GROQ_RATE_LIMIT_MS = 15000;

interface AnalysisViewProps {
  agents: Agent[];
  apiKeys: ApiKeys;
}

interface RunState {
  phase: 'idle' | 'running' | 'waiting' | 'synthesis' | 'done';
  currentAgentName: string;
  currentStep: number;
  totalSteps: number;
  countdown: number;
}

function delay(ms: number, onTick?: (remaining: number) => void): Promise<void> {
  return new Promise((resolve) => {
    let remaining = Math.ceil(ms / 1000);
    onTick?.(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      onTick?.(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

function inlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) parts.push(<strong key={m.index} className="font-semibold text-slate-100">{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<code key={m.index} className="font-mono text-xs bg-slate-700 px-1 py-0.5 rounded text-amber-300">{m[3]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function parseTable(lines: string[], startIndex: number): { node: React.ReactNode; consumed: number } | null {
  const tableLines: string[] = [];
  let i = startIndex;
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    tableLines.push(lines[i]);
    i++;
  }
  if (tableLines.length < 2) return null;

  const parseRow = (line: string) =>
    line.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const headerCells = parseRow(tableLines[0]);
  const bodyRows = tableLines.slice(2).filter((l) => !/^\s*\|[\s\-:]+\|/.test(l));

  const node = (
    <div key={startIndex} className="overflow-x-auto my-4 rounded-lg border border-slate-700">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-700/80">
            {headerCells.map((cell, ci) => (
              <th key={ci} className="px-3 sm:px-4 py-2.5 text-left text-xs font-semibold text-slate-200 tracking-wide border-b border-slate-600 whitespace-nowrap">
                {inlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-800/40'}>
              {parseRow(row).map((cell, ci) => (
                <td key={ci} className="px-3 sm:px-4 py-2.5 text-slate-300 border-b border-slate-700/50 align-top text-xs sm:text-sm">
                  {inlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return { node, consumed: tableLines.length };
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      const result = parseTable(lines, i);
      if (result) {
        nodes.push(result.node);
        i += result.consumed;
        continue;
      }
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} className="my-3 p-3 sm:p-4 bg-slate-950 border border-slate-700 rounded-lg overflow-x-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre">
          {codeLines.join('\n')}
        </pre>
      );
      i++;
      continue;
    }

    if (/^[\-\*]{3,}\s*$/.test(line.trim())) {
      nodes.push(<hr key={i} className="my-5 border-slate-700" />);
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      nodes.push(<h2 key={i} className="text-base font-bold text-white mt-6 mb-2 first:mt-0 tracking-tight">{inlineMarkdown(line.slice(2))}</h2>);
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      nodes.push(<h3 key={i} className="text-sm font-bold text-slate-100 mt-5 mb-1.5 first:mt-0 tracking-tight border-b border-slate-700/50 pb-1">{inlineMarkdown(line.slice(3))}</h3>);
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      nodes.push(<h4 key={i} className="text-sm font-semibold text-slate-200 mt-4 mb-1 first:mt-0">{inlineMarkdown(line.slice(4))}</h4>);
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      nodes.push(
        <div key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed ml-2">
          <span className="text-amber-400/70 font-mono text-xs mt-0.5 flex-shrink-0">{line.match(/^(\d+)\./)?.[1]}.</span>
          <span>{inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      nodes.push(
        <div key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed ml-2">
          <span className="text-amber-400/70 mt-1.5 flex-shrink-0">&#8231;</span>
          <span>{inlineMarkdown(line.slice(2))}</span>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      nodes.push(<p key={i} className="text-sm font-semibold text-slate-200 mt-3 mb-0.5">{line.slice(2, -2)}</p>);
      i++;
      continue;
    }

    if (!line.trim()) {
      nodes.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    nodes.push(<p key={i} className="text-sm text-slate-300 leading-relaxed">{inlineMarkdown(line)}</p>);
    i++;
  }

  return nodes;
}

export function AnalysisView({ agents, apiKeys }: AnalysisViewProps) {
  const { t, lang } = useT();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<UploadedDocument | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [synthesisResult, setSynthesisResult] = useState<string>('');
  const [runState, setRunState] = useState<RunState>({
    phase: 'idle', currentAgentName: '', currentStep: 0, totalSteps: 0, countdown: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const parsed = await parseDocument(file);
      const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';

      const { data, error } = await supabase.from('documents').insert({
        name: file.name,
        file_type: ext,
        extracted_text: parsed.text,
        sections: parsed.sections,
        file_size: file.size,
      }).select().single();

      if (error) throw error;

      const doc = data as UploadedDocument;
      setDocuments((prev) => [doc, ...prev]);
      setSelectedDoc(doc);
      setAnalyses([]);
      setSynthesisResult('');
      setRunState({ phase: 'idle', currentAgentName: '', currentStep: 0, totalSteps: 0, countdown: 0 });
      // On mobile, collapse the panel after upload so user sees the main area
      if (window.innerWidth < 768) setPanelOpen(false);
    } catch (err) {
      alert(t('uploadError', { msg: err instanceof Error ? err.message : String(err) }));
    } finally {
      setUploading(false);
    }
  }, [t]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(pdf|docx|doc)$/i.test(file.name)) uploadDocument(file);
  }, [uploadDocument]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDocument(file);
    e.target.value = '';
  };

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllAgents = () => {
    setSelectedAgentIds(new Set(nonSynthesisAgents.map((a) => a.id)));
  };

  const runAnalysis = async () => {
    if (!selectedDoc || selectedAgentIds.size === 0 || runState.phase !== 'idle') return;

    const selectedAgents = agents.filter((a) => selectedAgentIds.has(a.id));
    const total = selectedAgents.length;

    setSynthesisResult('');
    setExpandedLogIds(new Set());
    // On mobile, hide panel when analysis starts
    if (window.innerWidth < 768) setPanelOpen(false);

    const initialAnalyses: Analysis[] = selectedAgents.map((agent) => ({
      id: crypto.randomUUID(),
      document_id: selectedDoc.id,
      agent_id: agent.id,
      status: 'pending',
      result: '',
      error_message: '',
      created_at: new Date().toISOString(),
      completed_at: null,
      agent,
    }));

    setAnalyses(initialAnalyses);

    const completedResults: Array<{ agentName: string; result: string }> = [];

    for (let i = 0; i < selectedAgents.length; i++) {
      const agent = selectedAgents[i];
      const analysisId = initialAnalyses[i].id;

      setRunState({ phase: 'running', currentAgentName: agent.name, currentStep: i + 1, totalSteps: total, countdown: 0 });

      setAnalyses((prev) =>
        prev.map((a) => a.id === analysisId ? { ...a, status: 'running' } : a)
      );

      try {
        const result = await runAgentAnalysis(agent, selectedDoc.extracted_text, selectedDoc.name, apiKeys, lang);

        await supabase.from('analyses').insert({
          document_id: selectedDoc.id,
          agent_id: agent.id,
          status: 'completed',
          result,
          completed_at: new Date().toISOString(),
        });

        setAnalyses((prev) =>
          prev.map((a) => a.id === analysisId ? { ...a, status: 'completed', result } : a)
        );
        completedResults.push({ agentName: agent.name, result });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setAnalyses((prev) =>
          prev.map((a) => a.id === analysisId ? { ...a, status: 'error', error_message: errorMessage } : a)
        );
      }

      // Only delay for Groq (free tier has strict TPM limits)
      if (apiKeys.active_provider === 'groq') {
        setRunState((prev) => ({ ...prev, phase: 'waiting', countdown: GROQ_RATE_LIMIT_MS / 1000 }));
        await delay(GROQ_RATE_LIMIT_MS, (remaining) => {
          setRunState((prev) => ({ ...prev, countdown: remaining }));
        });
      }
    }

    // Synthesis step
    const synthesisAgent = agents.find((a) => !a.is_reviewer && (a.name.toLowerCase().includes('eindredact') || a.name.toLowerCase().includes('editor')));
    if (synthesisAgent && completedResults.length > 0) {
      setRunState({ phase: 'synthesis', currentAgentName: synthesisAgent.name, currentStep: total, totalSteps: total, countdown: 0 });
      try {
        const synthesis = await runSynthesisAgent(synthesisAgent, completedResults, selectedDoc.name, apiKeys, lang);
        setSynthesisResult(synthesis);

        await supabase.from('analyses').insert({
          document_id: selectedDoc.id,
          agent_id: synthesisAgent.id,
          status: 'completed',
          result: synthesis,
          completed_at: new Date().toISOString(),
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setSynthesisResult(`${t('synthesisFailedPrefix')} ${errorMessage}`);
      }
    }

    setRunState({ phase: 'done', currentAgentName: '', currentStep: total, totalSteps: total, countdown: 0 });
  };

  const deleteDocument = async (docId: string) => {
    await supabase.from('documents').delete().eq('id', docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (selectedDoc?.id === docId) {
      setSelectedDoc(null);
      setAnalyses([]);
      setSynthesisResult('');
      setRunState({ phase: 'idle', currentAgentName: '', currentStep: 0, totalSteps: 0, countdown: 0 });
    }
  };

  const handleExportDocx = async () => {
    if (!selectedDoc) return;
    const completedAnalyses = analyses
      .filter((a) => a.status === 'completed')
      .map((a) => ({ ...a, agent: agents.find((ag) => ag.id === a.agent_id)! }))
      .filter((a) => a.agent);
    try {
      await exportToDocx(selectedDoc, completedAnalyses, synthesisResult, lang);
    } catch (err) {
      alert(`Word export mislukt: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleExportPptx = async () => {
    if (!selectedDoc) return;
    const completedAnalyses = analyses
      .filter((a) => a.status === 'completed')
      .map((a) => ({ ...a, agent: agents.find((ag) => ag.id === a.agent_id)! }))
      .filter((a) => a.agent);
    try {
      await exportToPptx(selectedDoc, completedAnalyses, synthesisResult, lang);
    } catch (err) {
      alert(`PowerPoint export mislukt: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleExportPoster = async () => {
    if (!selectedDoc) return;
    const completedAnalyses = analyses
      .filter((a) => a.status === 'completed')
      .map((a) => ({ ...a, agent: agents.find((ag) => ag.id === a.agent_id)! }))
      .filter((a) => a.agent);
    try {
      await exportToPoster(selectedDoc, completedAnalyses, synthesisResult, lang);
    } catch (err) {
      alert(`Poster export mislukt: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const toggleLogEntry = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isRunning = runState.phase !== 'idle' && runState.phase !== 'done';
  const nonSynthesisAgents = agents.filter((a) =>
    !a.is_reviewer &&
    !a.name.toLowerCase().includes('eindredact') &&
    !a.name.toLowerCase().includes('editor')
  );
  const hasResults = synthesisResult || analyses.length > 0;

  const progressPct = runState.totalSteps > 0
    ? Math.round((runState.currentStep / runState.totalSteps) * 100)
    : 0;

  return (
    <div className="flex h-full min-h-screen relative">
      {/* Left panel — collapsible on mobile */}
      <div
        className={`
          flex-shrink-0 border-r border-slate-700 flex flex-col bg-slate-900/50 gap-4
          transition-all duration-300
          ${panelOpen ? 'w-72 p-4' : 'w-0 p-0 overflow-hidden border-r-0'}
          md:w-72 md:p-4 md:overflow-auto md:border-r
        `}
      >
        {/* Upload */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('sectionDocument')}</h2>
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragOver ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <p className="text-xs text-slate-400">{t('uploading')}</p>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">{t('dropHint')}</p>
                <p className="text-xs text-slate-600 mt-0.5">{t('dropOr')}</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={handleFileInput} />
        </div>

        {/* Doc list */}
        {documents.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('sectionDocuments')}</h2>
            <div className="space-y-1.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                    selectedDoc?.id === doc.id
                      ? 'bg-blue-500/15 border border-blue-500/30'
                      : 'hover:bg-slate-800 border border-transparent'
                  }`}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setAnalyses([]);
                    setSynthesisResult('');
                    setRunState({ phase: 'idle', currentAgentName: '', currentStep: 0, totalSteps: 0, countdown: 0 });
                    if (window.innerWidth < 768) setPanelOpen(false);
                  }}
                >
                  <FileText className={`w-4 h-4 flex-shrink-0 ${doc.file_type === 'pdf' ? 'text-red-400/70' : 'text-blue-400/70'}`} />
                  <span className="text-xs text-slate-300 flex-1 truncate">{doc.name}</span>
                  <span className={`text-[10px] font-medium px-1 py-0.5 rounded flex-shrink-0 ${doc.file_type === 'pdf' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}>
                    {doc.file_type.toUpperCase()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent selection */}
        {selectedDoc && nonSynthesisAgents.length > 0 && (
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('sectionAgents')}</h2>
              <button onClick={selectAllAgents} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                {t('selectAll')}
              </button>
            </div>
            <div className="space-y-1.5">
              {nonSynthesisAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => !isRunning && toggleAgent(agent.id)}
                  disabled={isRunning}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left disabled:cursor-not-allowed ${
                    selectedAgentIds.has(agent.id)
                      ? 'border-slate-600 bg-slate-800'
                      : 'border-transparent hover:bg-slate-800/50'
                  }`}
                >
                  {selectedAgentIds.has(agent.id)
                    ? <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    : <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  }
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
                  <span className="text-xs text-slate-300 truncate">{agent.name}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2 italic">{t('synthEditorNote')}</p>
          </div>
        )}

        {/* Run button */}
        {selectedDoc && (
          <button
            onClick={runAnalysis}
            disabled={isRunning || selectedAgentIds.size === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20"
          >
            {isRunning
              ? <><Loader2 className="w-4 h-4 animate-spin" />{t('running')}</>
              : <><Play className="w-4 h-4" />{t('startAnalysis')}</>
            }
          </button>
        )}

        {/* Export */}
        {synthesisResult && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('sectionExport')}</h2>
            <button
              onClick={handleExportDocx}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-all"
            >
              <FileDown className="w-4 h-4 text-blue-400" />
              {t('exportWord')}
            </button>
            <button
              onClick={handleExportPptx}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-all"
            >
              <Presentation className="w-4 h-4 text-orange-400" />
              {t('exportPptx')}
            </button>
            <button
              onClick={handleExportPoster}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition-all"
            >
              <Image className="w-4 h-4 text-emerald-400" />
              {t('exportPoster')}
            </button>
          </div>
        )}
      </div>

      {/* Panel toggle button — mobile only */}
      <button
        onClick={() => setPanelOpen((v) => !v)}
        className="md:hidden absolute top-3 left-3 z-10 p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors shadow-lg"
        aria-label="Toggle panel"
      >
        {panelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </button>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 min-w-0">
        {!selectedDoc ? (
          <div className="flex flex-col items-center justify-center h-full text-center pt-12 md:pt-0">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">{t('noDocSelected')}</h2>
            <p className="text-sm text-slate-400 max-w-sm">{t('noDocSelectedDesc')}</p>
            {/* Mobile: show panel button hint */}
            <button
              onClick={() => setPanelOpen(true)}
              className="md:hidden mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
              {t('sectionDocument')}
            </button>
          </div>
        ) : !hasResults ? (
          <div className="flex flex-col items-center justify-center h-full text-center pt-12 md:pt-0">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">{selectedDoc.name}</h2>
            <p className="text-sm text-slate-400 max-w-sm mb-3">{t('selectAgentsHint')}</p>
            <p className="text-xs text-slate-600">
              {t('charsExtracted', { n: (selectedDoc.extracted_text.length / 1000).toFixed(1) })}
            </p>
            <button
              onClick={() => setPanelOpen(true)}
              className="md:hidden mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-sm text-blue-300 hover:text-white transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
              {t('sectionAgents')}
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="pt-8 md:pt-0">
              <h2 className="text-lg sm:text-xl font-bold text-white">{selectedDoc.name}</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {t('charsAnalyzed', { n: (selectedDoc.extracted_text.length / 1000).toFixed(1) })}
              </p>
            </div>

            {/* Progress panel */}
            {isRunning && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-5 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                  <div>
                    {runState.phase === 'waiting' ? (
                      <p className="text-sm font-medium text-white">{t('waitingRateLimit')}</p>
                    ) : runState.phase === 'synthesis' ? (
                      <p className="text-sm font-medium text-white">{t('synthesisRunning')}</p>
                    ) : (
                      <p className="text-sm font-medium text-white">
                        <span className="text-blue-400">{runState.currentAgentName}</span>
                        {' '}{t('agentAnalyzing', { name: '' }).trim()}
                        <span className="text-slate-500 ml-2 text-xs">({runState.currentStep}/{runState.totalSteps})</span>
                      </p>
                    )}
                    {runState.phase === 'waiting' && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('nextAgentIn', { n: String(runState.countdown) })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex gap-3 mt-3 flex-wrap">
                  {analyses.map((a) => {
                    const agent = agents.find((ag) => ag.id === a.agent_id);
                    if (!agent) return null;
                    return (
                      <div key={a.id} className="flex items-center gap-1.5 text-xs">
                        <div className={`w-2 h-2 rounded-full ${
                          a.status === 'completed' ? 'bg-emerald-400' :
                          a.status === 'error' ? 'bg-red-400' :
                          a.status === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'
                        }`} />
                        <span className={
                          a.status === 'completed' ? 'text-emerald-400' :
                          a.status === 'error' ? 'text-red-400' :
                          a.status === 'running' ? 'text-blue-400' : 'text-slate-500'
                        }>
                          {agent.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Synthesis result */}
            {synthesisResult ? (
              <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-600 rounded-xl overflow-hidden animate-fade-in">
                <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-slate-700 bg-gradient-to-r from-red-500/10 to-transparent">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t('integratedAnalysis')}</h3>
                    <p className="text-xs text-slate-400">{t('integratedAnalysisDesc')}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />
                </div>
                <div className="p-4 sm:p-6 space-y-1">
                  {renderMarkdown(synthesisResult)}
                </div>
              </div>
            ) : runState.phase === 'synthesis' ? (
              <div className="bg-slate-800 border border-red-500/20 rounded-xl p-6 sm:p-8 text-center animate-fade-in">
                <Loader2 className="w-8 h-8 text-red-400 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-white">{t('editorCompiling')}</p>
                <p className="text-xs text-slate-500 mt-1">{t('editorCompilingNote')}</p>
              </div>
            ) : null}

            {/* Agent log */}
            {analyses.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-slate-700">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t('agentLog')}
                    <span className="ml-2 text-slate-600 normal-case font-normal">{t('agentLogNote')}</span>
                  </h3>
                </div>

                <div className="divide-y divide-slate-700/50">
                  {analyses.map((analysis) => {
                    const agent = agents.find((a) => a.id === analysis.agent_id);
                    if (!agent) return null;
                    const expanded = expandedLogIds.has(analysis.id);

                    return (
                      <div key={analysis.id}>
                        <button
                          onClick={() => analysis.status === 'completed' && toggleLogEntry(analysis.id)}
                          className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition-colors ${
                            analysis.status === 'completed' ? 'hover:bg-slate-700/40' : 'cursor-default'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-300">{agent.name}</span>
                            <span className="text-xs text-slate-500 ml-2 hidden sm:inline">{agent.role}</span>
                          </div>

                          {analysis.status === 'pending' && <Clock className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                          {analysis.status === 'running' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />}
                          {analysis.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                          {analysis.status === 'completed' && (
                            expanded
                              ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          )}
                        </button>

                        {expanded && analysis.status === 'completed' && (
                          <div className="px-4 sm:px-5 pb-5 pt-1 bg-slate-900/40 border-t border-slate-700/50 animate-slide-up">
                            <div className="space-y-1 text-sm">
                              {renderMarkdown(analysis.result)}
                            </div>
                          </div>
                        )}
                        {analysis.status === 'error' && (
                          <div className="px-4 sm:px-5 pb-3 pt-1">
                            <p className="text-xs text-red-400">{analysis.error_message}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
