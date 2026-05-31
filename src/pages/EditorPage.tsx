import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Shield, Send, Eye, EyeOff, ChevronDown, AlertTriangle,
  CheckCircle, MessageSquare, FileCode, Sparkles, ArrowLeft,
  Loader2, Bot, User, Trash2, RotateCcw, X, Zap,
  ShieldCheck, Bug, Gauge, Lightbulb, Code2, Copy, Check,
  AlertCircle
} from 'lucide-react';
import { sampleCodes, languageOptions } from '../data/sampleCodes';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError } from '../lib/api';

import type { HistoryReview } from '../lib/api';

interface EditorPageProps {
  onBack?: () => void;
  initialReview?: HistoryReview | null;
  onReviewComplete?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function EditorPage({ onBack, initialReview, onReviewComplete }: EditorPageProps) {
  const { user } = useAuth();
  const [code, setCode] = useState(initialReview?.code || '// Paste your code here or select a sample below...\n');
  const [language, setLanguage] = useState(initialReview?.language || 'javascript');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<string | null>(initialReview?.ai_feedback?.response || null);
  const [reviewId, setReviewId] = useState<string | null>(initialReview?.id || null);
  const [activeTab, setActiveTab] = useState<'review' | 'chat'>('review');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [ghostMode, setGhostMode] = useState(false);
  const [credits, setCredits] = useState({ used: 0, remaining: 20, maxCredits: 20 });
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(!!initialReview?.ai_feedback?.response);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Update editor state when selecting a different review from sidebar
  useEffect(() => {
    if (initialReview) {
      setCode(initialReview.code);
      setLanguage(initialReview.language);
      setReviewResult(initialReview.ai_feedback?.response || null);
      setReviewId(initialReview.id);
      setHasReviewed(!!initialReview.ai_feedback?.response);
      setChatMessages([]);
      setError('');
    } else {
      setCode('// Paste your code here or select a sample below...\n');
      setLanguage('javascript');
      setReviewResult(null);
      setReviewId(null);
      setHasReviewed(false);
      setChatMessages([]);
      setError('');
    }
  }, [initialReview]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const sampleDropdownRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!user;

  // Fetch credits on mount
  useEffect(() => {
    if (user) fetchCredits();
  }, [user]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, [user]);

  const maxCredits = credits.maxCredits || 20;

  const fetchCredits = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await api.getCredits(token);
      setCredits({ used: data.used, remaining: data.remaining, maxCredits: data.maxCredits || 20 });
    } catch { /* silent */ }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) setShowLangDropdown(false);
      if (sampleDropdownRef.current && !sampleDropdownRef.current.contains(e.target as Node)) setShowSampleDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(id);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  const handleReview = useCallback(async () => {
    if (!code.trim() || code.trim() === '// Paste your code here or select a sample below...') return;

    setError('');
    setIsReviewing(true);
    setActiveTab('review');
    setReviewResult(null);
    setReviewId(null);
    setHasReviewed(true);

    try {
      const token = await getToken();
      // Not logged in = always ghost mode (don't save)
      const effectiveGhost = ghostMode || !isLoggedIn;
      const data = await api.review(token, code, language, effectiveGhost);
      setReviewResult(data.response);
      setReviewId(data.reviewId);
      if (data.credits) setCredits({ used: data.credits.used, remaining: data.credits.remaining, maxCredits: data.credits.maxCredits || 20 });
      if (!effectiveGhost && onReviewComplete) onReviewComplete();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        setError(`Daily limit reached (${maxCredits}/day). Enable Ghost Mode for unlimited reviews.`);
      } else {
        setError(err.message || 'Analysis failed. Is the backend running?');
      }
      setHasReviewed(false);
    } finally {
      setIsReviewing(false);
    }
  }, [code, ghostMode, language, getToken, isLoggedIn, maxCredits, onReviewComplete]);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage: ChatMessage = { role: 'user', content: chatInput.trim(), timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    setError('');

    try {
      const token = await getToken();
      const effectiveGhost = ghostMode || !isLoggedIn;
      const data = await api.chat(token, chatInput, {
        reviewId,
        code,
        language,
        reviewResponse: reviewResult || undefined,
        ghostMode: effectiveGhost,
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date() }]);
    } catch (err: any) {
      console.error('[Chat] Error:', err);
      const msg = err.message || '';
      if (msg.includes('Cannot connect')) {
        setError('Cannot reach backend. Make sure the server is running.');
      } else if (msg.includes('busy') || msg.includes('429')) {
        setError('AI is busy. Wait 30 seconds and try again.');
      } else if (msg.includes('No code context')) {
        setError('Review your code first before chatting.');
      } else {
        setError(msg || 'Chat failed. Please try again.');
      }
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, reviewId, code, language, reviewResult, ghostMode, getToken]);

  const loadSampleCode = (sample: typeof sampleCodes[0]) => {
    setCode(sample.code);
    setLanguage(sample.value);
    setShowSampleDropdown(false);
    setReviewResult(null);
    setChatMessages([]);
    setHasReviewed(false);
    setReviewId(null);
    setError('');
  };

  const clearAll = () => {
    setCode('// Paste your code here or select a sample below...\n');
    setReviewResult(null);
    setChatMessages([]);
    setHasReviewed(false);
    setReviewId(null);
    setActiveTab('review');
    setError('');
  };

  const fileExt: Record<string, string> = {
    javascript: 'js', python: 'py', java: 'java', cpp: 'cpp', typescript: 'ts',
    rust: 'rs', go: 'go', csharp: 'cs', php: 'php', ruby: 'rb',
  };

  return (
    <div className="h-screen flex flex-col bg-[#050508] text-white overflow-hidden">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-[#08080C] border-b border-white/[0.04] shrink-0 z-20">
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle Spacer */}
          <div className="w-8 md:hidden" />
          
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#666] hover:text-white transition-colors text-[13px] font-medium">
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">{isLoggedIn ? 'Dashboard' : 'Home'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Language */}
          <div className="relative" ref={langDropdownRef}>
            <button onClick={() => { setShowLangDropdown(!showLangDropdown); setShowSampleDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] hover:border-[#D4AF37]/20 transition-all">
              <Code2 size={13} className="text-[#D4AF37]" />
              <span className="hidden sm:inline">{languageOptions.find(l => l.value === language)?.label}</span>
              <ChevronDown size={11} className={`text-[#555] transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showLangDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-1.5 left-0 w-44 bg-[#0F0F15] border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-60 overflow-y-auto">
                  {languageOptions.map(lang => (
                    <button key={lang.value} onClick={() => { setLanguage(lang.value); setShowLangDropdown(false); }}
                      className={`w-full px-3.5 py-2 text-[13px] text-left hover:bg-white/[0.03] transition-colors ${language === lang.value ? 'text-[#D4AF37] bg-[#D4AF37]/[0.04]' : 'text-[#888]'}`}>
                      {lang.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Samples */}
          <div className="relative" ref={sampleDropdownRef}>
            <button onClick={() => { setShowSampleDropdown(!showSampleDropdown); setShowLangDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] hover:border-[#D4AF37]/20 transition-all">
              <Sparkles size={13} className="text-[#D4AF37]" />
              <span className="hidden sm:inline">Samples</span>
              <ChevronDown size={11} className={`text-[#555] transition-transform ${showSampleDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showSampleDropdown && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-1.5 right-0 w-60 bg-[#0F0F15] border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                  <div className="px-3.5 py-2.5 border-b border-white/[0.04]">
                    <p className="text-[11px] text-[#555] font-semibold tracking-wider uppercase">Load Buggy Sample Code</p>
                  </div>
                  {sampleCodes.map(sample => (
                    <button key={sample.value} onClick={() => loadSampleCode(sample)}
                      className="w-full px-3.5 py-3 text-[13px] text-left hover:bg-white/[0.03] transition-colors text-[#888] hover:text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/[0.08] flex items-center justify-center shrink-0">
                        <AlertTriangle size={14} className="text-red-400" />
                      </div>
                      <div>
                        <div className="font-medium">{sample.language}</div>
                        <div className="text-[11px] text-[#555]">Critical vulnerabilities</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Ghost mode toggle — only for logged in users */}
          {isLoggedIn && (
            <button onClick={() => setGhostMode(!ghostMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all ${
                ghostMode ? 'bg-[#D4AF37]/[0.08] border border-[#D4AF37]/25 text-[#D4AF37]' : 'bg-white/[0.03] border border-white/[0.06] text-[#666] hover:text-white'
              }`} title="Ghost Mode: Code won't be saved">
              {ghostMode ? <EyeOff size={13} /> : <Eye size={13} />}
              <span className="hidden md:inline">{ghostMode ? 'Ghost ON' : 'Ghost'}</span>
            </button>
          )}

          {/* Credits — only for logged in users */}
          {isLoggedIn && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[12px]">
              <Shield size={12} className={credits.remaining > 0 ? 'text-[#D4AF37]' : 'text-red-400'} />
              <span className={credits.remaining > 0 ? 'text-[#888]' : 'text-red-400 font-medium'}>{credits.remaining}/{maxCredits}</span>
            </div>
          )}

          {/* Anonymous badge */}
          {!isLoggedIn && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/[0.06] border border-[#D4AF37]/15 rounded-xl text-[12px] text-[#D4AF37]">
              <EyeOff size={12} /> Free Mode
            </div>
          )}

          {hasReviewed && (
            <button onClick={clearAll} className="p-1.5 text-[#444] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/[0.05]" title="Clear all">
              <Trash2 size={15} />
            </button>
          )}

          <button onClick={handleReview} disabled={isReviewing || (isLoggedIn && credits.remaining <= 0 && !ghostMode)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all ${
              isReviewing || (isLoggedIn && credits.remaining <= 0 && !ghostMode) ? 'bg-white/[0.04] text-[#444] cursor-not-allowed' : 'btn-gold'
            }`}>
            {isReviewing ? (
              <><Loader2 size={14} className="animate-spin" /><span className="hidden sm:inline">Analyzing...</span></>
            ) : (isLoggedIn && credits.remaining <= 0 && !ghostMode) ? (
              <><X size={14} /><span className="hidden sm:inline">No Credits</span></>
            ) : (
              <><Sparkles size={14} /><span className="hidden sm:inline">Review Code</span></>
            )}
          </button>


        </div>
      </div>

      {/* Error bar */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/[0.06] border-b border-red-500/15 px-5 py-2.5 flex items-center gap-2 text-[13px] text-red-400 overflow-hidden"
          >
            <AlertCircle size={14} />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-red-400/50 hover:text-red-400"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-white/[0.04]" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0A0A0F] border-b border-white/[0.04] shrink-0">
            <div className="flex items-center gap-2.5 text-[11px] text-[#444]">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#FF5F56]" />
                <div className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                <div className="w-2 h-2 rounded-full bg-[#27C93F]" />
              </div>
              <FileCode size={11} />
              <span className="font-mono">code-review.{fileExt[language] || 'txt'}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#444]">
              {ghostMode && <span className="flex items-center gap-1 text-[#D4AF37]"><EyeOff size={10} /> Ghost</span>}
              <span className="font-mono">{code.split('\n').length} lines</span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <Editor height="100%" language={language} value={code} theme="vs-dark"
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false }, fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: 'on', scrollBeyondLastLine: false,
                automaticLayout: true, tabSize: 2, wordWrap: 'on',
                padding: { top: 16, bottom: 16 }, quickSuggestions: false,
                renderLineHighlight: 'line',
                scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
                overviewRulerBorder: false, hideCursorInOverviewRuler: true,
                renderWhitespace: 'none', contextmenu: true,
              }}
            />
          </div>
        </div>

        {/* Right: Review/Chat */}
        <div className="w-full md:w-[480px] lg:w-[540px] flex flex-col bg-[#050508] shrink-0 min-h-0">
          {/* Tabs */}
          <div className="flex items-center border-b border-white/[0.04] shrink-0">
            {(['review', 'chat'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-[13px] font-semibold transition-all relative ${
                  activeTab === tab ? 'text-[#D4AF37]' : 'text-[#444] hover:text-[#888]'
                }`}>
                {tab === 'review' ? <Shield size={14} /> : <MessageSquare size={14} />}
                {tab === 'review' ? 'Review' : 'Chat'}
                {tab === 'chat' && chatMessages.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#0A0A0A] text-[10px] font-black flex items-center justify-center">{chatMessages.length}</span>
                )}
                {activeTab === tab && <motion.div layoutId="editor-tab" className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#D4AF37] rounded-full" />}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'review' ? (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto">
                  {isReviewing ? (
                    <LoadingState />
                  ) : reviewResult ? (
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.04]">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                          <Shield size={16} className="text-[#0A0A0A]" />
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-[#D4AF37]">CodeGuard AI</div>
                          <div className="text-[11px] text-[#555]">Lead Architect & Security Engineer</div>
                        </div>
                        <div className="ml-auto text-[11px] text-[#444]">Just now</div>
                      </div>
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre: ({ children, ...props }) => {
                              // Extract text content from nested children recursively
                              const getText = (node: any): string => {
                                if (!node) return '';
                                if (typeof node === 'string') return node;
                                if (Array.isArray(node)) return node.map(getText).join('');
                                if (node.props && node.props.children) return getText(node.props.children);
                                return '';
                              };
                              
                              const text = getText(children);
                              
                              return (
                                <div className="relative group">
                                  <pre {...props}>{children}</pre>
                                  <button onClick={() => copyToClipboard(text, text.slice(0, 30))}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#555] hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                                    {copiedBlock === text.slice(0, 30) ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              );
                            }
                          }}
                        >
                          {reviewResult}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-6 pt-5 border-t border-white/[0.04] flex items-center gap-3">
                        <button onClick={() => setActiveTab('chat')}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] text-[#888] hover:text-white hover:border-[#D4AF37]/20 transition-all">
                          <MessageSquare size={14} /> Ask Follow-up
                        </button>
                        <button onClick={handleReview}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] text-[#888] hover:text-white hover:border-[#D4AF37]/20 transition-all">
                          <RotateCcw size={14} /> Re-analyze
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </motion.div>
              ) : (
                <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/[0.06] border border-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                          <Bot size={26} className="text-[#D4AF37]" />
                        </div>
                        <h3 className="text-[15px] font-bold text-white mb-1.5">AI Chat Assistant</h3>
                        <p className="text-[13px] text-[#555] max-w-xs mx-auto mb-6">
                          {hasReviewed ? "I've analyzed your code. Ask me anything about the review!" : "Review your code first, then chat about improvements."}
                        </p>
                        {hasReviewed && (
                          <div className="flex flex-wrap gap-2 justify-center">
                            {['How do I fix the SQL injection?', 'Explain JWT tokens', 'Performance tips?', 'How to use bcrypt?'].map(s => (
                              <button key={s} onClick={() => setChatInput(s)}
                                className="px-3.5 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[12px] text-[#777] hover:text-[#D4AF37] hover:border-[#D4AF37]/20 transition-all">{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                        className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center shrink-0 mt-0.5">
                            <Bot size={13} className="text-[#0A0A0A]" />
                          </div>
                        )}
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user' ? 'bg-[#D4AF37]/[0.08] border border-[#D4AF37]/15'
                            : 'bg-white/[0.02] border border-white/[0.05]'
                        }`}>
                          {msg.role === 'assistant' ? (
                            <div className="markdown-content text-[13px]">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-[13px] text-[#E0E0E0]">{msg.content}</p>
                          )}
                          <div className="text-[10px] text-[#333] mt-2">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                            <User size={13} className="text-[#666]" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {isChatLoading && (
                      <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center shrink-0">
                          <Bot size={13} className="text-[#0A0A0A]" />
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 py-3">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#D4AF37]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-[#D4AF37]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-[#D4AF37]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-3 border-t border-white/[0.04] shrink-0">
                    <div className="flex items-center gap-2">
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                        placeholder={hasReviewed ? "Ask about the review..." : "Review code first to enable chat..."}
                        disabled={!hasReviewed}
                        className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white placeholder-[#333] focus:outline-none focus:border-[#D4AF37]/25 transition-colors disabled:opacity-30" />
                      <button onClick={handleSendMessage} disabled={!chatInput.trim() || isChatLoading || !hasReviewed}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                          chatInput.trim() && !isChatLoading && hasReviewed
                            ? 'bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] text-[#0A0A0A] shadow-lg shadow-[#D4AF37]/20'
                            : 'bg-white/[0.03] text-[#333]'
                        }`}>
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading State ─── */
function LoadingState() {
  const steps = [
    { icon: Bug, text: 'Scanning for bugs & logic errors...', color: 'text-red-400', bg: 'bg-red-500/10' },
    { icon: Shield, text: 'Checking security vulnerabilities...', color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
    { icon: Gauge, text: 'Analyzing performance patterns...', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: Lightbulb, text: 'Generating architecture recommendations...', color: 'text-green-400', bg: 'bg-green-500/10' },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center mb-8 shadow-2xl shadow-[#D4AF37]/20">
        <Shield size={28} className="text-[#0A0A0A]" />
      </motion.div>
      <h3 className="text-lg font-bold mb-2">Analyzing Your Code</h3>
      <p className="text-[13px] text-[#555] mb-8">AI is running deep security & quality analysis via Gemini 3 Flash Preview...</p>
      <div className="space-y-2.5 w-full max-w-sm">
        {steps.map((step, i) => (
          <motion.div key={step.text} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.4, duration: 0.4 }}
            className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <div className={`w-7 h-7 rounded-lg ${step.bg} flex items-center justify-center`}>
              <step.icon size={14} className={step.color} />
            </div>
            <span className="text-[13px] text-[#777] flex-1">{step.text}</span>
            {i < 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 + 0.6 }}>
                <CheckCircle size={14} className="text-green-400" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/[0.06] border border-[#D4AF37]/10 flex items-center justify-center mb-6">
        <ShieldCheck size={28} className="text-[#D4AF37]" />
      </div>
      <h3 className="text-lg font-bold mb-2">Ready to Review</h3>
      <p className="text-[13px] text-[#555] text-center max-w-xs mb-8">
        Paste your code or load a sample, then click <strong className="text-[#D4AF37]">Review Code</strong>.
      </p>
      <div className="space-y-2 w-full max-w-xs">
        {[
          { step: '1', text: 'Paste code or load a sample', icon: FileCode },
          { step: '2', text: 'Click "Review Code" button', icon: Zap },
          { step: '3', text: 'Chat with AI for improvements', icon: MessageSquare },
        ].map(item => (
          <div key={item.step} className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/[0.06] flex items-center justify-center text-[12px] font-black text-[#D4AF37]">{item.step}</div>
            <span className="text-[13px] text-[#777]">{item.text}</span>
            <item.icon size={14} className="text-[#333] ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
