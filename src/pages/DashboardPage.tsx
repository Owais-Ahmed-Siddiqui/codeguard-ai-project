import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Code2, Trash2, Clock,
  AlertTriangle, ChevronRight, Loader2, Sparkles,
  ShieldCheck, ArrowLeft, LogOut, ExternalLink,
  Calendar, Hash, Zap, Copy, Check, RefreshCw,
  Wifi, WifiOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface DashboardProps {
  onNewReview: () => void;
  onBack: () => void;
  onViewReview: (review: HistoryReview) => void;
}

interface HistoryReview {
  id: string;
  language: string;
  created_at: string;
  code: string;
  ai_feedback: { response: string } | null;
}

interface DashStats {
  totalReviews: number;
  criticalFound: number;
  topLanguage: string;
  languagesUsed: number;
  credits: { used: number; remaining: number };
}

const langColors: Record<string, string> = {
  javascript: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  python: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  java: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cpp: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  typescript: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  rust: 'bg-red-500/10 text-red-400 border-red-500/20',
  go: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  csharp: 'bg-green-500/10 text-green-400 border-green-500/20',
  php: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  ruby: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const langLabels: Record<string, string> = {
  javascript: 'JavaScript', python: 'Python', java: 'Java', cpp: 'C++',
  typescript: 'TypeScript', rust: 'Rust', go: 'Go', csharp: 'C#',
  php: 'PHP', ruby: 'Ruby',
};

export default function DashboardPage({ onNewReview, onBack, onViewReview }: DashboardProps) {
  const { user, signOut } = useAuth();
  const [reviews, setReviews] = useState<HistoryReview[]>([]);
  const [stats, setStats] = useState<DashStats>({
    totalReviews: 0, criticalFound: 0, topLanguage: '—',
    languagesUsed: 0, credits: { used: 0, remaining: 5 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [backendInfo, setBackendInfo] = useState<{ gemini: boolean; supabase: boolean } | null>(null);

  const getToken = useCallback(async (): Promise<string> => {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    throw new Error('Not authenticated — please sign in again.');
  }, []);

  // Check backend health on mount
  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    setBackendStatus('checking');
    try {
      const data = await api.health();
      setBackendStatus('connected');
      setBackendInfo({ gemini: data.gemini, supabase: data.supabase });
      console.log('[Dashboard] Backend connected:', data);
    } catch (err: any) {
      setBackendStatus('disconnected');
      setBackendInfo(null);
      console.error('[Dashboard] Backend check failed:', err.message);
    }
  };

  // Fetch history after health check
  useEffect(() => {
    if (backendStatus === 'connected') {
      fetchHistory();
    } else if (backendStatus === 'disconnected') {
      setLoading(false);
      setError('Cannot connect to backend server. Start it with: cd server && npm run dev');
    }
  }, [backendStatus]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const data = await api.getHistory(token);
      console.log('[Dashboard] History loaded:', data.reviews?.length, 'reviews');
      setReviews(data.reviews || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      console.error('[Dashboard] Fetch error:', err);
      setError(err.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      const token = await getToken();
      await api.deleteReview(token, id);
      setReviews(prev => prev.filter(r => r.id !== id));
      setStats(prev => ({ ...prev, totalReviews: Math.max(0, prev.totalReviews - 1) }));
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeleteId(null);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    onBack();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const getCodePreview = (code: string) =>
    code.split('\n').filter(l => l.trim()).slice(0, 3).join('\n');

  const getScoreFromFeedback = (feedback: string | null) => {
    if (!feedback) return null;
    const match = feedback.match(/Security Score:\s*(\d+)\/10/);
    return match ? parseInt(match[1]) : null;
  };

  const username = user?.email?.split('@')[0] || 'Developer';

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* ─── Header ─── */}
      <div className="border-b border-white/[0.04] bg-[#08080C]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-[#666] hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="w-px h-5 bg-white/[0.06]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center">
                <Shield size={13} className="text-[#0A0A0A]" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-sm">Code<span className="gold-gradient-text">Guard</span> AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Backend status */}
            <button onClick={checkBackend} title="Check backend connection"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${
                backendStatus === 'connected'
                  ? 'bg-green-500/[0.06] border-green-500/20 text-green-400'
                  : backendStatus === 'disconnected'
                  ? 'bg-red-500/[0.06] border-red-500/20 text-red-400'
                  : 'bg-white/[0.03] border-white/[0.06] text-[#666]'
              }`}>
              {backendStatus === 'checking' ? <Loader2 size={11} className="animate-spin" /> :
               backendStatus === 'connected' ? <Wifi size={11} /> : <WifiOff size={11} />}
              <span className="hidden sm:inline">
                {backendStatus === 'connected' ? 'Connected' : backendStatus === 'disconnected' ? 'Offline' : 'Checking...'}
              </span>
            </button>

            <button onClick={onNewReview}
              className="btn-gold px-5 py-2 text-[13px] flex items-center gap-2">
              <Plus size={14} /> New Review
            </button>
            <button onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[12px] text-[#666] hover:text-red-400 transition-all">
              <LogOut size={13} />
              <span className="hidden sm:inline max-w-[100px] truncate">{user?.email}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
        {/* ─── Welcome ─── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
            Welcome back, <span className="gold-gradient-text">{username}</span>
          </h1>
          <p className="text-[#666] text-[15px]">Here's your code review dashboard.</p>
        </motion.div>

        {/* ─── Backend Status Banner ─── */}
        <AnimatePresence>
          {backendStatus === 'disconnected' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 rounded-2xl bg-red-500/[0.04] border border-red-500/15 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <WifiOff size={22} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-red-400 mb-1">Backend Server Not Connected</h3>
                  <p className="text-[13px] text-[#888] mb-3">
                    The AI review features require the backend server to be running. Start it in a new terminal:
                  </p>
                  <div className="bg-[#08080C] border border-white/[0.06] rounded-xl p-3 font-mono text-[12px] text-[#888]">
                    <span className="text-[#D4AF37]">$</span> cd server<br/>
                    <span className="text-[#D4AF37]">$</span> npm install <span className="text-[#555]"># first time only</span><br/>
                    <span className="text-[#D4AF37]">$</span> npm run dev
                  </div>
                  <p className="text-[12px] text-[#555] mt-2">
                    Also make sure <code className="text-[#D4AF37]">server/.env</code> has your Gemini API key and Supabase credentials.
                  </p>
                  <button onClick={checkBackend} className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-[13px] text-red-400 hover:bg-red-500/[0.12] transition-all">
                    <RefreshCw size={13} /> Retry Connection
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Backend Service Status ─── */}
        {backendStatus === 'connected' && backendInfo && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/[0.04] border border-green-500/15 text-[12px]">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-400 font-medium">Backend Connected</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] ${
              backendInfo.gemini ? 'bg-green-500/[0.04] border-green-500/15 text-green-400' : 'bg-red-500/[0.04] border-red-500/15 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${backendInfo.gemini ? 'bg-green-400' : 'bg-red-400'}`} />
              Gemini AI {backendInfo.gemini ? 'Ready' : 'Missing Key'}
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] ${
              backendInfo.supabase ? 'bg-green-500/[0.04] border-green-500/15 text-green-400' : 'bg-red-500/[0.04] border-red-500/15 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${backendInfo.supabase ? 'bg-green-400' : 'bg-red-400'}`} />
              Supabase {backendInfo.supabase ? 'Connected' : 'Missing Config'}
            </div>
          </motion.div>
        )}

        {/* ─── Stats Cards ─── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Code2, label: 'Total Reviews', value: stats.totalReviews, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10', border: 'border-[#D4AF37]/20' },
            { icon: AlertTriangle, label: 'Critical Issues Found', value: stats.criticalFound, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            { icon: Hash, label: 'Languages Used', value: stats.languagesUsed, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { icon: Shield, label: 'Credits Remaining', value: `${stats.credits.remaining}/5`, color: stats.credits.remaining > 0 ? 'text-green-400' : 'text-red-400', bg: stats.credits.remaining > 0 ? 'bg-green-500/10' : 'bg-red-500/10', border: stats.credits.remaining > 0 ? 'border-green-500/20' : 'border-red-500/20' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className={`glass-card-static p-5 border ${card.border}`}>
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon size={18} className={card.color} />
              </div>
              <div className="text-2xl font-black">{card.value}</div>
              <div className="text-[12px] text-[#666] mt-0.5">{card.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Quick Actions ─── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <button onClick={onNewReview} className="glass-card p-5 flex items-center gap-4 group text-left" style={{ transform: 'none' }}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
              <Sparkles size={22} className="text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold mb-0.5">New Code Review</div>
              <div className="text-[12px] text-[#666]">Paste code and get AI analysis</div>
            </div>
            <ChevronRight size={18} className="text-[#333] group-hover:text-[#D4AF37] transition-colors" />
          </button>
          <div className="glass-card-static p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <ShieldCheck size={22} className="text-green-400" />
            </div>
            <div>
              <div className="text-[15px] font-bold mb-0.5">Top Language</div>
              <div className="text-[12px] text-[#666]">{langLabels[stats.topLanguage] || stats.topLanguage || '—'}</div>
            </div>
          </div>
          <div className="glass-card-static p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Zap size={22} className="text-purple-400" />
            </div>
            <div>
              <div className="text-[15px] font-bold mb-0.5">Today's Credits</div>
              <div className="text-[12px] text-[#666]">{stats.credits.used} used · {stats.credits.remaining} remaining</div>
            </div>
          </div>
        </motion.div>

        {/* ─── Reviews Section ─── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Review History</h2>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#555]">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
              {backendStatus === 'connected' && (
                <button onClick={fetchHistory} className="p-1.5 text-[#555] hover:text-[#D4AF37] transition-colors" title="Refresh">
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
              <span className="ml-3 text-[#666]">Loading reviews...</span>
            </div>
          ) : error ? (
            <div className="glass-card-static p-8 text-center">
              <AlertTriangle size={24} className="text-red-400 mx-auto mb-3" />
              <p className="text-[#888] text-sm mb-2">{error}</p>
              <p className="text-[12px] text-[#555] mb-4">Check the browser console (F12) for more details.</p>
              <button onClick={() => { checkBackend(); fetchHistory(); }} className="btn-outline-gold px-4 py-2 text-sm">
                Retry
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="glass-card-static p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/[0.06] border border-[#D4AF37]/10 flex items-center justify-center mx-auto mb-5">
                <Code2 size={28} className="text-[#D4AF37]" />
              </div>
              <h3 className="text-lg font-bold mb-2">No Reviews Yet</h3>
              <p className="text-[#666] text-sm mb-6 max-w-sm mx-auto">
                Start your first AI-powered code review. Paste code, detect bugs, and get security insights.
              </p>
              <button onClick={onNewReview} className="btn-gold px-6 py-3 text-sm inline-flex items-center gap-2">
                <Plus size={15} /> Start Your First Review
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {reviews.map((review, i) => {
                  const score = getScoreFromFeedback(review.ai_feedback?.response || null);
                  const scoreColor = score
                    ? score > 7 ? 'text-green-400' : score > 4 ? 'text-yellow-400' : 'text-red-400'
                    : null;
                  const isExpanded = expandedId === review.id;

                  return (
                    <motion.div key={review.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="glass-card-static overflow-hidden">
                      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : review.id)}>
                        <div className={`shrink-0 px-3 py-1.5 rounded-lg border text-[11px] font-bold font-mono ${
                          langColors[review.language] || 'bg-white/5 text-[#888] border-white/10'
                        }`}>
                          {langLabels[review.language] || review.language}
                        </div>
                        <div className="flex-1 min-w-0 hidden sm:block">
                          <code className="text-[12px] text-[#555] font-mono truncate block">
                            {getCodePreview(review.code)}
                          </code>
                        </div>
                        {score !== null && (
                          <div className={`text-sm font-bold ${scoreColor} shrink-0`}>{score}/10</div>
                        )}
                        <div className="flex items-center gap-1.5 text-[12px] text-[#555] shrink-0">
                          <Calendar size={11} />{formatDate(review.created_at)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#444] shrink-0 hidden md:flex">
                          <Clock size={10} />{formatTime(review.created_at)}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); onViewReview(review); }}
                            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#555] hover:text-[#D4AF37] hover:border-[#D4AF37]/20 transition-all"
                            title="Open in editor">
                            <ExternalLink size={13} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(review.id); }}
                            disabled={deleteId === review.id}
                            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#555] hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-40"
                            title="Delete">
                            {deleteId === review.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                          <ChevronRight size={14} className={`text-[#444] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                            <div className="px-5 pb-5 pt-2 border-t border-white/[0.04]">
                              <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Code</span>
                                    <button onClick={() => copyCode(review.code, review.id)}
                                      className="flex items-center gap-1 text-[11px] text-[#555] hover:text-[#D4AF37] transition-colors">
                                      {copiedId === review.id ? <><Check size={11} className="text-green-400" /> Copied</> : <><Copy size={11} /> Copy</>}
                                    </button>
                                  </div>
                                  <pre className="bg-[#08080C] border border-white/[0.04] rounded-xl p-4 font-mono text-[12px] text-[#888] max-h-[200px] overflow-auto whitespace-pre-wrap leading-relaxed">
                                    {review.code}
                                  </pre>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">AI Analysis</span>
                                    {score !== null && <span className={`text-[11px] font-bold ${scoreColor}`}>Score: {score}/10</span>}
                                  </div>
                                  <div className="bg-[#08080C] border border-white/[0.04] rounded-xl p-4 text-[12px] text-[#888] max-h-[200px] overflow-auto leading-relaxed">
                                    {review.ai_feedback?.response ? (
                                      <div dangerouslySetInnerHTML={{
                                        __html: review.ai_feedback.response
                                          .replace(/</g, '&lt;').replace(/>/g, '&gt;')
                                          .replace(/`([^`]+)`/g, '<code class="bg-[#D4AF37]/10 text-[#E8C547] px-1 rounded text-[11px]">$1</code>')
                                          .replace(/## (.+)/g, '<div class="text-[#D4AF37] font-bold text-[13px] mt-3 mb-1">$1</div>')
                                          .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
                                          .replace(/\n/g, '<br/>')
                                      }} />
                                    ) : <span className="text-[#444]">No feedback available</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
