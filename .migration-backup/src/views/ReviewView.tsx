import {
  Upload, FileText, Trash2, Play, Loader2, Sparkles,
  ChevronDown, ChevronUp, CheckCircle, AlertCircle, Clock,
  Copy, Check, FileDown, BookOpen, PanelLeftOpen, PanelLeftClose,
  CheckSquare, Square, Zap, Shield
} from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react';
import type { Agent, UploadedDocument, Analysis, ApiKeys, ReviewDocumentResult, ReviewRunState } from '../types';
import { runAgentAnalysis, runSynthesisAgent, runReviewerAgent } from '../lib/aiProviders';
import { parseDocument } from '../lib/documentParser';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';
import { exportReviewToDocx } from '../lib/exporters';

interface ReviewViewProps {
  agents: Agent[];
  apiKeys: ApiKeys;
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

export function ReviewView({ agents, apiKeys }: ReviewViewProps) {
  const { t, lang } = useT();
  const [reviewDocs, setReviewDocs] = useState<UploadedDocument[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [docResults, setDocResults] = useState<ReviewDocumentResult[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [runState, setRunState] = useState<ReviewRunState>({
    phase: 'idle', currentDocIndex: 0, totalDocs: 0, currentAgentName: '',
  });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set());
  const [expandedAnalysisIds, setExpandedAnalysisIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [fastMode, setFastMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = useCallback(async (file: File): Promise<UploadedDocument | null> => {
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
      return data as UploadedDocument;
    } catch (err) {
      alert(t('uploadError', { msg: err instanceof Error ? err.message : String(err) }));
      return null;
    }
  }, [t]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => /\.(pdf|docx|doc)$/i.test(f.name));
    if (!fileArr.length) return;
    setUploading(true);
    const uploaded: UploadedDocument[] = [];
    for (const file of fileArr) {
      const doc = await uploadDocument(file);
      if (doc) uploaded.push(doc);
    }
    setReviewDocs((prev) => [...uploaded, ...prev]);
    setUploading(false);
    if (window.innerWidth < 768) setPanelOpen(false);
  }, [uploadDocument]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeDoc = async (docId: string) => {
    await supabase.from('documents').delete().eq('id', docId);
    setReviewDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const nonSpecialAgents = agents.filter(
    (a) => !a.is_reviewer &&
      !a.name.toLowerCase().includes('eindredact') &&
      !a.name.toLowerCase().includes('editor')
  );

  const synthesisAgent = agents.find(
    (a) => !a.is_reviewer && (a.name.toLowerCase().includes('eindredact') || a.name.toLowerCase().includes('editor'))
  );

  const reviewerAgent = agents.find((a) => a.is_reviewer);

  const isRunning = runState.phase !== 'idle' && runState.phase !== 'done';

  const runReview = async () => {
    if (!reviewDocs.length || selectedAgentIds.size === 0 || isRunning) return;

    const selectedAgents = agents.filter((a) => selectedAgentIds.has(a.id));
    setReviewText('');
    setDocResults([]);
    setExpandedDocIds(new Set());
    setExpandedAnalysisIds(new Set());
    if (window.innerWidth < 768) setPanelOpen(false);

    const allDocResults: ReviewDocumentResult[] = [];

    const analyseDocument = async (doc: typeof reviewDocs[0], docIdx: number) => {
      setRunState({
        phase: 'analyzing',
        currentDocIndex: docIdx + 1,
        totalDocs: reviewDocs.length,
        currentAgentName: '',
      });

      const initialAnalyses: Analysis[] = selectedAgents.map((agent) => ({
        id: crypto.randomUUID(),
        document_id: doc.id,
        agent_id: agent.id,
        status: 'pending',
        result: '',
        error_message: '',
        created_at: new Date().toISOString(),
        completed_at: null,
        agent,
      }));

      allDocResults[docIdx] = { document: doc, analyses: initialAnalyses, synthesisResult: '' };
      setDocResults([...allDocResults]);

      const completedAgentResults: Array<{ agentName: string; result: string }> = [];

      if (fastMode) {
        // Parallel: all agents for this document at once
        allDocResults[docIdx] = {
          ...allDocResults[docIdx],
          analyses: initialAnalyses.map((a) => ({ ...a, status: 'running' })),
        };
        setDocResults([...allDocResults]);

        const agentSettled = await Promise.allSettled(
          selectedAgents.map((agent, agentIdx) =>
            runAgentAnalysis(agent, doc.extracted_text, doc.name, apiKeys, lang)
              .then((result) => ({ agentIdx, agent, result, error: null }))
              .catch((err) => ({ agentIdx, agent, result: null, error: err instanceof Error ? err.message : String(err) }))
          )
        );

        for (const settled of agentSettled) {
          if (settled.status !== 'fulfilled') continue;
          const { agentIdx, agent, result, error } = settled.value;
          const analysisId = initialAnalyses[agentIdx].id;
          if (result !== null) {
            allDocResults[docIdx] = {
              ...allDocResults[docIdx],
              analyses: allDocResults[docIdx].analyses.map((a) =>
                a.id === analysisId ? { ...a, status: 'completed', result } : a
              ),
            };
            completedAgentResults.push({ agentName: agent.name, result });
            // fire-and-forget DB insert
            supabase.from('analyses').insert({
              document_id: doc.id, agent_id: agent.id, status: 'completed',
              result, completed_at: new Date().toISOString(),
            }).then(() => {}).catch(() => {});
          } else {
            allDocResults[docIdx] = {
              ...allDocResults[docIdx],
              analyses: allDocResults[docIdx].analyses.map((a) =>
                a.id === analysisId ? { ...a, status: 'error', error_message: error ?? '' } : a
              ),
            };
          }
        }
        setDocResults([...allDocResults]);
      } else {
        // Serial: one agent at a time
        for (let agentIdx = 0; agentIdx < selectedAgents.length; agentIdx++) {
          const agent = selectedAgents[agentIdx];
          const analysisId = initialAnalyses[agentIdx].id;

          setRunState((prev) => ({ ...prev, currentAgentName: agent.name }));
          allDocResults[docIdx] = {
            ...allDocResults[docIdx],
            analyses: allDocResults[docIdx].analyses.map((a) =>
              a.id === analysisId ? { ...a, status: 'running' } : a
            ),
          };
          setDocResults([...allDocResults]);

          try {
            const result = await runAgentAnalysis(agent, doc.extracted_text, doc.name, apiKeys, lang);
            allDocResults[docIdx] = {
              ...allDocResults[docIdx],
              analyses: allDocResults[docIdx].analyses.map((a) =>
                a.id === analysisId ? { ...a, status: 'completed', result } : a
              ),
            };
            setDocResults([...allDocResults]);
            completedAgentResults.push({ agentName: agent.name, result });
            // fire-and-forget DB insert
            supabase.from('analyses').insert({
              document_id: doc.id, agent_id: agent.id, status: 'completed',
              result, completed_at: new Date().toISOString(),
            }).then(() => {}).catch(() => {});
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            allDocResults[docIdx] = {
              ...allDocResults[docIdx],
              analyses: allDocResults[docIdx].analyses.map((a) =>
                a.id === analysisId ? { ...a, status: 'error', error_message: errorMessage } : a
              ),
            };
            setDocResults([...allDocResults]);
          }
        }
      }

      // Per-document synthesis
      if (synthesisAgent && completedAgentResults.length > 0) {
        try {
          const synthesis = await runSynthesisAgent(synthesisAgent, completedAgentResults, doc.name, apiKeys, lang);
          allDocResults[docIdx] = { ...allDocResults[docIdx], synthesisResult: synthesis };
          setDocResults([...allDocResults]);
          supabase.from('analyses').insert({
            document_id: doc.id, agent_id: synthesisAgent.id, status: 'completed',
            result: synthesis, completed_at: new Date().toISOString(),
          }).then(() => {}).catch(() => {});
        } catch {
          // synthesis failure doesn't block the review
        }
      }
    };

    // Pre-populate allDocResults so indices are stable before async work starts
    reviewDocs.forEach((doc, idx) => {
      allDocResults[idx] = { document: doc, analyses: [], synthesisResult: '' };
    });

    for (let docIdx = 0; docIdx < reviewDocs.length; docIdx++) {
      await analyseDocument(reviewDocs[docIdx], docIdx);
    }

    // Final reviewer step
    if (reviewerAgent) {
      setRunState((prev) => ({ ...prev, phase: 'reviewing', currentAgentName: reviewerAgent.name }));
      try {
        const articleResults = allDocResults.map((dr) => ({
          documentName: dr.document.name,
          agentResults: dr.analyses
            .filter((a) => a.status === 'completed')
            .map((a) => ({ agentName: a.agent?.name ?? a.agent_id, result: a.result })),
          synthesisResult: dr.synthesisResult,
        }));

        const review = await runReviewerAgent(reviewerAgent, articleResults, apiKeys, lang);
        setReviewText(review);

        const reviewDocId = allDocResults[0]?.document.id;
        if (reviewDocId) {
          supabase.from('analyses').insert({
            document_id: reviewDocId, agent_id: reviewerAgent.id, status: 'completed',
            result: review, completed_at: new Date().toISOString(),
          }).then(() => {}).catch(() => {});
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setReviewText(`**Review mislukt:** ${msg}`);
      }
    }

    setRunState((prev) => ({ ...prev, phase: 'done' }));
  };

  const handleCopy = async () => {
    if (!reviewText) return;
    await navigator.clipboard.writeText(reviewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDocx = async () => {
    if (!reviewText) return;
    try {
      await exportReviewToDocx(reviewText, reviewDocs.length, lang);
    } catch (err) {
      alert(`Word export mislukt: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const toggleDocExpand = (id: string) => {
    setExpandedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAnalysisExpand = (id: string) => {
    setExpandedAnalysisIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasResults = reviewText || docResults.length > 0;

  const progressPct = runState.totalDocs > 0
    ? Math.round((runState.currentDocIndex / runState.totalDocs) * 100)
    : 0;

  return (
    <div className="flex h-full min-h-screen relative">
      {/* Left panel */}
      <div
        className={`
          flex-shrink-0 border-r border-slate-700 flex flex-col bg-slate-900/50 gap-4
          transition-all duration-300
          ${panelOpen ? 'w-72 p-4' : 'w-0 p-0 overflow-hidden border-r-0'}
          md:w-72 md:p-4 md:overflow-auto md:border-r
        `}
      >
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <h1 className="text-sm font-bold text-white">{t('reviewModeTitle')}</h1>
          </div>
          <p className="text-xs text-slate-500">{t('reviewModeSubtitle')}</p>
        </div>

        {/* Upload */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('sectionDocuments')}</h2>
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragOver ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                <p className="text-xs text-slate-400">{t('uploading')}</p>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">{t('reviewUploadHint')}</p>
                <p className="text-xs text-slate-600 mt-0.5">{t('reviewUploadOr')}</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" multiple className="hidden" onChange={handleFileInput} />
        </div>

        {/* Doc list */}
        {reviewDocs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('reviewDocumentsTitle')}</h2>
              <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{reviewDocs.length}</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {reviewDocs.map((doc) => (
                <div key={doc.id} className="group flex items-center gap-2 p-2.5 rounded-lg border border-transparent hover:bg-slate-800 hover:border-slate-700 transition-all">
                  <FileText className={`w-4 h-4 flex-shrink-0 ${doc.file_type === 'pdf' ? 'text-red-400/70' : 'text-blue-400/70'}`} />
                  <span className="text-xs text-slate-300 flex-1 truncate">{doc.name}</span>
                  <span className={`text-[10px] font-medium px-1 py-0.5 rounded flex-shrink-0 ${doc.file_type === 'pdf' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}>
                    {doc.file_type.toUpperCase()}
                  </span>
                  <button
                    onClick={() => !isRunning && removeDoc(doc.id)}
                    disabled={isRunning}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-red-400 transition-all disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent selection */}
        {reviewDocs.length > 0 && nonSpecialAgents.length > 0 && (
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('sectionAgents')}</h2>
              <button
                onClick={() => setSelectedAgentIds(new Set(nonSpecialAgents.map((a) => a.id)))}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                {t('selectAll')}
              </button>
            </div>
            <div className="space-y-1.5">
              {nonSpecialAgents.map((agent) => (
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
                    ? <CheckSquare className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    : <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  }
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
                  <span className="text-xs text-slate-300 truncate">{agent.name}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2 italic">{t('synthEditorNote')}</p>
            {reviewerAgent && (
              <div className="mt-1.5 flex items-center gap-2 p-2 rounded-lg bg-sky-500/5 border border-sky-500/20">
                <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                <span className="text-xs text-sky-400 truncate">{reviewerAgent.name}</span>
                <span className="text-xs text-slate-600 ml-auto">{lang === 'en' ? 'auto' : 'auto'}</span>
              </div>
            )}
          </div>
        )}

        {/* Speed mode toggle */}
        {reviewDocs.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('reviewSpeedLabel')}</h2>
            <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50">
              <button
                onClick={() => !isRunning && setFastMode(false)}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium transition-all disabled:cursor-not-allowed ${
                  !fastMode
                    ? 'bg-slate-700 text-white shadow-inner'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t('reviewSafeModeDesc')}
              >
                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                {t('reviewSafeMode')}
              </button>
              <button
                onClick={() => !isRunning && setFastMode(true)}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium transition-all disabled:cursor-not-allowed ${
                  fastMode
                    ? 'bg-amber-500/20 text-amber-300 shadow-inner border-l border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 border-l border-slate-700'
                }`}
                title={t('reviewFastModeDesc')}
              >
                <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                {t('reviewFastMode')}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-snug">
              {fastMode ? t('reviewFastModeDesc') : t('reviewSafeModeDesc')}
            </p>
          </div>
        )}

        {/* Groq not available warning */}
        {apiKeys.active_provider === 'groq' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-400 mb-0.5">
              {lang === 'en' ? 'Groq not available in Review mode' : 'Groq niet beschikbaar in reviewmodus'}
            </p>
            <p className="text-xs text-amber-400/70 leading-snug">
              {lang === 'en'
                ? 'The Groq rate limit is too strict for multi-article review. Set OpenAI or Gemini as active provider in Settings.'
                : 'De Groq-limiet is te streng voor meerdere artikelen. Stel OpenAI of Gemini in als actieve provider via Instellingen.'}
            </p>
          </div>
        )}

        {/* Run button */}
        {reviewDocs.length > 0 && (
          <button
            onClick={runReview}
            disabled={isRunning || selectedAgentIds.size === 0 || apiKeys.active_provider === 'groq'}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sky-500/20"
          >
            {isRunning
              ? <><Loader2 className="w-4 h-4 animate-spin" />{t('reviewRunning')}</>
              : <><Play className="w-4 h-4" />{t('reviewStartBtn')}</>
            }
          </button>
        )}
      </div>

      {/* Panel toggle — mobile */}
      <button
        onClick={() => setPanelOpen((v) => !v)}
        className="md:hidden absolute top-3 left-3 z-10 p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors shadow-lg"
        aria-label="Toggle panel"
      >
        {panelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </button>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 min-w-0">
        {!hasResults && !isRunning ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center pt-12 md:pt-0">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">{t('reviewModeTitle')}</h2>
            <p className="text-sm text-slate-400 max-w-sm mb-1">{t('reviewModeSubtitle')}</p>
            <p className="text-xs text-slate-600 max-w-xs">
              {reviewDocs.length === 0 ? t('reviewNoDocsHint') : t('reviewSelectAgentsHint')}
            </p>
            <button
              onClick={() => setPanelOpen(true)}
              className="md:hidden mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sm text-sky-300 hover:text-white transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
              {t('sectionDocuments')}
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="pt-8 md:pt-0">
              <h2 className="text-lg sm:text-xl font-bold text-white">{t('reviewResultTitle')}</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {t('reviewResultSubtitle', { n: String(reviewDocs.length) })}
              </p>
            </div>

            {/* Progress */}
            {isRunning && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 text-sky-400 animate-spin flex-shrink-0" />
                  <div>
                    {runState.phase === 'reviewing' ? (
                      <p className="text-sm font-medium text-white">{t('reviewRunningReviewer')}</p>
                    ) : (
                      <p className="text-sm font-medium text-white">
                        <span className="text-sky-400">{runState.currentAgentName}</span>
                        {' '}
                        <span className="text-slate-400 text-xs">
                          — {t('reviewPhaseLabel', { current: String(runState.currentDocIndex), total: String(runState.totalDocs) })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Per-doc status dots */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {reviewDocs.map((doc, idx) => {
                    const docResult = docResults.find((dr) => dr.document.id === doc.id);
                    const allDone = docResult?.analyses.every((a) => a.status === 'completed' || a.status === 'error');
                    const isActive = runState.currentDocIndex === idx + 1;
                    return (
                      <div key={doc.id} className="flex items-center gap-1.5 text-xs">
                        <div className={`w-2 h-2 rounded-full ${
                          allDone ? 'bg-emerald-400' : isActive ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'
                        }`} />
                        <span className={allDone ? 'text-emerald-400' : isActive ? 'text-sky-400' : 'text-slate-500'}>
                          {doc.name.length > 20 ? doc.name.slice(0, 18) + '…' : doc.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Review result */}
            {reviewText && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-600 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-slate-700 bg-gradient-to-r from-sky-500/10 to-transparent">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white">{t('reviewResultTitle')}</h3>
                    <p className="text-xs text-slate-400">{t('reviewResultSubtitle', { n: String(docResults.length) })}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? t('reviewCopied') : t('reviewCopy')}
                    </button>
                    <button
                      onClick={handleExportDocx}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-all"
                    >
                      <FileDown className="w-3.5 h-3.5 text-sky-400" />
                      {t('reviewExportWord')}
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6 space-y-1">
                  {renderMarkdown(reviewText)}
                </div>
              </div>
            )}

            {/* Per-article analyses */}
            {docResults.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-slate-700">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t('reviewPerArticle')}
                  </h3>
                </div>

                <div className="divide-y divide-slate-700/50">
                  {docResults.map((dr) => {
                    const docExpanded = expandedDocIds.has(dr.document.id);
                    const completedCount = dr.analyses.filter((a) => a.status === 'completed').length;
                    const totalCount = dr.analyses.length;

                    return (
                      <div key={dr.document.id}>
                        {/* Article header row */}
                        <button
                          onClick={() => toggleDocExpand(dr.document.id)}
                          className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-slate-700/30 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-sky-400/70 flex-shrink-0" />
                          <span className="text-sm text-slate-200 flex-1 min-w-0 truncate">{dr.document.name}</span>
                          <span className="text-xs text-slate-500 flex-shrink-0">{completedCount}/{totalCount}</span>
                          {docExpanded
                            ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          }
                        </button>

                        {docExpanded && (
                          <div className="bg-slate-900/40 border-t border-slate-700/50">
                            {/* Synthesis for this doc */}
                            {dr.synthesisResult && (
                              <div className="px-4 sm:px-5 py-3 border-b border-slate-700/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                                  <span className="text-xs font-semibold text-slate-300">{t('integratedAnalysis')}</span>
                                </div>
                                <div className="space-y-1 text-xs pl-5">
                                  {renderMarkdown(dr.synthesisResult)}
                                </div>
                              </div>
                            )}

                            {/* Individual agent analyses */}
                            <div className="divide-y divide-slate-700/30">
                              {dr.analyses.map((analysis) => {
                                const agent = agents.find((a) => a.id === analysis.agent_id);
                                if (!agent) return null;
                                const expanded = expandedAnalysisIds.has(analysis.id);

                                return (
                                  <div key={analysis.id}>
                                    <button
                                      onClick={() => analysis.status === 'completed' && toggleAnalysisExpand(analysis.id)}
                                      className={`w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-left transition-colors ${
                                        analysis.status === 'completed' ? 'hover:bg-slate-700/20' : 'cursor-default'
                                      }`}
                                    >
                                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
                                      <span className="text-xs text-slate-300 flex-1">{agent.name}</span>
                                      {analysis.status === 'pending' && <Clock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />}
                                      {analysis.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin flex-shrink-0" />}
                                      {analysis.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                                      {analysis.status === 'completed' && (
                                        expanded
                                          ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                          : <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                      )}
                                      {analysis.status === 'completed' && !expanded && (
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                                      )}
                                    </button>

                                    {expanded && analysis.status === 'completed' && (
                                      <div className="px-4 sm:px-5 pb-4 pt-1 bg-slate-900/30 border-t border-slate-700/30">
                                        <div className="space-y-1">
                                          {renderMarkdown(analysis.result)}
                                        </div>
                                      </div>
                                    )}
                                    {analysis.status === 'error' && (
                                      <div className="px-4 sm:px-5 pb-2 pt-0.5">
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
