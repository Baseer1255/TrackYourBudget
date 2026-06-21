import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './Login';
import Register from './Register'; 
import ForgotPassword from './ForgotPassword'; 
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
      showToast(`Error: ${error.message}`);
    } else {
      showToast('Profile updated successfully!');
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

    if (!amount) { showToast("Couldn't find a price."); setIsProcessingMagic(false); return; }

    const { error } = await supabase.from('transactions').insert([{ project_id: projects[0].id, user_id: session.user.id, name: `Quick Log: ${magicCommand}`, amount, category }]);
    if (!error) { setMagicCommand(''); showToast(`Magic logged $${amount}!`); fetchDashboardData(); }
    setIsProcessingMagic(false);
  };

  const badges = [
    { id: 1, icon: '🚀', name: 'Pioneer', earned: true, description: 'Created an account' },
    { id: 2, icon: '📈', name: 'Tracker', earned: globalTransactions.length > 0, description: 'Logged first expense' },
    { id: 3, icon: '💎', name: 'Wealthy', earned: globalBudget > 5000, description: 'Tracked over $5k' },
    { id: 4, icon: '🛡️', name: 'Admin', earned: isAdmin, description: 'System Administrator' },
  ];

  return (
    <div className="flex h-screen bg-[#fbfbfa] dark:bg-[#121212] font-sans text-gray-900 dark:text-gray-100 overflow-hidden selection:bg-gray-200 dark:selection:bg-gray-800">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] z-20">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-8 h-8 object-contain" 
          />
          <span className="font-semibold text-sm tracking-tight text-gray-900 dark:text-white">TrakYourBudget</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 py-2 bg-gray-100 dark:bg-[#242424] rounded-md text-sm font-medium text-black dark:text-white flex items-center gap-3 cursor-pointer">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="opacity-70"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            All Workspaces
          </div>
          
          {/* LEADERBOARD UI REMOVED FOR PRIVACY AS REQUESTED 
          <div className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#242424] rounded-md text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-3 cursor-pointer" onClick={handleOpenLeaderboard}>
            <span className="opacity-70 text-lg">🏆</span>
            Leaderboard
          </div>
          */}

          {isAdmin && (
            <Link to="/admin" className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#242424] rounded-md text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-3">
              <span className="opacity-70 text-lg">🛡️</span>
              Admin Panel
            </Link>
          )}

          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Support</div>
          {/* FIX: Target Blank and Rel applied to mailto link */}
          <a href="mailto:baseerurrehman1255@gmail.com?subject=Feedback%20for%20TrakYourBudget" target="_blank" rel="noopener noreferrer" className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#242424] rounded-md text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-3 cursor-pointer">
            <span className="opacity-70 text-lg">💡</span> Send Feedback
          </a>
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div onClick={() => setIsProfileOpen(true)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#242424] p-2 rounded-md transition-colors">
            <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
              {/* FIX: Displays User Email instead of "Settings" */}
              <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* TOP HEADER BAR */}
        <header className="h-16 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-8 shrink-0 z-10">
          <div className="flex items-center gap-2">
             {/* FIX: Mobile Header Logo restored */}
             <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain md:hidden mix-blend-screen dark:mix-blend-lighten mr-2" />
             <span className="text-xs text-gray-400 font-medium hidden sm:inline-block">Dashboard /</span>
             <span className="text-xs text-gray-900 dark:text-white font-semibold">Overview</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors text-sm px-2">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button onClick={() => setIsProfileOpen(true)} className="md:hidden flex items-center justify-center w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
              {displayName.charAt(0)}
            </button>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide">
          <div className="max-w-5xl mx-auto space-y-8 pb-20">
            
            {/* HERO SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Overview</p>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{greeting}, {displayName}</h1>
              </div>
            </div>

            {/* MAGIC COMMAND */}
            {projects.length > 0 && (
              <form onSubmit={handleMagicCommand} className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400 text-sm">✨</span>
                <input type="text" placeholder="Magic Log: Type 'Spent $45 on Uber'..." className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white rounded-md py-3 pl-10 pr-24 text-sm outline-none text-gray-900 dark:text-white shadow-sm transition-all" value={magicCommand} onChange={(e) => setMagicCommand(e.target.value)} />
                <button type="submit" disabled={isProcessingMagic || !magicCommand} className="absolute right-1.5 top-1.5 bottom-1.5 bg-black dark:bg-white text-white dark:text-black font-medium px-4 rounded text-xs transition-opacity disabled:opacity-50">
                  {isProcessingMagic ? 'Saving...' : 'Auto-Log'}
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* HERO STATS */}
              <div className="lg:col-span-3 p-6 sm:p-8 bg-[#111827] dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-gray-400 font-semibold uppercase text-xs mb-1">Global Wealth Tracked</h2>
                  <p className="text-4xl sm:text-5xl font-bold tracking-tight text-white">${globalBudget.toFixed(2)}</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div className="bg-white/10 p-4 rounded-lg min-w-[100px]">
                    <p className="text-2xl font-bold">{projects.length}</p>
                    <p className="text-[10px] text-gray-300 uppercase tracking-wider mt-1">Workspaces</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-lg min-w-[100px]">
                    <p className="text-2xl font-bold text-green-400">Active</p>
                    <p className="text-[10px] text-gray-300 uppercase tracking-wider mt-1">Status</p>
                  </div>
                </div>
              </div>

              {/* BADGES */}
              <div className="lg:col-span-1 bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
                <h3 className="font-semibold text-gray-900 dark:text-white text-xs mb-4">Badges</h3>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  {badges.map(badge => (
                    <div key={badge.id} title={badge.description} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${badge.earned ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200' : 'bg-gray-50 dark:bg-[#242424] border-gray-100 dark:border-gray-800 opacity-50 grayscale'}`}>
                      <span className="text-lg mb-1">{badge.icon}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 pt-4">
              <div className="xl:col-span-1">
                <CreateProject userId={session.user.id} onProjectCreated={fetchDashboardData} />
              </div>

              <div className="xl:col-span-3 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your Workspaces</h2>
                </div>
                
                {isLoading ? (
                  <div className="text-sm text-gray-500">Loading workspaces...</div>
                ) : projects.length === 0 ? (
                  <div className="bg-white dark:bg-[#1a1a1a] p-12 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-gray-500 text-sm shadow-sm">
                    You haven't created any workspaces yet. Create one to get started.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => (
                      <div key={project.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col justify-between h-40">
                        <div>
                          {project.owner_id !== session.user.id && (
                            <span className="absolute top-4 right-4 bg-gray-100 dark:bg-[#242424] text-gray-600 dark:text-gray-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">Shared</span>
                          )}
                          <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate pr-14">{project.name}</h3>
                          <p className="text-gray-500 text-xs mt-1">
                            Capital: <span className="text-black dark:text-white font-medium">${project.total_budget}</span>
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-gray-500 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {project.collaborators?.length > 0 ? `${project.collaborators.length + 1} Members` : 'Active'}
                          </span>
                          <Link to={`/project/${project.id}`} className="text-black dark:text-white border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#242424] hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded text-xs font-medium transition-colors">
                            Open
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <footer className="pt-8 mt-12 text-center border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-400">© 2026 TrakYourBudget. All rights reserved.</p>
              <div className="mt-2 flex justify-center gap-4 text-xs">
                {/* FIX: Target Blank and Rel applied to mailto link */}
                <a href="mailto:baseerurrehman1255@gmail.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">Contact</a>
                <a href="https://www.linkedin.com/in/baseer-ur-rehman-8ab612309" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">LinkedIn</a>
              </div>
            </footer>

          </div>
        </div>
      </main>

      {/* PROFILE SLIDE-OUT MENU */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] h-full shadow-2xl relative z-10 border-l border-gray-200 dark:border-gray-800 flex flex-col">
              
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <h2 className="font-semibold text-base text-gray-900 dark:text-white">Account Settings</h2>
                <button onClick={() => setIsProfileOpen(false)} className="text-gray-400 hover:text-black dark:hover:text-white text-xs">✕</button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-[#242424] rounded-full text-gray-900 dark:text-white flex items-center justify-center text-2xl font-bold mb-4 border border-gray-200 dark:border-gray-700">
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="w-full space-y-3">
                      <input 
                        type="text" 
                        value={editFullName} 
                        onChange={(e) => setEditFullName(e.target.value)} 
                        className="w-full text-center bg-gray-50 dark:bg-[#242424] border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-md text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsEditingProfile(false); setEditFullName(fullName); }} className="flex-1 py-1.5 bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors">Cancel</button>
                        <button type="submit" disabled={isUpdatingProfile} className="flex-1 py-1.5 bg-black dark:bg-white hover:opacity-90 text-white dark:text-black rounded text-xs font-medium disabled:opacity-50 transition-opacity">
                          {isUpdatingProfile ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 group">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{fullName}</h3>
                        <button onClick={() => setIsEditingProfile(true)} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100 text-xs">Edit</button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{userEmail}</p>
                      <span className="mt-3 bg-gray-100 dark:bg-[#242424] text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider">Free Plan</span>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-[#242424] p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">Workspaces Owned</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{projects.filter(p => p.owner_id === session.user.id).length}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#242424] p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">Total Wealth Tracked</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">${globalBudget.toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                <button onClick={() => supabase.auth.signOut()} className="w-full py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#242424] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors">
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEADERBOARD MODAL REMOVED FOR PRIVACY (Commented out) */}
      {/* <AnimatePresence>
        {isLeaderboardOpen && (
          // Leaderboard code hidden securely 
        )}
      </AnimatePresence>
      */}

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-md shadow-lg text-xs font-medium z-50">
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
      setPasswordMessage(`Error: ${error.message}`);
      setIsUpdatingPassword(false);
    } else {
      setPasswordMessage('Password secured! Taking you to dashboard...');
      setTimeout(() => {
        setIsRecoveringPassword(false);
        setNewPassword('');
        setPasswordMessage('');
        setIsUpdatingPassword(false);
      }, 2000);
    }
  };

  return (
    <>
      <Routes>
        {/* 👇 PUBLIC AUTH ROUTES 👇 */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/" />} />

        {/* 👇 PROTECTED DASHBOARD ROUTES 👇 */}
        <Route path="/" element={session ? <Dashboard session={session} isDarkMode={isDarkMode} toggleTheme={toggleTheme} /> : <Navigate to="/login" />} />
        <Route path="/project/:id" element={session ? <ProjectDetails /> : <Navigate to="/login" />} />
        <Route path="/admin" element={session ? <AdminDashboard session={session} /> : <Navigate to="/login" />} />
      </Routes>

      {/* --- SET NEW PASSWORD MODAL --- */}
      <AnimatePresence>
        {isRecoveringPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              className="bg-white dark:bg-[#1a1a1a] p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl relative z-10 w-full max-w-md"
            >
              <div className="text-center mb-6">
                {/* FIX: Restored Logo to Reset Password view */}
                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Set New Password</h2>
                <p className="text-xs text-gray-500 mt-2">Enter your new secure password below to complete the recovery process.</p>
              </div>

              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div>
                  <input 
                    type="password" 
                    required 
                    placeholder="New Password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-black dark:focus:border-white transition-colors bg-transparent text-gray-900 dark:text-white" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isUpdatingPassword || !newPassword} 
                  className="w-full bg-black dark:bg-white text-white dark:text-black font-medium py-2.5 rounded-md text-sm transition-opacity disabled:opacity-50 mt-2"
                >
                  {isUpdatingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </form>

              {passwordMessage && (
                <div className={`mt-4 p-3 rounded-md text-xs font-medium text-center ${passwordMessage.includes('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                  {passwordMessage}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;