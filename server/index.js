require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const MAX_FREE_CREDITS = 20;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.VERCEL_URL || '',
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const REVIEW_SYSTEM_PROMPT = `You are CodeGuard AI, acting as a Lead Software Architect and Senior Security Engineer with 15+ years of experience. You perform exhaustive code reviews focusing on correctness, security, performance, and maintainability.

CRITICAL FORMATTING RULES — follow these strictly:
1. Use ONLY standard Markdown. No HTML tags ever.
2. When writing comparison operators like less-than or greater-than, ALWAYS wrap them in inline code backticks like this: \`i < size\` or \`i <= size\` — NEVER write raw < or > outside code blocks.
3. All code examples must be in fenced code blocks with the language specified.
4. Use the exact section headers below.

Your response MUST follow this exact structure with these exact headers:

## 🚩 Issues Found
For EACH issue provide:
- A severity badge (🔴 Critical / 🟡 High / 🟠 Medium / 🟢 Low)
- The line number if identifiable
- A clear technical explanation
- The concrete impact

## 🛡️ Security Risks
Provide a Markdown table with columns: Risk | Severity | Category
Include CWE or OWASP references where applicable.
End with: **Overall Security Score: X/10** with a colored circle emoji (🔴 0-3, 🟠 4-5, 🟡 6-7, 🟢 8-10).

## ✅ Optimized Solution
Provide the COMPLETE corrected code in a single fenced code block with language tag.
Add inline comments explaining every change.

## 💡 Architecture Tips
Provide 5-8 numbered, actionable architecture-level recommendations.`;

const CHAT_SYSTEM_PROMPT = `You are CodeGuard AI, a Lead Software Architect and Security Engineer.
You are in a follow-up conversation about code that was previously reviewed.
Be specific, reference the original code, and provide code examples.
IMPORTANT: When writing comparison operators, always wrap in backticks.
Use clean Markdown formatting. Be thorough but concise.`;

// ─── Required Auth Middleware ───
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token.' });
    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Token verification failed.' });
  }
}

// ─── Optional Auth Middleware (works without login) ───
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.userId = user.id;
        req.userEmail = user.email;
      }
    } catch { /* ignore */ }
  }
  // No token = anonymous user, continue anyway
  next();
}

async function ensureUserProfile(userId, email) {
  if (!userId) return;
  const { data: existing } = await supabase.from('users').select('id').eq('id', userId).single();
  if (existing) return;
  const username = email ? email.split('@')[0] : 'user';
  await supabase.from('users').insert({ id: userId, username, email: email || '' });
}

async function getCreditStatus(userId) {
  if (!userId) return { used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS };
  await ensureUserProfile(userId, null);
  const { data: user, error } = await supabase.from('users').select('daily_count, last_review_date').eq('id', userId).single();
  if (error || !user) return { used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS };
  const today = new Date().toISOString().split('T')[0];
  const used = user.last_review_date === today ? (user.daily_count || 0) : 0;
  return { used, remaining: Math.max(0, MAX_FREE_CREDITS - used), maxCredits: MAX_FREE_CREDITS };
}

// ═══════════════ ROUTES ═══════════════

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', gemini: !!process.env.GEMINI_API_KEY, supabase: !!process.env.SUPABASE_URL, maxCredits: MAX_FREE_CREDITS });
});

app.get('/api/credits', authMiddleware, async (req, res) => {
  try {
    const credits = await getCreditStatus(req.userId);
    res.json(credits);
  } catch { res.json({ used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS }); }
});

