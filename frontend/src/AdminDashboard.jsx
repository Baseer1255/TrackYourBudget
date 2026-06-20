import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

const AdminDashboard = ({ session }) => {
  const [isVerified, setIsVerified] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [debugLog, setDebugLog] = useState([]);

  const log = (msg) => setDebugLog(prev => [...prev, msg]);

  useEffect(() => {
    const fetchAdminData = async () => {
      // 1. Verify Admin Status
      const { data: isAdmin, error: authError } = await supabase.rpc('is_admin');
      
      if (authError || !isAdmin) {
        setIsVerified(false);
        return;
      }
      setIsVerified(true);

      // 2. Fetch Live Stats
      const { data: liveStats } = await supabase.rpc('get_admin_dashboard_data');
      if (liveStats) setStats(liveStats);

      // 3. Fetch Pending Users Queue
      const { data: requestsData } = await supabase
        .from('pending_users')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (requestsData) setPendingRequests(requestsData);
    };

    fetchAdminData();
  }, [session]);

  // --- ACTIONS ---
  const handleApprove = async (id, email) => {
    const { error } = await supabase.from('pending_users').update({ status: 'approved' }).eq('id', id);
    if (!error) {
      setPendingRequests(prev => prev.filter(req => req.id !== id));
      alert(`Approved ${email}! They can now sign up.`);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    const { error } = await supabase.from('pending_users').delete().eq('id', id);
    if (!error) {
      setPendingRequests(prev => prev.filter(req => req.id !== id));
    }
  };

  if (isVerified === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-white">
        <div className="animate-spin w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="bg-slate-900 border border-red-900/50 p-8 rounded-2xl max-w-lg w-full text-center">
          <h2 className="text-red-400 font-black text-2xl mb-2">Security Breach Blocked</h2>
          <p className="text-slate-400 mb-6">Your account does not have clearance for this sector.</p>
          <Link to="/" className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-200">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-3xl font-black text-white tracking-wide flex items-center gap-3">
              <span className="text-blue-500">🛡️</span> System Control
            </h1>
            <p className="text-green-500 font-bold text-sm mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Encrypted Connection • {session.user.email}
            </p>
          </div>
          <Link to="/" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors">
            ← Exit Panel
          </Link>
        </div>

        {/* Real Live Data Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-slate-500 font-bold uppercase tracking-wider text-sm mb-2">Total Registered Users</h3>
            <p className="text-5xl font-black text-white">{stats ? stats.total_users : '...'}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-slate-500 font-bold uppercase tracking-wider text-sm mb-2">Active Workspaces</h3>
            <p className="text-5xl font-black text-blue-400">{stats ? stats.total_projects : '...'}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-slate-500 font-bold uppercase tracking-wider text-sm mb-2">Pending Requests</h3>
            <p className="text-5xl font-black text-amber-400">{pendingRequests.length}</p>
          </div>
        </div>

        {/* Pending Access Requests Table */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden mb-10">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              ⏳ Access Request Queue
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            {pendingRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-bold">
                No pending requests right now.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-sm uppercase tracking-wider">
                    <th className="p-4 font-bold">Requested Email</th>
                    <th className="p-4 font-bold">Date</th>
                    <th className="p-4 font-bold text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <AnimatePresence>
                    {pendingRequests.map((req) => (
                      <motion.tr 
                        key={req.id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                        className="hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-4 font-medium text-white">{req.email}</td>
                        <td className="p-4 text-slate-400 text-sm">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => handleRemove(req.id)}
                            className="text-red-400 hover:text-white font-bold text-sm bg-red-400/10 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleApprove(req.id, req.email)}
                            className="text-green-400 hover:text-white font-bold text-sm bg-green-400/10 hover:bg-green-600 px-4 py-2 rounded-lg transition-colors"
                          >
                            Approve Access
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default AdminDashboard;
