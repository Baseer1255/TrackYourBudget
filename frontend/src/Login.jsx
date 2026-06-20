import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); 
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        setMessage('✨ Welcome! Check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage('❌ Please enter your email address first.');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage('✅ Password reset link sent! Please check your inbox.');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Premium Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl shadow-slate-200/50 dark:shadow-none relative z-10"
      >
        <div className="text-center mb-8">
          {/* CUSTOM LOGO */}
       {/* CUSTOM LOGO */}
          <img 
            src="/logo.png" 
            alt="TrakYourBudget Logo" 
            className="h-28 w-auto mx-auto mb-4 object-contain drop-shadow-2xl mix-blend-screen dark:mix-blend-lighten"
          />
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            {isForgotPassword 
              ? 'Enter your email to receive a secure reset link.' 
              : isSignUp 
                ? 'Start managing your wealth today.' 
                : 'Enter your credentials to access your dashboard.'}
          </p>
        </div>

        <form onSubmit={isForgotPassword ? handleResetPassword : handleAuth} className="space-y-4">
          
          <AnimatePresence>
            {isSignUp && !isForgotPassword && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="relative group">
                  <span className="absolute left-4 top-3.5 text-slate-400">👤</span>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    required={isSignUp}
                    className="w-full pl-11 pr-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:font-medium text-slate-900 dark:text-white"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <span className="absolute left-4 top-3.5 text-slate-400">✉️</span>
            <input 
              type="email" 
              placeholder="Email address" 
              required
              className="w-full pl-11 pr-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:font-medium text-slate-900 dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <AnimatePresence>
            {!isForgotPassword && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="relative group">
                  <span className="absolute left-4 top-3.5 text-slate-400">🔒</span>
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required={!isForgotPassword}
                    className="w-full pl-11 pr-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:font-medium text-slate-900 dark:text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                {!isSignUp && (
                  <div className="flex justify-end mt-2">
                    <button 
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setMessage(''); }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {message && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-4 p-3 rounded-lg text-sm font-bold text-center ${message.includes('❌') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
            {message}
          </motion.div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          {isForgotPassword ? (
            <button 
              onClick={() => { setIsForgotPassword(false); setMessage(''); }} 
              className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
              ← Back to Sign In
            </button>
          ) : (
            <p className="text-sm font-medium text-slate-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button 
                onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} 
                className="ml-2 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;