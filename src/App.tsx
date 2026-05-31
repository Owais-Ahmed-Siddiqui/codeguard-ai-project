import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Workspace from './pages/Workspace';
import { Loader2, Shield } from 'lucide-react';

type Page = 'landing' | 'auth' | 'workspace';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const { loading } = useAuth();

  const handleGetStarted = () => setCurrentPage('workspace');
  const handleSignIn = () => setCurrentPage('auth');
  const handleAuthSuccess = () => setCurrentPage('workspace');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#A68B2A] flex items-center justify-center shadow-xl shadow-[#D4AF37]/20">
            <Shield size={24} className="text-[#0A0A0A]" />
          </div>
          <div className="flex items-center gap-2 text-[#666]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {currentPage === 'landing' && (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <LandingPage onGetStarted={handleGetStarted} onSignIn={handleSignIn} />
        </motion.div>
      )}
      {currentPage === 'auth' && (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <AuthPage onBack={() => setCurrentPage('landing')} onSuccess={handleAuthSuccess} />
        </motion.div>
      )}
      {currentPage === 'workspace' && (
        <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-screen overflow-hidden">
          <Workspace 
            onAuth={() => setCurrentPage('auth')} 
            onHome={() => setCurrentPage('landing')} 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
