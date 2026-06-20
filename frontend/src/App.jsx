import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './Login';
import CreateProject from './CreateProject';
import ProjectDetails from './ProjectDetails';
import AdminDashboard from './AdminDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './useTheme';

function Dashboard({ session, isDarkMode, toggleTheme }) {
  const [projects, setProjects] = useState([]);
  const [globalTransactions, setGlobalTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [magicCommand, setMagicCommand] = useState('');
  const [isProcessingMagic, setIsProcessingMagic] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // User details
  const userEmail = session.user.email;
  const fullName = session.user.user_metadata?.full_name || 'Valued User';
  const displayName = fullName.split(' ')[0] || userEmail.split('@')[0];
  const isAdmin = userEmail === 'baseerurrehman1255@gmail.com';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    setEditFullName(fullName);
  }, [fullName]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const { data: projData } = await supabase
      .from('projects')
      .select('*')
      .or(`owner_id.eq.${session.user.id},collaborators.cs.{${session.user.email}}`)
      .order('created_at', { ascending: false });

    const { data: txData } = await supabase
      .from('transactions')
      .select('created_at')
      .eq('user_id', session.user.id);

    if (projData) setProjects(projData);
    if (txData) setGlobalTransactions(txData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [session.user.id]);

  const handleOpenLeaderboard = async () => {
    setIsLeaderboardOpen(true);
    setIsLoadingLeaderboard(true);
    const { data } = await supabase.rpc('get_global_leaderboard');
    if (data) setLeaderboardData(data);
    setIsLoadingLeaderboard(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editFullName.trim()) return;
    setIsUpdatingProfile(true);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: editFullName }
    });

    setIsUpdatingProfile(false);
    if (error) {
      showToast(`❌ Error: ${error.message}`);
    } else {
      showToast('✅ Profile updated successfully!');
      setIsEditingProfile(false);
    }
  };

  const globalBudget = projects.reduce((sum, proj) => sum + Number(proj.total_budget), 0);

  const handleMagicCommand = async (e) => {
    e.preventDefault();
    if (!magicCommand || projects.length === 0) return;
    setIsProcessingMagic(true);

    const amountMatch = magicCommand.match(/\$?(\d+(\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

    let category = 'General';
    const lowerCmd = magicCommand.toLowerCase();
    if (lowerCmd.includes('food') || lowerCmd.includes('eat')) category = 'Food & Dining';
    if (lowerCmd.includes('uber') || lowerCmd.includes('flight')) category = 'Travel';
    if (lowerCmd.includes('buy') || lowerCmd.includes('amazon')) category = 'Shopping';

    if (!amount) { showToast("❌ Couldn't find a price."); setIsProcessingMagic(false); return; }

    const { error } = await supabase.from('transactions').insert([{ project_id: projects[0].id, user_id: session.user.id, name: `Quick Log: ${magicCommand}`, amount, category }]);
    if (!error) { setMagicCommand(''); showToast(`✨ Magic logged $${amount}!`); fetchDashboardData(); }
    setIsProcessingMagic(false);
  };

  const badges = [
    { id: 1, icon: '🚀', name: 'Pioneer', earned: true, description: 'Created an account' },
    { id: 2, icon: '📈', name: 'Tracker', earned: globalTransactions.length > 0, description: 'Logged first expense' },
    { id: 3, icon: '💎', name: 'Wealthy', earned: globalBudget > 5000, description: 'Tracked over $5k' },
    { id: 4, icon: '🛡️', name: 'Admin', earned: isAdmin, description: 'System Administrator' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8 font-sans transition-colors duration-300 flex flex-col relative selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* GLOWING BACKGROUND ORBS */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto w-full flex-grow relative z-10">

        {/* GLASSMORPHISM HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-sm transition-all gap-4 md:gap-0">
          <div className="flex items-center gap-4">
           {/* CUSTOM LOGO */}
            <img 
              src="/logo.png" 
              alt="TrakYourBudget Logo" 
              className="h-14 w-auto object-contain mix-blend-screen dark:mix-blend-lighten"
            />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{greeting}, <span className="text-indigo-600 dark:text-indigo-400">{displayName}</span> 👋</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={handleOpenLeaderboard} className="px-4 py-2 text-xs font-extrabold uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm active:scale-95">
              🏆 Leaderboard
            </button>
            {isAdmin && <Link to="/admin" className="px-4 py-2 text-xs font-extrabold uppercase tracking-widest bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors">🛡️ Admin</Link>}
            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all active:scale-95">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95">
               <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
               </div>
            </button>
          </div>
        </div>

        {/* MAGIC COMMAND */}
        {projects.length > 0 && (
          <form onSubmit={handleMagicCommand} className="mb-8 relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-xl">✨</div>
            <input type="text" placeholder="Magic Log: Type 'Spent $45 on Uber'..." className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-4 pl-14 pr-32 text-sm outline-none text-slate-900 dark:text-white shadow-sm transition-all font-semibold" value={magicCommand} onChange={(e) => setMagicCommand(e.target.value)} />
            <button type="submit" disabled={isProcessingMagic || !magicCommand} className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 rounded-xl transition-transform active:scale-95 disabled:opacity-50 shadow-sm text-sm">
              {isProcessingMagic ? 'Processing...' : 'Auto-Log'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          
          {/* HERO STATS */}
          <div className="lg:col-span-3 p-8 bg-slate-900 rounded-3xl shadow-xl border border-slate-800 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full blur-[80px]"></div>
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-slate-400 font-extrabold uppercase tracking-widest text-[10px] mb-2">Global Wealth Tracked</h2>
              <p className="text-5xl font-black tracking-tight text-white">${globalBudget.toFixed(2)}</p>
            </div>
            <div className="relative z-10 flex gap-4 text-center">
              <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 min-w-[120px]">
                <p className="text-3xl font-black">{projects.length}</p>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">Workspaces</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 min-w-[120px]">
                <p className="text-3xl font-black text-emerald-400">Active</p>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">System Status</p>
              </div>
            </div>
          </div>

          {/* BADGES */}
          <div className="lg:col-span-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-widest text-[10px] mb-4">Badges Earned</h3>
            <div className="grid grid-cols-2 gap-3">
              {badges.map(badge => (
                <div key={badge.id} title={badge.description} className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${badge.earned ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-50 grayscale'}`}>
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <CreateProject userId={session.user.id} onProjectCreated={fetchDashboardData} />
          </div>

          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Your Workspaces</h2>
            {isLoading ? (
              <div className="animate-pulse flex gap-2"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div><div className="w-3 h-3 bg-indigo-500 rounded-full"></div></div>
            ) : projects.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 font-semibold shadow-sm">
                <div className="text-4xl mb-4">🚀</div>
                You haven't created any budget workspaces yet. Start one on the left!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <div key={project.id} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    {project.owner_id !== session.user.id && (
                      <span className="absolute top-4 right-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">Shared</span>
                    )}
                    <h3 className="font-extrabold text-xl text-slate-900 dark:text-white mb-1 tracking-tight truncate pr-16">{project.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-semibold text-xs uppercase tracking-wider">
                      Capital: <span className="text-indigo-600 dark:text-indigo-400">${project.total_budget}</span>
                    </p>
                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
                      <span className="text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1.5 text-xs">
                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                        {project.collaborators?.length > 0 ? `${project.collaborators.length + 1} Members` : 'Active'}
                      </span>
                      <Link to={`/project/${project.id}`} className="text-white bg-slate-900 dark:bg-indigo-600 px-4 py-2 rounded-lg font-bold text-xs shadow-sm hover:scale-105 transition-transform active:scale-95">
                        Open →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* PROFILE SLIDE-OUT MENU */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl relative z-10 border-l border-slate-200 dark:border-slate-800 flex flex-col">
              
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">Account Profile</h2>
                <button onClick={() => setIsProfileOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-slate-500">✕</button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl text-white flex items-center justify-center text-4xl font-black shadow-lg shadow-indigo-500/30 mb-5 relative group">
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="w-full space-y-3 px-2">
                      <input 
                        type="text" 
                        value={editFullName} 
                        onChange={(e) => setEditFullName(e.target.value)} 
                        placeholder="Enter full name"
                        className="w-full text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-lg font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsEditingProfile(false); setEditFullName(fullName); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors">Cancel</button>
                        <button type="submit" disabled={isUpdatingProfile} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors shadow-sm">
                          {isUpdatingProfile ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 group">
                        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{fullName}</h3>
                        <button onClick={() => setIsEditingProfile(true)} className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100 p-1" title="Edit Profile">
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-slate-500 mt-1">{userEmail}</p>
                      <span className="mt-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Verified User</span>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Workspaces Owned</span>
                    <span className="font-black text-lg text-slate-900 dark:text-white">{projects.filter(p => p.owner_id === session.user.id).length}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Wealth</span>
                    <span className="font-black text-lg text-indigo-600 dark:text-indigo-400">${globalBudget.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => supabase.auth.signOut()} className="w-full py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-xl transition-colors shadow-sm active:scale-[0.98]">
                  Sign Out Securely
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEADERBOARD MODAL */}
      <AnimatePresence>
        {isLeaderboardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsLeaderboardOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl relative z-10 overflow-hidden">
              
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-center relative">
                <button onClick={() => setIsLeaderboardOpen(false)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold transition-colors">✕</button>
                <div className="text-5xl mb-2 drop-shadow-md">🏆</div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Global Leaderboard</h2>
                <p className="text-amber-100 font-bold mt-1 text-[10px] uppercase tracking-widest">Top Managed Workspaces</p>
              </div>

              <div className="p-2 md:p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {isLoadingLeaderboard ? (
                  <div className="py-12 text-center text-slate-500 font-bold animate-pulse">Calculating rankings...</div>
                ) : leaderboardData.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 font-bold">No workspaces ranked yet!</div>
                ) : (
                  <ul className="space-y-3">
                    {leaderboardData.map((lb) => {
                      let rankStyle = "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700";
                      let medal = `#${lb.rank}`;
                      if (lb.rank === 1) { rankStyle = "bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/50 shadow-md scale-[1.02] z-10"; medal = "🥇"; }
                      if (lb.rank === 2) { rankStyle = "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 shadow-sm"; medal = "🥈"; }
                      if (lb.rank === 3) { rankStyle = "bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800/50 shadow-sm"; medal = "🥉"; }

                      const isMine = projects.some(p => p.name === lb.project_name);

                      return (
                        <li key={lb.rank} className={`flex items-center justify-between p-4 rounded-2xl border transition-all relative ${rankStyle} ${isMine ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-8 text-xl font-black text-center">{medal}</div>
                            <div>
                              <p className="font-extrabold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
                                {lb.project_name}
                                {isMine && <span className="text-[9px] bg-indigo-500 text-white px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">You</span>}
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1 mt-0.5">
                                👥 {lb.team_size} Member{lb.team_size > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-lg text-slate-900 dark:text-white">${Number(lb.total_budget).toLocaleString()}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl shadow-slate-900/20 border border-slate-800 text-sm font-bold z-50 flex items-center gap-2">
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- GLOBAL APP COMPONENT WITH PASSWORD RECOVERY LISTENER ---
function App() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [session, setSession] = useState(null);
  
  // States for handling the Password Recovery URL return
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMessage('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setPasswordMessage(`❌ ${error.message}`);
      setIsUpdatingPassword(false);
    } else {
      setPasswordMessage('✅ Password secured! Taking you to dashboard...');
      setTimeout(() => {
        setIsRecoveringPassword(false);
        setNewPassword('');
        setPasswordMessage('');
        setIsUpdatingPassword(false);
      }, 2000);
    }
  };

  if (!session && !isRecoveringPassword) return <Login />;

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard session={session} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />} />
        <Route path="/project/:id" element={<ProjectDetails />} />
        <Route path="/admin" element={<AdminDashboard session={session} />} />
      </Routes>

      {/* --- SET NEW PASSWORD MODAL --- */}
      <AnimatePresence>
        {isRecoveringPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl relative z-10 w-full max-w-md"
            >
              <div className="text-center mb-6">
               {/* CUSTOM LOGO FOR RESET */}
                <img 
                  src="/logo.png" 
                  alt="TrakYourBudget Logo" 
                  className="h-24 w-auto mx-auto mb-2 object-contain mix-blend-screen dark:mix-blend-lighten"
                />
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Set New Password</h2>
                <p className="text-sm font-medium text-slate-500 mt-2">Enter your new secure password below to complete the recovery process.</p>
              </div>

              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="relative group">
                  <span className="absolute left-4 top-3.5 text-slate-400">🔒</span>
                  <input 
                    type="password" 
                    required 
                    placeholder="New Password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full pl-11 pr-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 dark:text-white" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isUpdatingPassword || !newPassword} 
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all transform active:scale-[0.98] disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </form>

              {passwordMessage && (
                <div className={`mt-4 p-3 rounded-lg text-sm font-bold text-center ${passwordMessage.includes('❌') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                  {passwordMessage}
                </div>
              )}
            </motion.div>
            {/* PREMIUM FINTECH FOOTER */}
      <footer className="mt-20 border-t border-slate-200/50 dark:border-slate-800/50 pt-8 pb-6 text-center max-w-6xl mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <p>© 2026 TrakYourBudget. All rights reserved.</p>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span>👤</span> Baseer Ur Rehman
            </span>
            <a href="mailto:baseerurrehman1255@gmail.com" className="hover:text-indigo-500 transition-colors flex items-center gap-1.5">
              <span>✉️</span> baseerurrehman1255@gmail.com
            </a>
            <a href="https://www.linkedin.com/in/baseer-ur-rehman-8ab612309" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 bg-indigo-500/5 dark:bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/10">
              <svg width="14" height="16" fill="currentColor" viewBox="0 0 24 24" className="inline"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.5-1.75s.784-1.75 1.75-1.75 1.75.79 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg> Connect on LinkedIn
            </a>
          </div>
        </div>
      </footer>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