// ─── REVIEW (works with OR without login) ───
app.post('/api/review', optionalAuth, async (req, res) => {
  const { code, language, ghostMode } = req.body;
  const isLoggedIn = !!req.userId;

  console.log(`[Review] ${isLoggedIn ? req.userEmail : 'ANONYMOUS'} | lang=${language} | ghost=${ghostMode || !isLoggedIn}`);

  if (!code || !code.trim()) return res.status(400).json({ error: 'No code provided.' });
  if (code.length > 50000) return res.status(400).json({ error: 'Code too long.' });

  const langLabel = { javascript:'JavaScript', python:'Python', java:'Java', cpp:'C++', typescript:'TypeScript', rust:'Rust', go:'Go', csharp:'C#', php:'PHP', ruby:'Ruby' }[language] || language;

  // Credit check only for logged-in users NOT in ghost mode
  if (isLoggedIn && !ghostMode) {
    const credits = await getCreditStatus(req.userId);
    if (credits.remaining <= 0) {
      return res.status(429).json({ error: `Daily limit reached (${MAX_FREE_CREDITS}/day). Enable Ghost Mode for unlimited.`, credits });
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview', systemInstruction: REVIEW_SYSTEM_PROMPT });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Review this ${langLabel} code:\n\`\`\`${language}\n${code}\n\`\`\`\nFollow the exact structure from your instructions.` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    });

    const aiResponse = result.response.text();
    let reviewId = null;
    let credits = { used: 0, remaining: MAX_FREE_CREDITS, maxCredits: MAX_FREE_CREDITS };

    // Save only if logged in AND not ghost mode
    if (isLoggedIn && !ghostMode) {
      await ensureUserProfile(req.userId, req.userEmail);
      const today = new Date().toISOString().split('T')[0];
      const { data: userData } = await supabase.from('users').select('daily_count, last_review_date').eq('id', req.userId).single();
      const newCount = userData?.last_review_date === today ? (userData?.daily_count || 0) + 1 : 1;
      await supabase.from('users').update({ daily_count: newCount, last_review_date: today }).eq('id', req.userId);

      const { data: review } = await supabase.from('reviews').insert({ user_id: req.userId, code, language, ai_feedback: { response: aiResponse } }).select('id').single();
      if (review) reviewId = review.id;
      credits = { used: newCount, remaining: Math.max(0, MAX_FREE_CREDITS - newCount), maxCredits: MAX_FREE_CREDITS };
    }

    res.json({ response: aiResponse, reviewId, credits, saved: !!reviewId });
  } catch (err) {
    console.error('[Review] Error:', err.message);
    if (err.message?.includes('API_KEY')) return res.status(500).json({ error: 'AI not configured.' });
    if (err.message?.includes('quota') || err.message?.includes('429')) return res.status(429).json({ error: 'AI busy. Try again.' });
    res.status(500).json({ error: 'Analysis failed. Try again.' });
  }
});

// ─── CHAT (works with OR without login) ───
app.post('/api/chat', optionalAuth, async (req, res) => {
  const { message, reviewId, code, language, reviewResponse, ghostMode } = req.body;
  const isLoggedIn = !!req.userId;

  if (!message?.trim()) return res.status(400).json({ error: 'No message.' });

  try {
    let contextCode = code || '';
    let contextReview = reviewResponse || '';

    // Try DB fetch for logged-in users with reviewId
    if (isLoggedIn && reviewId && !ghostMode) {
      try {
        const { data: review } = await supabase.from('reviews').select('code, language, ai_feedback').eq('id', reviewId).eq('user_id', req.userId).single();
        if (review) { contextCode = review.code; contextReview = review.ai_feedback?.response || ''; }
        const { data: msgs } = await supabase.from('chats').select('role, content').eq('review_id', reviewId).order('created_at', { ascending: true }).limit(20);
        // We'll reconstruct history from msgs below
      } catch {}
    }

    if (!contextCode) return res.status(400).json({ error: 'No code context. Review code first.' });

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview', systemInstruction: CHAT_SYSTEM_PROMPT });
    const history = [
      { role: 'user', parts: [{ text: `Code context:\n\`\`\`${language||'code'}\n${contextCode.substring(0,8000)}\n\`\`\`\nReview:\n${contextReview.substring(0,3000)}` }] },
      { role: 'model', parts: [{ text: 'Understood. I have full context. Ask me anything.' }] },
    ];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const aiResponse = result.response.text();

    // Save chat only if logged in and not ghost mode
    if (isLoggedIn && reviewId && !ghostMode) {
      try {
        await supabase.from('chats').insert([
          { review_id: reviewId, role: 'user', content: message },
          { review_id: reviewId, role: 'assistant', content: aiResponse },
        ]);
      } catch {}
    }

    res.json({ response: aiResponse });
  } catch (err) {
    console.error('[Chat] Error:', err.message);
    if (err.message?.includes('quota') || err.message?.includes('429')) return res.status(429).json({ error: 'AI busy. Try again.' });
    res.status(500).json({ error: 'Chat failed.' });
  }
});

// ─── History & Delete (login required) ───
app.get('/api/history', authMiddleware, async (req, res) => {
  try {
    const { data: reviews } = await supabase.from('reviews').select('id, language, created_at, code, ai_feedback').eq('user_id', req.userId).order('created_at', { ascending: false }).limit(50);
    const langCounts = {};
    (reviews||[]).forEach(r => { langCounts[r.language] = (langCounts[r.language]||0)+1; });
    let critCount = 0;
    (reviews||[]).forEach(r => { if (r.ai_feedback?.response?.includes('🔴 Critical')) critCount++; });
    const credits = await getCreditStatus(req.userId);
    res.json({
      reviews: reviews||[],
      stats: { totalReviews: reviews?.length||0, criticalFound: critCount, topLanguage: Object.entries(langCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—', languagesUsed: Object.keys(langCounts).length, credits }
    });
  } catch { res.status(500).json({ error: 'Failed to fetch history.' }); }
});

app.delete('/api/reviews/:id', authMiddleware, async (req, res) => {
  try {
    await supabase.from('reviews').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Delete failed.' }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`\n  🛡️ CodeGuard AI v2 on :${PORT}\n  Gemini: ${!!process.env.GEMINI_API_KEY ? '✅' : '❌'} | Supabase: ${!!process.env.SUPABASE_URL ? '✅' : '❌'}\n`));
