import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorMsg(error.message);
    else navigate('/');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-sm w-full mx-auto">
          <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-bold mb-8 shadow-sm">T</div>
          
          <h1 className="text-3xl font-bold tracking-tight mb-2 !text-black dark:!text-white">
  Sign in to TrakYourBudget
</h1>

          {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100 font-medium">{errorMsg}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email address <span className="text-red-500">*</span></label>
              <input type="email" required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input type="password" required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="flex justify-between items-center py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-black focus:ring-black" />
                <span className="text-xs text-gray-600">Remember for 30 days</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-gray-600 hover:text-black font-medium transition-colors">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-black text-white font-medium py-2.5 rounded-md text-sm transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-8">Don't have an account? <Link to="/register" className="text-black font-semibold hover:underline">Sign up</Link></p>
        </div>
      </div>
      <div className="hidden lg:block lg:w-[55%] relative">
        <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" alt="Abstract landscape" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default Login;