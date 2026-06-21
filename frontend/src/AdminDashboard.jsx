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
      <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#121212] flex items-center justify-center p-8 text-gray-900 dark:text-white">
        <div className="animate-spin w-8 h-8 border-4 border-gray-200 dark:border-gray-800 border-t-black dark:border-t-white rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#121212] flex items-center justify-center p-8">
        <div className="bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-900/50 p-8 rounded-xl shadow-sm max-w-lg w-full text-center">
          <h2 className="text-red-600 dark:text-red-400 font-bold text-2xl mb-2">Security Breach Blocked</h2>
          <p className="text-gray-500 mb-6 text-sm">Your account does not have clearance for this sector.</p>
          <Link to="/" className="inline-block bg-black dark:bg-white text-white dark:text-black font-medium text-sm px-6 py-2.5 rounded-md transition-opacity hover:opacity-90">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#121212] p-4 sm:p-8 font-sans text-gray-900 dark:text-gray-100 selection:bg-gray-200 dark:selection:bg-gray-800">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 !text-black dark:!text-white">
              <span className="text-xl">🛡️</span> System Control
            </h1>
            <p className="text-gray-500 font-medium text-xs mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Encrypted Connection • {session.user.email}
            </p>
          </div>
          <Link to="/" className="px-4 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-[#242424] dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium transition-colors">
            ← Exit Panel
          </Link>
        </div>

        {/* Real Live Data Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-gray-500 font-semibold uppercase tracking-wider text-[10px] mb-2">Total Registered Users</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats ? stats.total_users : '...'}</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-gray-500 font-semibold uppercase tracking-wider text-[10px] mb-2">Active Workspaces</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats ? stats.total_projects : '...'}</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-gray-500 font-semibold uppercase tracking-wider text-[10px] mb-2">Pending Requests</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingRequests.length}</p>
          </div>
        </div>

        {/* Pending Access Requests Table */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mb-10">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a1a1a]">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              ⏳ Access Request Queue
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            {pendingRequests.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No pending requests right now.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#242424] text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wider">
                    <th className="p-4 font-semibold">Requested Email</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <AnimatePresence>
                    {pendingRequests.map((req) => (
                      <motion.tr 
                        key={req.id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                        className="hover:bg-gray-50 dark:hover:bg-[#242424] transition-colors"
                      >
                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{req.email}</td>
                        <td className="p-4 text-gray-500 text-xs">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => handleRemove(req.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded transition-colors"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleApprove(req.id, req.email)}
                            className="text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 px-3 py-1.5 rounded transition-colors"
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