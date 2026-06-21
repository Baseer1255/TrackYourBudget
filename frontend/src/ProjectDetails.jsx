import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { evaluate } from 'mathjs';
import Papa from 'papaparse'; 
import confetti from 'canvas-confetti';
import Tesseract from 'tesseract.js'; 

// 🔊 Custom Web Audio API Engine
const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
  } catch (error) {}
};

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 1. NEW STATE: Fetch current user to display actual name in sidebar
  const [currentUser, setCurrentUser] = useState(null);

  // Multi-Currency Engine
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({});
  const [exchangeRate, setExchangeRate] = useState(1);
  const availableCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD'];

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => setRates(data.rates))
      .catch(err => console.error("Could not fetch exchange rates:", err));
  }, []);

  useEffect(() => {
    if (rates[currency]) setExchangeRate(rates[currency]);
    else setExchangeRate(1);
  }, [currency, rates]);

  const formatCurrency = (amount) => {
    const converted = (parseFloat(amount) || 0) * exchangeRate;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(converted);
  };

  const getCurrencySymbol = () => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(0).replace(/[\d\.,\s]/g, '');
  };

  const toBaseCurrency = (amount) => {
    return parseFloat(amount) / exchangeRate;
  };

  // Core Forms & State
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('General');
  const [txPaidBy, setTxPaidBy] = useState('Me');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFabModalOpen, setIsFabModalOpen] = useState(false);
  
  // Autopay State
  const [isAutopay, setIsAutopay] = useState(false);
  const [dueDate, setDueDate] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');

  const [activeFilter, setActiveFilter] = useState('All');
  const categories = ['All', 'General', 'Food & Dining', 'Travel', 'Shopping', 'Entertainment', 'Bills & Utilities'];
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);
  const [localCatBudgets, setLocalCatBudgets] = useState({});

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const receiptInputRef = useRef(null); 
  
  const [toastMessage, setToastMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const [isAddingSalary, setIsAddingSalary] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [goalFundsInput, setGoalFundsInput] = useState('');

  // AI OCR Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');

  // AI CHATBOT STATE
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI Financial Advisor. Ask me to 'analyze my budget', give you a 'tip', or check your 'goals'!" }
  ]);
  const chatEndRef = useRef(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch the actual logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const { data: projectData } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data: txData } = await supabase.from('transactions').select('*').eq('project_id', id).order('created_at', { ascending: false });
    const { data: goalsData } = await supabase.from('savings_goals').select('*').eq('project_id', id).order('created_at', { ascending: false });

    setProject(projectData);
    if (projectData && projectData.category_budgets) setLocalCatBudgets(projectData.category_budgets);
    if (txData) setTransactions(txData);
    if (goalsData) setSavingsGoals(goalsData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    const liveChannel = supabase
      .channel('multiplayer_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `project_id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `project_id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${id}` }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(liveChannel);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleReceiptScan = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress('Initializing AI...');
    playSound('pop');

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const cleanImageData = canvas.toDataURL('image/png');

      const result = await Tesseract.recognize(cleanImageData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setScanProgress(`${Math.round(m.progress * 100)}%`);
          } else {
            setScanProgress('Reading...');
          }
        }
      });

      const text = result.data.text;
      const priceRegex = /(?:[$])?\s*\d{1,3}(?:[,]\d{3})*(?:[.]\d{2})/g;
      const prices = text.match(priceRegex);

      if (prices && prices.length > 0) {
        const numericPrices = prices.map(p => parseFloat(p.replace(/[$ ,]/g, '')));
        const validPrices = numericPrices.filter(p => !isNaN(p));
        
        if (validPrices.length > 0) {
          const maxPrice = Math.max(...validPrices);
          setTxAmount(maxPrice.toFixed(2));
          setTxName('Scanned Receipt');
          playSound('success');
          showToast('📸 Receipt Total Extracted!');
        } else {
          showToast('❌ Text found, but numbers were unreadable.');
        }
      } else {
        showToast('❌ Could not find a valid price. Image might be too blurry!');
      }
    } catch (error) {
      showToast('❌ Error scanning receipt.');
      console.error("Scanner Error:", error);
    } finally {
      setIsScanning(false);
      setScanProgress('');
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
  };

  const submitAddSalary = async () => {
    const amount = parseFloat(salaryAmount);
    if (isNaN(amount) || amount <= 0) return alert("Please enter a valid amount.");
    
    playSound('success'); 
    
    const baseAmount = toBaseCurrency(amount);
    const currentBudget = parseFloat(project.total_budget) || 0;
    const newBudget = currentBudget + baseAmount;
    
    setProject(prev => ({ ...prev, total_budget: newBudget }));
    showToast(`💸 Added ${formatCurrency(baseAmount)} to your workspace!`);
    setSalaryAmount('');
    setIsAddingSalary(false);
    
    const { error } = await supabase.from('projects').update({ total_budget: newBudget }).eq('id', id);
    if (error) { alert("Error saving: " + error.message); fetchData(); }
  };

  const submitAddGoalFunds = async (goal) => {
    const funds = parseFloat(goalFundsInput);
    if (isNaN(funds) || funds <= 0) return alert("Please enter a valid amount.");
    
    const baseFunds = toBaseCurrency(funds);
    const currentAmount = parseFloat(goal.current_amount) || 0;
    const targetAmount = parseFloat(goal.target_amount) || 0;
    const newAmount = currentAmount + baseFunds;
    
    if (newAmount >= targetAmount && currentAmount < targetAmount) {
      playSound('success');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6'] });
    } else {
      playSound('pop');
    }

    setSavingsGoals(prev => prev.map(g => g.id === goal.id ? { ...g, current_amount: newAmount } : g));
    showToast(`💰 ${formatCurrency(baseFunds)} added to goal!`); 
    setGoalFundsInput('');
    setActiveGoalId(null);
    
    const { error } = await supabase.from('savings_goals').update({ current_amount: newAmount }).eq('id', goal.id);
    if (error) fetchData();
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    setIsAddingGoal(true);
    const { data: { user } } = await supabase.auth.getUser();
    const baseTarget = toBaseCurrency(goalTargetAmount);
    const { error } = await supabase.from('savings_goals').insert([{ project_id: id, user_id: user.id, name: goalName, target_amount: baseTarget, current_amount: 0 }]);
    if (error) alert('Error creating goal: ' + error.message);
    else { setGoalName(''); setGoalTargetAmount(''); showToast('🎯 Savings Goal added!'); fetchData(); }
    setIsAddingGoal(false);
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Delete this savings goal?')) return;
    const { error } = await supabase.from('savings_goals').delete().eq('id', goalId);
    if (!error) { showToast('🗑️ Goal removed!'); fetchData(); }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    playSound('success'); 

    const { data: { user } } = await supabase.auth.getUser();
    const baseAmount = toBaseCurrency(txAmount);
    
    const newTx = { 
      id: Math.random(), 
      project_id: id, 
      name: txName, 
      amount: baseAmount, 
      category: txCategory, 
      created_at: new Date().toISOString(),
      is_autopay: isAutopay,
      due_date: isAutopay ? dueDate : null,
      paid_by: txPaidBy
    };
    
    setTransactions([newTx, ...transactions]);
    
    const { error } = await supabase.from('transactions').insert([{ 
      project_id: id, 
      user_id: user.id, 
      name: txName, 
      amount: baseAmount, 
      category: txCategory,
      is_autopay: isAutopay,
      due_date: isAutopay ? dueDate : null,
      paid_by: txPaidBy
    }]);

    if (error) { 
      alert('Error logging expense: ' + error.message); 
      fetchData(); 
    } else { 
      setTxName(''); 
      setTxAmount(''); 
      setTxCategory('General'); 
      setIsAutopay(false); 
      setDueDate('');
      setTxPaidBy('Me'); 
      setIsFabModalOpen(false);
      showToast(isAutopay ? '⏱️ Autopay Scheduled!' : '✅ Expense saved successfully!'); 
    }
    setIsAdding(false);
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) { alert('Error: ' + error.message); fetchData(); } else showToast('🗑️ Expense removed!');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsImporting(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const newTransactions = results.data.map(row => {
            const parsedAmount = Math.abs(parseFloat((row.Amount || row.Cost || row.Price || '0').replace(/[^0-9.-]+/g,"")) || 0);
            return {
              project_id: id, user_id: user.id, 
              name: row.Name || row.Description || row.Title || 'Imported Expense',
              amount: toBaseCurrency(parsedAmount),
              category: row.Category || 'General'
            };
          }).filter(tx => tx.amount > 0);
          if (newTransactions.length === 0) throw new Error("No valid amounts found.");
          const { error } = await supabase.from('transactions').insert(newTransactions);
          if (error) throw error;
          showToast(`✅ Successfully imported ${newTransactions.length} transactions!`);
          playSound('success');
          fetchData(); 
        } catch (err) { alert("Import Error: " + err.message); } 
        finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
      }
    });
  };

  const handleSaveCategoryBudgets = async () => {
    const baseCatBudgets = {};
    for (const [cat, val] of Object.entries(localCatBudgets)) {
      baseCatBudgets[cat] = toBaseCurrency(val);
    }
    const { error } = await supabase.from('projects').update({ category_budgets: baseCatBudgets }).eq('id', id);
    if (!error) { setIsEditingBudgets(false); showToast('📊 Category budgets updated!'); fetchData(); } else alert('Error: ' + error.message);
  };

  const handleBudgetChange = (category, value) => setLocalCatBudgets(prev => ({ ...prev, [category]: parseFloat(value) || 0 }));

  const handleCalcClick = (val) => {
    if (val === 'C') { setCalcInput(''); setCalcResult(''); return; }
    if (val === '=') {
      if (!calcInput.trim()) return;
      try {
        const raw = evaluate(calcInput);
        if (typeof raw !== 'number' || !isFinite(raw)) { setCalcResult('Error'); return; }
        setCalcResult(Number(raw).toFixed(2)); setCalcInput('');
      } catch { setCalcResult('Error'); }
      return;
    }
    setCalcInput((prev) => prev + val);
  };

  const submitInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) return alert("Please enter a valid email address!");
    const currentCollaborators = project.collaborators || [];
    if (currentCollaborators.includes(inviteEmail.toLowerCase())) return alert("User already in workspace!");
    const { error } = await supabase.from('projects').update({ collaborators: [...currentCollaborators, inviteEmail.toLowerCase()] }).eq('id', id);
    if (error) alert("Error: " + error.message);
    else { showToast(`🤝 Invite sent!`); setInviteEmail(''); setIsInviting(false); fetchData(); }
  };

  const handleDeleteWorkspace = async () => {
    const isConfirmed = window.confirm("Are you sure you want to delete this workspace? This action cannot be undone.");
    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      navigate('/'); 
    } catch (error) {
      console.error("Error deleting workspace:", error);
      alert("Could not delete workspace. Check your console for details.");
    }
  };

  const handleAIChatSubmit = (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;

    const newMessages = [...chatMessages, { role: 'user', text: userMessage }];
    setChatMessages(newMessages);
    const query = userMessage.toLowerCase();
    setUserMessage('');

    setTimeout(() => {
      let aiResponse = "I'm not quite sure how to answer that yet! Try asking me to **'analyze my budget'**, give you a **'saving tip'**, or check your **'goals'**.";

      if (query.includes('analyze') || query.includes('budget') || query.includes('status')) {
        let highestCat = 'None';
        let highestAmt = 0;
        for (const [cat, amt] of Object.entries(categoryTotals)) {
          if (amt > highestAmt) { highestAmt = amt; highestCat = cat; }
        }

        aiResponse = `**Budget Analysis Complete!** 📊\n\nYou have spent **${spendPercent.toFixed(1)}%** of your total budget. Your highest spending category is **${highestCat}** (${formatCurrency(highestAmt)}).\n\n`;
      } 
      else if (query.includes('tip') || query.includes('advice') || query.includes('save')) {
        const tips = [
          "**The 50/30/20 Rule:** Try allocating 50% of your budget to needs, 30% to wants, and 20% to savings!",
          "**Cancel Unused Subs:** Check your recurring expenses. If you haven't watched that streaming service in a month, cancel it!",
          "**The 24-Hour Rule:** If you want to buy something non-essential, wait 24 hours. If you still want it, buy it. This prevents impulse spending.",
          "**Pay Yourself First:** Automate a transfer to your savings account the day you get your paycheck."
        ];
        aiResponse = tips[Math.floor(Math.random() * tips.length)];
      } 
      // RESTORED: Chatbot "hello/hi" response feature
      else if (query.includes('hello') || query.includes('hi ')) {
        aiResponse = `Hello there! 👋 I am analyzing ${transactions.length} transactions for you. How can I help?`;
      }

      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      playSound('pop'); 
    }, 800);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#121212] p-8 flex animate-pulse">
      <div className="w-64 h-full bg-gray-100 dark:bg-[#1a1a1a] rounded-xl hidden md:block"></div>
      <div className="flex-1 ml-8 space-y-6">
        <div className="h-12 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div className="h-32 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800"></div>
        <div className="h-96 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800"></div>
      </div>
    </div>
  );

  if (!project) return <div className="p-8 text-center text-red-500 font-bold mt-20">Project not found!</div>;

  const todayStr = new Date().toISOString().split('T')[0];
  const deductedTransactions = transactions.filter(tx => !tx.is_autopay || (tx.is_autopay && tx.due_date <= todayStr));
  
  const totalSpent = deductedTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  const currentBudget = parseFloat(project.total_budget) || 0;
  const remainingBudget = currentBudget - totalSpent;
  const budgetColorClass = remainingBudget >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
  const spendPercent = Math.min((totalSpent / (currentBudget || 1)) * 100, 100);

  let bannerStatus = { text: 'On Track', color: 'bg-emerald-500', icon: '✅' };
  if (spendPercent >= 100) bannerStatus = { text: 'Over Budget', color: 'bg-red-500', icon: '🚨' };
  else if (spendPercent >= 80) bannerStatus = { text: 'Approaching Limit', color: 'bg-amber-500', icon: '⚠️' };
  
  const categoryTotals = {};
  categories.forEach(cat => categoryTotals[cat] = 0);
  deductedTransactions.forEach(tx => { categoryTotals[tx.category || 'General'] += (parseFloat(tx.amount) || 0); });

  const filteredTransactions = activeFilter === 'All' ? transactions : transactions.filter(tx => (tx.category || 'General') === activeFilter);
  const displayedTransactions = filteredTransactions.filter(tx => 
    tx.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (tx.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // === RECHARTS DATA LOGIC ===
  const chartData = [...displayedTransactions].reverse().map(tx => ({ name: tx.name.length > 10 ? tx.name.substring(0, 10) + '...' : tx.name, amount: (parseFloat(tx.amount) || 0) * exchangeRate }));
  const pieData = Object.keys(categoryTotals).filter(cat => categoryTotals[cat] > 0).map(cat => ({ name: cat, value: categoryTotals[cat] * exchangeRate }));
  
  const CATEGORY_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    
  // Group Settlement logic engine
  const projectMembers = ['Me', ...(project.collaborators || [])];
  const splitShare = projectMembers.length > 0 ? totalSpent / projectMembers.length : totalSpent;
  
  const memberBalances = {};
  projectMembers.forEach(m => memberBalances[m] = 0);
  
  deductedTransactions.forEach(tx => {
    const payer = tx.paid_by || 'Me';
    if (memberBalances[payer] !== undefined) memberBalances[payer] += (parseFloat(tx.amount) || 0);
    else memberBalances['Me'] += (parseFloat(tx.amount) || 0);
  });

  const settlements = projectMembers.map(member => {
    const paid = memberBalances[member];
    const balance = paid - splitShare;
    return { member, paid, balance };
  }).sort((a, b) => b.balance - a.balance);

  const calcButtons = ['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '00', '.', '='];

  let isTrendingOverBudget = false;
  let projectedTotal = 0;
  let dailyVelocity = 0;

  if (transactions.length > 0 && currentBudget > 0) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = today.getDate();

    const currentMonthTx = transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });

    const spentThisMonth = currentMonthTx.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
    dailyVelocity = spentThisMonth / Math.max(currentDay, 1);
    projectedTotal = spentThisMonth + (dailyVelocity * (daysInMonth - currentDay));

    if (projectedTotal > currentBudget * 1.1 && currentDay > 2) {
      isTrendingOverBudget = true;
    }
  }

  // Determine current user display name for the sidebar
  const displayName = currentUser?.user_metadata?.full_name?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'User';

  return (
    <div className="flex h-screen bg-[#fbfbfa] dark:bg-[#121212] font-sans text-gray-900 dark:text-gray-100 overflow-hidden selection:bg-gray-200 dark:selection:bg-gray-800">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] z-20 print:hidden">
        
        <div className="h-16 px-6 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain mix-blend-screen dark:mix-blend-lighten" />
          <span className="font-semibold text-sm tracking-tight text-gray-900 dark:text-white">TrakYourBudget</span>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link to="/" className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#242424] rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors cursor-pointer">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="opacity-70"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Dashboard
          </Link>

          <div className="px-3 py-2 mt-2 bg-gray-100 dark:bg-[#242424] rounded-md text-sm font-medium text-black dark:text-white flex items-center gap-3 cursor-pointer" onClick={() => document.getElementById('ledger').scrollIntoView({ behavior: 'smooth' })}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="opacity-70"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Transactions
          </div>
          <div className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#242424] rounded-md text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-3 cursor-pointer" onClick={() => document.getElementById('charts').scrollIntoView({ behavior: 'smooth' })}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="opacity-70"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            Analytics
          </div>
          
          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Support</div>
          <a href="mailto:baseerurrehman1255@gmail.com?subject=Feedback%20for%20TrakYourBudget" target="_blank" rel="noopener noreferrer" className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#242424] rounded-md text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-3 cursor-pointer">
            <span className="opacity-70 text-lg">💡</span> Send Feedback
          </a>
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
              <p className="text-[10px] text-gray-500 truncate">{currentUser?.email || 'Active User'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* TOP HEADER BAR */}
        <header className="h-16 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-8 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
             <Link to="/" className="md:hidden text-gray-500 mr-2">
               <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
             </Link>
             <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain md:hidden mix-blend-screen dark:mix-blend-lighten mr-2" />
             <span className="text-xs text-gray-400 font-medium hidden sm:inline-block">Workspaces /</span>
             <span className="text-xs text-gray-900 dark:text-white font-semibold">{project.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              {/* FIX: Dark mode text class added to select options */}
              <select className="appearance-none bg-gray-50 dark:bg-[#242424] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-colors text-xs font-semibold px-3 py-1.5 pr-7 rounded outline-none cursor-pointer" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {availableCurrencies.map(c => <option key={c} value={c} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{c}</option>)}
              </select>
              <div className="absolute right-2.5 top-1.5 pointer-events-none text-gray-400 text-[10px]">▼</div>
            </div>

            {isInviting ? (
              <div className="flex items-center gap-2">
                <input type="email" placeholder="Email address" className="px-2 py-1.5 rounded text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] outline-none w-32 sm:w-48 text-gray-900 dark:text-white" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} autoFocus />
                <button onClick={submitInvite} className="bg-black dark:bg-white text-white dark:text-black text-xs px-3 py-1.5 rounded font-medium">Send</button>
              </div>
            ) : (
              <button onClick={() => setIsInviting(true)} className="text-xs font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-1.5 rounded hover:bg-gray-50 transition-colors hidden sm:block">
                Invite
              </button>
            )}

            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="text-xs font-medium bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-1.5 rounded hover:bg-gray-50 transition-colors hidden lg:block shadow-sm">
              {isImporting ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide">
          {/* RESTORED: pdf-report-content ID wrapping the content */}
          <div id="pdf-report-content" className="max-w-5xl mx-auto space-y-8 pb-20">
            
            {/* HERO SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
              <div>
              <h1 className="text-3xl font-bold tracking-tight !text-black dark:!text-white">{project.name}</h1>
                <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                  <span>{project.collaborators?.length ? project.collaborators.length + 1 : 1} Members</span>
                  <span>•</span>
                  <span className={`font-medium ${budgetColorClass}`}>{formatCurrency(remainingBudget)} Remaining</span>
                </div>
              </div>
              <div className="flex gap-3 print:hidden">
                <button onClick={() => setIsAddingSalary(true)} className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium px-4 py-2 rounded-md text-sm shadow-sm hover:bg-gray-50 transition-colors">
                  Adjust Capital
                </button>
                <button onClick={() => setIsFabModalOpen(true)} className="bg-black dark:bg-white text-white dark:text-black font-medium px-4 py-2 rounded-md text-sm shadow-sm hover:opacity-90 transition-opacity">
                  Log Expense
                </button>
              </div>
            </div>

            {isAddingSalary && (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm max-w-sm text-gray-900 dark:text-white print:hidden">
                <span className="text-gray-500 font-medium pl-2">{getCurrencySymbol()}</span>
                <input type="number" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} placeholder="Amount" className="w-full text-sm font-medium bg-transparent outline-none" autoFocus />
                <button onClick={submitAddSalary} className="bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded text-xs font-medium">Save</button>
                <button onClick={() => setIsAddingSalary(false)} className="text-gray-400 hover:text-gray-800 px-2 text-xs">✕</button>
              </div>
            )}

            {/* PREDICTIVE ALERTS */}
            <AnimatePresence>
              {isTrendingOverBudget && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3 print:hidden">
                  <span className="text-lg">🚨</span>
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-400 text-sm">Predictive Alert</h3>
                    <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                      You are spending {formatCurrency(dailyVelocity)}/day. Projected to hit {formatCurrency(projectedTotal)} by month end, exceeding budget.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 4 SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
              <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Total Budget</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(currentBudget)}</p>
              </div>
              <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Total Spent</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Remaining</p>
                <p className={`text-xl font-semibold ${budgetColorClass}`}>{formatCurrency(remainingBudget)}</p>
              </div>
              <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Transactions</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{displayedTransactions.length}</p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm print:hidden">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Utilization ({spendPercent.toFixed(1)}%)</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${spendPercent >= 100 ? 'bg-red-100 text-red-700' : spendPercent >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {bannerStatus.text}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-[#242424] h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${spendPercent > 90 ? 'bg-red-500' : spendPercent > 75 ? 'bg-amber-500' : 'bg-black dark:bg-white'}`} style={{ width: `${spendPercent}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:flex print:flex-col">
              
              <div className="lg:col-span-1 flex flex-col gap-8 print:hidden">
                
                {/* Minimal Calculator */}
                <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Calculator</h3>
                  <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-md text-right font-mono text-lg mb-4 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
                    {calcResult || calcInput || '0'}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {calcButtons.map((btn, index) => (
                      <button key={index} type="button" onClick={() => handleCalcClick(btn)} className={`py-2 text-sm font-medium rounded-md transition-colors ${btn === '=' ? 'bg-black text-white dark:bg-white dark:text-black' : btn === 'C' ? 'text-red-500 bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#242424] text-gray-900 dark:text-white'}`}>
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Limits */}
                <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Category Limits</h3>
                    <button onClick={() => setIsEditingBudgets(!isEditingBudgets)} className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white">
                      {isEditingBudgets ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {categories.slice(1).map(cat => {
                      const limit = localCatBudgets[cat] || 0;
                      const spent = categoryTotals[cat];
                      const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                            {isEditingBudgets ? (
                              <input type="number" className="w-16 text-right text-xs border border-gray-200 rounded px-1 outline-none text-gray-900 dark:text-white bg-transparent" value={localCatBudgets[cat] || ''} onChange={(e) => handleBudgetChange(cat, e.target.value)} />
                            ) : (
                              <span className="text-xs text-gray-500">{formatCurrency(spent)} / {limit > 0 ? formatCurrency(limit) : '∞'}</span>
                            )}
                          </div>
                          {!isEditingBudgets && limit > 0 && (
                            <div className="w-full bg-gray-100 dark:bg-[#242424] rounded-full h-1">
                              <div className={`h-full rounded-full ${percent >= 90 ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${percent}%` }}></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {isEditingBudgets && <button onClick={handleSaveCategoryBudgets} className="mt-4 w-full bg-black dark:bg-white text-white dark:text-black py-2 rounded-md text-xs font-medium">Save Limits</button>}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-8 print:w-full">
                
                {/* Savings Goals */}
                <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm print:hidden">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Targets</h3>
                    <form onSubmit={handleAddGoal} className="flex gap-2 text-gray-900 dark:text-white">
                      <input type="text" required placeholder="Name" className="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-transparent outline-none focus:border-black dark:focus:border-white" value={goalName} onChange={e => setGoalName(e.target.value)} />
                      <input type="number" required placeholder="Amount" className="w-20 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-transparent outline-none focus:border-black dark:focus:border-white" value={goalTargetAmount} onChange={e => setGoalTargetAmount(e.target.value)} />
                      <button type="submit" disabled={isAddingGoal} className="bg-black dark:bg-white text-white dark:text-black px-3 py-1 text-xs font-medium rounded">Add</button>
                    </form>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {savingsGoals.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-gray-400 text-xs">No active goals.</div>
                    ) : (
                      savingsGoals.map((goal) => {
                        const percent = Math.min((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100, 100) || 0;
                        return (
                          <div key={goal.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative group">
                            <button onClick={() => handleDeleteGoal(goal.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs">✕</button>
                            <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-1">{goal.name}</h4>
                            <p className="text-[10px] text-gray-500 mb-3">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</p>
                            <div className="w-full bg-gray-100 dark:bg-[#242424] rounded-full h-1 mb-3">
                              <div className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${percent}%` }}></div>
                            </div>
                            {percent < 100 && (
                              activeGoalId === goal.id ? (
                                <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                                  <input type="number" value={goalFundsInput} onChange={e => setGoalFundsInput(e.target.value)} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs outline-none" autoFocus placeholder="Amt" />
                                  <button onClick={() => submitAddGoalFunds(goal)} className="bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs">✓</button>
                                </div>
                              ) : (
                                <button onClick={() => setActiveGoalId(goal.id)} className="w-full text-[10px] font-medium border border-gray-200 dark:border-gray-700 rounded py-1 hover:bg-gray-50 dark:hover:bg-[#242424] text-gray-700 dark:text-gray-300">Deposit</button>
                              )
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div id="charts" className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6">Category Split</h3>
                    <div className="h-56 w-full">
                      {pieData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data to chart yet.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value / exchangeRate)} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                            <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6">Spending Timeline</h3>
                    <div className="h-56 w-full">
                      {chartData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data to chart yet.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v / exchangeRate)} />
                            <Tooltip cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {projectMembers.length > 1 && displayedTransactions.length > 0 && (
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm print:hidden">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Group Settlements</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {settlements.map((s, idx) => (
                        <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-md flex justify-between items-center bg-gray-50/50 dark:bg-[#242424]">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{s.member === 'Me' ? 'You' : s.member.split('@')[0]}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Paid {formatCurrency(s.paid)}</p>
                          </div>
                          <div className={`text-right ${s.balance >= 0 ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>
                            <p className="text-sm font-semibold">{s.balance >= 0 ? '+' : ''}{formatCurrency(s.balance)}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{s.balance >= 0 ? 'Gets Back' : 'Owes Group'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div id="ledger" className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden print:w-full">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-[#1a1a1a]">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Transactions</h3>
                    <div className="relative print:hidden">
                      <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] text-sm outline-none w-full sm:w-64 text-gray-900 dark:text-white" />
                      <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
                    </div>
                  </div>

                  {displayedTransactions.length === 0 ? (
                    <div className="py-16 text-center border-b border-gray-200 dark:border-gray-800">
                      <p className="text-sm text-gray-500">No transactions found.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
                      {displayedTransactions.map((tx) => (
                        <li key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#242424] transition-colors group">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{tx.name}</p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              <span>{tx.category}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300 print:hidden"></span>
                              <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                              {tx.paid_by && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300 print:hidden"></span>
                                  <span>Paid by: {tx.paid_by === 'Me' ? 'You' : tx.paid_by.split('@')[0]}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              -{formatCurrency(tx.amount)}
                            </span>
                            <button onClick={() => handleDeleteTransaction(tx.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">✕</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

              </div>
            </div>

            <div className="p-6 border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
              <div>
                <h3 className="text-red-600 dark:text-red-400 font-semibold text-sm">Danger Zone</h3>
                <p className="text-xs text-gray-500 mt-1">Permanently delete this workspace. This cannot be undone.</p>
              </div>
              <button onClick={handleDeleteWorkspace} className="px-4 py-2 bg-white dark:bg-[#1a1a1a] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 transition-all rounded-md font-medium text-xs shadow-sm">
                Delete Workspace
              </button>
            </div>

            <footer className="pt-8 text-center border-t border-gray-200 dark:border-gray-800 print:hidden">
              <p className="text-xs text-gray-400">© 2026 TrakYourBudget. All rights reserved.</p>
            </footer>

          </div>
        </div>

        <button onClick={() => setIsFabModalOpen(true)} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40 print:hidden">
          +
        </button>

      </main>

      {/* MODAL FOR ADDING EXPENSES (Has OCR Scanner) */}
      {isFabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-800 relative animate-in fade-in zoom-in duration-200 text-gray-900 dark:text-white">
            <button onClick={() => setIsFabModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-white">✕</button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Log Expense</h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input type="text" required placeholder="e.g. Server Hosting" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-black dark:focus:border-white bg-transparent text-gray-900 dark:text-white" value={txName} onChange={(e) => setTxName(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-black dark:focus:border-white bg-transparent text-gray-900 dark:text-white" value={txCategory} onChange={(e) => setTxCategory(e.target.value)}>
                    {categories.slice(1).map(cat => <option key={cat} value={cat} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Paid By</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-black dark:focus:border-white bg-transparent text-gray-900 dark:text-white" value={txPaidBy} onChange={(e) => setTxPaidBy(e.target.value)}>
                    <option value="Me" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Me</option>
                    {project.collaborators?.map(email => <option key={email} value={email} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{email.split('@')[0]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">{getCurrencySymbol()}</span>
                  <input type="number" step="0.01" required placeholder="0.00" className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-black dark:focus:border-white bg-transparent text-gray-900 dark:text-white" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" className="rounded border-gray-300 text-black focus:ring-black" checked={isAutopay} onChange={(e) => setIsAutopay(e.target.checked)} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Schedule as Autopay</span>
                </label>
                {isAutopay && <input type="date" required className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-transparent mb-3" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
                
                {/* OCR SCANNER INTACT */}
                <input type="file" accept="image/*" ref={receiptInputRef} onChange={handleReceiptScan} className="hidden" />
                <button type="button" onClick={() => receiptInputRef.current?.click()} disabled={isScanning} className="w-full text-xs font-medium bg-gray-50 dark:bg-[#242424] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-[#333]">
                  {isScanning ? 'Scanning...' : 'Upload Receipt (Auto-fill)'}
                </button>
              </div>

              <button type="submit" disabled={isAdding || isScanning} className="w-full bg-black dark:bg-white text-white dark:text-black font-medium py-2.5 rounded-md text-sm transition-opacity disabled:opacity-50 mt-4">
                {isAdding ? 'Saving...' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FLAT AI CHATBOT UI */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end print:hidden">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-white dark:bg-[#1a1a1a] w-[calc(100vw-3rem)] sm:w-[350px] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 mb-4 flex flex-col h-[450px]">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#121212] rounded-t-xl">
                <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  FinBot AI
                </span>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-xs">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm bg-white dark:bg-[#1a1a1a]">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#242424] text-gray-800 dark:text-gray-200'}`}>
                      {msg.text.split(/(\*\*.*?\*\*)/).map((part, i) => 
                        part.startsWith('**') && part.endsWith('**') ? 
                        <strong key={i} className="font-bold">{part.slice(2, -2)}</strong> 
                        : part
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleAIChatSubmit} className="p-3 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                <input type="text" placeholder="Message..." className="flex-1 bg-gray-50 dark:bg-[#242424] border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-xs outline-none focus:border-black dark:focus:border-white text-gray-900 dark:text-white" value={userMessage} onChange={(e) => setUserMessage(e.target.value)} />
                <button type="submit" disabled={!userMessage.trim()} className="bg-black dark:bg-white text-white dark:text-black w-9 h-9 rounded-md flex items-center justify-center disabled:opacity-50">↑</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        {!isChatOpen && (
          <button onClick={() => setIsChatOpen(true)} className="hidden md:flex w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-lg items-center justify-center transition-transform hover:scale-105 active:scale-95">
            💬
          </button>
        )}
      </div>

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-md shadow-lg text-xs font-medium z-50">
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectDetails;