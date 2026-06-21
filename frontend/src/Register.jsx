import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Account created successfully! Checking credentials...");
      setTimeout(() => navigate('/login'), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-sm w-full mx-auto">
          <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-bold mb-8 shadow-sm">T</div>
          
         <h1 className="text-3xl font-bold tracking-tight mb-2 !text-black dark:!text-white">
  Join TrakYourBudget
</h1>
          <p className="text-sm text-gray-500 mb-6">Join TrakYourBudget to manage workspace funding seamlessly.</p>

          {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100 font-medium">{errorMsg}</div>}
          {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 text-xs rounded-md border border-green-100 font-medium">{successMsg}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email address <span className="text-red-500">*</span></label>
              <input type="email" required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input type="password" required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-black text-white font-medium py-2.5 rounded-md text-sm transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-8">Already have an account? <Link to="/login" className="text-black font-semibold hover:underline">Sign in</Link></p>
        </div>
      </div>
      <div className="hidden lg:block lg:w-[55%] relative">
        <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" alt="Artwork" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default Register;