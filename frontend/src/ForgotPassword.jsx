import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setMessage('');
    
    // Sends the reset link via Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMessage('Password reset link sent! Check your email inbox.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-sm w-full mx-auto">
          <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-bold mb-8 shadow-sm">T</div>
          
          <h1 className="text-2xl font-serif text-gray-900 tracking-tight mb-2">Reset your password</h1>
          <p className="text-sm text-gray-500 mb-8">Enter your account email address to receive a reset link.</p>

          {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100 font-medium">{errorMsg}</div>}
          {message && <div className="mb-4 p-3 bg-green-50 text-green-700 text-xs rounded-md border border-green-100 font-medium">{message}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email address <span className="text-red-500">*</span></label>
              <input type="email" required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-black text-white font-medium py-2.5 rounded-md text-sm transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-6">
            Remembered it? <Link to="/login" className="text-black font-semibold hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-[55%] relative">
        <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" alt="Artwork" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default ForgotPassword;