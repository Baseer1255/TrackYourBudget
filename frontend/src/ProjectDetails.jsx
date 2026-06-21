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
      setIsFabModalOpen(false); // Close Modal on success
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

  // --- SKELETON LOADING SCREEN ---
  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="h-48 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-96 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl"></div>
          <div className="lg:col-span-2 h-96 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl"></div>
        </div>
      </div>
    </div>
  );

  if (!project) return <div className="p-8 text-center text-red-500 font-bold mt-20">Project not found!</div>;

  // Math variables & Autopay Logic
  const todayStr = new Date().toISOString().split('T')[0];
  const deductedTransactions = transactions.filter(tx => !tx.is_autopay || (tx.is_autopay && tx.due_date <= todayStr));
  
  const totalSpent = deductedTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  const currentBudget = parseFloat(project.total_budget) || 0;
  const remainingBudget = currentBudget - totalSpent;
  const budgetColorClass = remainingBudget >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
  const spendPercent = Math.min((totalSpent / (currentBudget || 1)) * 100, 100);
  let progressColor = spendPercent >= 85 ? 'from-red-500 to-rose-500' : spendPercent >= 50 ? 'from-amber-400 to-orange-500' : 'from-indigo-500 to-purple-500';

  // Dynamic status banner
  let bannerStatus = { text: 'On Track', color: 'bg-emerald-500 dark:bg-emerald-600', shadow: 'shadow-emerald-500/20', icon: '✅' };
  if (spendPercent >= 100) bannerStatus = { text: 'Over Budget', color: 'bg-red-500 dark:bg-red-600', shadow: 'shadow-red-500/20', icon: '🚨' };
  else if (spendPercent >= 80) bannerStatus = { text: 'Approaching Limit', color: 'bg-amber-500 dark:bg-amber-600', shadow: 'shadow-amber-500/20', icon: '⚠️' };
  
  const categoryTotals = {};
  categories.forEach(cat => categoryTotals[cat] = 0);
  deductedTransactions.forEach(tx => { categoryTotals[tx.category || 'General'] += (parseFloat(tx.amount) || 0); });

  const filteredTransactions = activeFilter === 'All' ? transactions : transactions.filter(tx => (tx.category || 'General') === activeFilter);
  
  // Search bar logic integration
  const displayedTransactions = filteredTransactions.filter(tx => 
    tx.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (tx.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = [...displayedTransactions].reverse().map(tx => ({ name: tx.name.length > 10 ? tx.name.substring(0, 10) + '...' : tx.name, amount: (parseFloat(tx.amount) || 0) * exchangeRate }));
  
  const pieData = Object.keys(categoryTotals)
    .filter(cat => categoryTotals[cat] > 0)
    .map(cat => ({ name: cat, value: categoryTotals[cat] * exchangeRate }));
    
  // Group Settlement logic engine
  const projectMembers = ['Me', ...(project.collaborators || [])];
  const splitShare = projectMembers.length > 0 ? totalSpent / projectMembers.length : totalSpent;
  
  const memberBalances = {};
  projectMembers.forEach(m => memberBalances[m] = 0);
  
  deductedTransactions.forEach(tx => {
    const payer = tx.paid_by || 'Me';
    if (memberBalances[payer] !== undefined) {
      memberBalances[payer] += (parseFloat(tx.amount) || 0);
    } else {
      memberBalances['Me'] += (parseFloat(tx.amount) || 0);
    }
  });

  const settlements = projectMembers.map(member => {
    const paid = memberBalances[member];
    const balance = paid - splitShare;
    return { member, paid, balance };
  }).sort((a, b) => b.balance - a.balance);

  const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6', '#64748b'];
  const calcButtons = ['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '00', '.', '='];

  // Smart Predictive Alerts Engine
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

  // AI CHATBOT LOGIC ENGINE
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
        
        if (spendPercent > 80) aiResponse += "🚨 **Warning:** You are burning through your budget fast! Consider freezing non-essential purchases for the rest of the month.";
        else if (spendPercent < 40) aiResponse += "✅ **Great job!** You are well within your limits. Keep up the good habits.";
        else aiResponse += "⚠️ **On Track:** You are spending at a normal pace. Keep an eye on your daily velocity!";
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
      else if (query.includes('goal') || query.includes('savings')) {
        if (savingsGoals.length === 0) {
          aiResponse = "You don't have any Savings Goals set up yet! Add one in the 🎯 Savings Goals widget to start building your future.";
        } else {
          let goalText = "**Your Goals Overview:**\n";
          savingsGoals.forEach(g => {
            const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
            goalText += `- **${g.name}:** ${pct.toFixed(0)}% complete (${formatCurrency(g.current_amount)})\n`;
          });
          aiResponse = goalText;
        }
      } else if (query.includes('hello') || query.includes('hi ')) {
        aiResponse = `Hello there! 👋 I am analyzing ${transactions.length} transactions for you. How can I help?`;
      }

      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
      playSound('pop'); 
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative selection:bg-indigo-500/30 overflow-hidden">
      
      {/* GLOWING BACKGROUND ORBS */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="max-w-6xl mx-auto space-y-6">
        
        {/* REFINED TOP NAV */}
        <div className="sticky top-4 z-30 flex flex-col md:flex-row justify-between items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-sm print:hidden">
          <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Dashboard
          </Link>
          
          <div className="flex flex-wrap gap-3 items-center mt-4 md:mt-0">
            <div className="relative group">
              <select 
                className="appearance-none bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-colors text-xs font-bold px-4 py-2 pr-8 rounded-lg outline-none cursor-pointer"
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
              >
                {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">▼</div>
            </div>

            {isInviting ? (
              <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-900/20 p-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <input type="email" placeholder="Friend's email..." className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 outline-none w-48" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} autoFocus />
                <button onClick={submitInvite} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-sm transition-transform active:scale-95">Send</button>
                <button onClick={() => setIsInviting(false)} className="text-slate-400 font-bold px-2 hover:text-red-500">✕</button>
              </div>
            ) : (
              <button onClick={() => setIsInviting(true)} className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all text-slate-600 dark:text-slate-300 shadow-sm">
                🤝 Invite
              </button>
            )}

            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all text-slate-600 dark:text-slate-300 shadow-sm disabled:opacity-50">
              {isImporting ? '⏳ Importing...' : '⬆️ Import CSV'}
            </button>
            
            {transactions.length > 0 && (
              <button onClick={() => window.print()} className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                📄 Print
              </button>
            )}
          </div>
        </div>

        <div id="pdf-report-content" className="pb-8 space-y-6">

          {/* DYNAMIC STATUS BANNER */}
          <div className={`print:hidden flex items-center justify-between p-5 rounded-2xl text-white shadow-lg transition-colors duration-700 ${bannerStatus.color} ${bannerStatus.shadow}`}>
            <div className="flex items-center gap-4">
              <div className="text-3xl bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                {bannerStatus.icon}
              </div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">Workspace Status: {bannerStatus.text}</h2>
                <p className="text-sm text-white/90 font-medium mt-0.5">
                  You have utilized {spendPercent.toFixed(1)}% of your total available capital.
                </p>
              </div>
            </div>
            {spendPercent >= 100 && (
              <button onClick={() => setIsAddingSalary(true)} className="hidden sm:block bg-white text-red-600 font-bold px-4 py-2 rounded-lg text-sm shadow-sm hover:scale-105 active:scale-95 transition-transform">
                Add Funds
              </button>
            )}
          </div>

          {/* 4 SUMMARY CARDS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
            <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Total Budget</p>
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(currentBudget)}</p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Total Spent</p>
              <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Remaining</p>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency((currentBudget || 0) - totalSpent)}</p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Transactions</p>
              <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{displayedTransactions.length}</p>
            </div>
          </div>

          {/* PREDICTIVE ALERTS BANNER */}
          <AnimatePresence>
            {isTrendingOverBudget && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }} 
                className="bg-red-50/90 dark:bg-red-900/30 backdrop-blur-md border border-red-200 dark:border-red-800/50 p-5 rounded-3xl flex items-start gap-4 shadow-lg shadow-red-500/10 print:hidden overflow-hidden"
              >
                <div className="text-2xl pt-1 animate-pulse">🚨</div>
                <div>
                  <h3 className="font-extrabold text-red-800 dark:text-red-400 text-lg tracking-tight">Predictive Budget Alert</h3>
                  <p className="text-red-600 dark:text-red-300 text-sm font-medium leading-relaxed mt-1">
                    Based on your recent activity, you are spending an average of <span className="font-bold">{formatCurrency(dailyVelocity)}</span> a day this month. 
                    If you continue at this rate, you are projected to spend <span className="font-bold">{formatCurrency(projectedTotal)}</span> by the 30th, which exceeds your total budget.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* HERO OVERVIEW CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between group relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Workspace</p>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{project.name}</h1>
                
                {project.collaborators?.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800/50 inline-flex px-2 py-1 rounded-md print:hidden">
                    <span>👥 {project.collaborators.length + 1} Members</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
                {isAddingSalary ? (
                  <div className="flex items-center gap-2 print:hidden bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 font-bold pl-2">{getCurrencySymbol()}</span>
                    <input type="number" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} placeholder="Amount" className="w-24 text-sm font-semibold bg-transparent outline-none" autoFocus />
                    <button onClick={submitAddSalary} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors">Save</button>
                    <button onClick={() => setIsAddingSalary(false)} className="text-slate-400 hover:text-red-500 px-2 font-bold">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Capital</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">{formatCurrency(project.total_budget)}</p>
                      <button onClick={() => setIsAddingSalary(true)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 w-6 h-6 rounded-full flex items-center justify-center transition-colors print:hidden hover:scale-110 active:scale-95" title="Add Salary">
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deployed</p>
               <p className="text-4xl font-extrabold tracking-tight mt-1">{formatCurrency(totalSpent)}</p>
               <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-5 overflow-hidden shadow-inner">
                 <div className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-1000 ease-out rounded-full`} style={{ width: `${spendPercent}%` }}></div>
               </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining Balance</p>
               <p className={`text-4xl font-extrabold tracking-tight mt-1 ${budgetColorClass}`}>{formatCurrency(remainingBudget)}</p>
               <p className="text-xs font-semibold text-slate-500 mt-5 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  System Active
               </p>
            </div>
          </div>

          {/* DUAL WORKSPACE PANEL GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:flex print:flex-col">
            
            {/* LEFT COLUMN: MINI UTILITIES */}
            <div className="lg:col-span-1 flex flex-col gap-6 print:hidden">
              
              {/* Quick Calculator */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg shadow-slate-200/50 dark:shadow-none">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                  <span className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">🧮</span>
                  Calculator
                </h3>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-right font-mono text-xl font-medium mb-4 h-12 flex items-center justify-end overflow-hidden tracking-wider text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 shadow-inner">
                  {calcResult || calcInput || '0'}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {calcButtons.map((btn, index) => (
                    <button key={index} type="button" onClick={() => { handleCalcClick(btn); playSound('pop'); }} className={`p-2.5 text-lg font-bold rounded-xl transition-all active:scale-95 ${btn === '=' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : btn === 'C' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : ['/', '*', '-', '+', '(', ')'].includes(btn) ? 'bg-slate-100 dark:bg-slate-800 text-indigo-500' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md'}`}>
                      {btn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Limits Display */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg shadow-slate-200/50 dark:shadow-none">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="p-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg">⚖️</span>
                    Category Limits
                  </h3>
                  <button onClick={() => setIsEditingBudgets(!isEditingBudgets)} className="print:hidden text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-md transition-colors active:scale-95">
                    {isEditingBudgets ? 'Cancel' : 'Edit Limits'}
                  </button>
                </div>
                <div className="space-y-4">
                  {categories.slice(1).map(cat => {
                    const limit = localCatBudgets[cat] || 0;
                    const spent = categoryTotals[cat];
                    const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                    const barColor = percent >= 90 ? 'from-red-400 to-red-500' : percent >= 75 ? 'from-amber-400 to-orange-400' : 'from-indigo-400 to-purple-500';
                    return (
                      <div key={cat} className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{cat}</span>
                          {isEditingBudgets ? (
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md focus-within:border-indigo-500 transition-colors">
                              <span className="text-slate-400 text-xs font-semibold">{getCurrencySymbol()}</span>
                              <input type="number" className="w-16 bg-transparent text-xs font-bold outline-none text-slate-900 dark:text-white" value={localCatBudgets[cat] || ''} onChange={(e) => handleBudgetChange(cat, e.target.value)} />
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 tracking-wide">{formatCurrency(spent)} <span className="font-normal opacity-60">/ {limit > 0 ? formatCurrency(limit) : '∞'}</span></span>
                          )}
                        </div>
                        {!isEditingBudgets && limit > 0 && (
                          <div className="w-full bg-slate-200/60 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`} style={{ width: `${percent}%` }}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isEditingBudgets && <button onClick={handleSaveCategoryBudgets} className="mt-6 w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-3 rounded-xl text-sm transition-transform active:scale-[0.98] print:hidden shadow-md">Save Limits</button>}
              </div>

            </div>

            {/* RIGHT COLUMN: MAIN FINANCIAL VISUALIZATIONS & LEDGER */}
            <div className="lg:col-span-2 flex flex-col gap-6 print:w-full">
              
              {/* Active Targets / Savings Goals */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg shadow-slate-200/50 dark:shadow-none">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="p-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg">🎯</span>
                    Active Targets
                  </h3>
                  <form onSubmit={handleAddGoal} className="flex gap-2 print:hidden">
                    <input type="text" required placeholder="Target Name" className="w-28 px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500" value={goalName} onChange={e => setGoalName(e.target.value)} />
                    <input type="number" required placeholder="Amount" className="w-24 px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-amber-500" value={goalTargetAmount} onChange={e => setGoalTargetAmount(e.target.value)} />
                    <button type="submit" disabled={isAddingGoal} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-transform">Add</button>
                  </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savingsGoals.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-slate-400 font-medium border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-sm">Start saving for something awesome.</div>
                  ) : (
                    savingsGoals.map((goal) => {
                      const radius = 36;
                      const circumference = 2 * Math.PI * radius;
                      const percent = Math.min((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100, 100) || 0;
                      const strokeDashoffset = circumference - (percent / 100) * circumference;
                      const isComplete = percent >= 100;

                      return (
                        <div key={goal.id} className="relative bg-white/50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center group shadow-sm hover:shadow-md transition-shadow">
                          <button onClick={() => handleDeleteGoal(goal.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 rounded-full w-6 h-6 flex items-center justify-center font-bold print:hidden shadow-sm">✕</button>
                          
                          <div className="relative w-20 h-20 mb-4 drop-shadow-sm">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="40" cy="40" r={radius} className="stroke-slate-100 dark:stroke-slate-700/50" strokeWidth="8" fill="none" />
                              <circle cx="40" cy="40" r={radius} className={isComplete ? "stroke-emerald-500" : "stroke-indigo-500"} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-extrabold text-base text-slate-800 dark:text-slate-100">{Math.round(percent)}%</div>
                          </div>

                          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-0.5 text-sm truncate w-full text-center">{goal.name}</h3>
                          <p className="text-[10px] font-semibold text-slate-500 mb-4">{formatCurrency(goal.current_amount)} <span className="font-medium opacity-60">/ {formatCurrency(goal.target_amount)}</span></p>

                          {!isComplete && (
                            activeGoalId === goal.id ? (
                              <div className="w-full flex items-center gap-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg p-1 shadow-inner">
                                <span className="text-slate-400 text-xs pl-1">{getCurrencySymbol()}</span>
                                <input type="number" value={goalFundsInput} onChange={e => setGoalFundsInput(e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none text-slate-900 dark:text-white" autoFocus placeholder="Amt" />
                                <button onClick={() => submitAddGoalFunds(goal)} className="bg-indigo-500 text-white p-1 rounded hover:bg-indigo-600 transition-colors">✓</button>
                                <button onClick={() => setActiveGoalId(null)} className="text-slate-400 hover:text-red-500 px-1">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => { setActiveGoalId(goal.id); playSound('pop'); }} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold py-1.5 rounded-lg transition-colors text-xs print:hidden active:scale-95">
                                + Deposit Funds
                              </button>
                            )
                          )}
                          {isComplete && <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-center py-1.5 rounded-lg text-xs border border-emerald-100 dark:border-emerald-800/30">Target Met 🎉</div>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Analytics Charts Panel */}
              {displayedTransactions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                  
                  {/* Category Donut Chart */}
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg shadow-slate-200/50 dark:shadow-none">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                      <span className="p-1.5 bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 rounded-lg">🍩</span>
                      Category Split
                    </h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => formatCurrency(value / exchangeRate)}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#0f172a', fontSize: '13px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600', paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Timeline Bar Chart */}
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg shadow-slate-200/50 dark:shadow-none">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                      <span className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">📈</span>
                      Spending Timeline
                    </h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v / exchangeRate)} />
                          <Tooltip 
                            formatter={(value) => [formatCurrency(value / exchangeRate), "Amount"]}
                            cursor={{ fill: '#f1f5f9', opacity: 0.05 }}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#0f172a', fontSize: '13px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                          />
                          <Bar dataKey="amount" fill="url(#colorUv)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                          <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                              <stop offset="100%" stopColor="#a855f7" stopOpacity={1} />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              )}

              {/* Group Settlements & Split Analytics Card */}
              {projectMembers.length > 1 && displayedTransactions.length > 0 && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg shadow-slate-200/50 dark:shadow-none print:hidden">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg">🤝</span>
                      Group Settlements
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1.5 rounded-md">
                      {projectMembers.length} Equal Shares
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {settlements.map((s, idx) => (
                      <div key={idx} className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {s.member === 'Me' ? 'You' : s.member.split('@')[0]}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            Paid {formatCurrency(s.paid)} total
                          </p>
                        </div>
                        <div className={`text-right ${s.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          <p className="text-sm font-extrabold">
                            {s.balance >= 0 ? '+' : ''}{formatCurrency(s.balance)}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                            {s.balance >= 0 ? 'Gets Back' : 'Owes Group'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Ledger Layout */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">📜</span>
                    Transaction Ledger
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <input 
                      type="text" 
                      placeholder="Search expenses..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium dark:text-white"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                  </div>
                </div>

                {/* EMPTY STATES & LIST RENDERING */}
                {displayedTransactions.length === 0 ? (
                  <div className="text-center py-16 bg-white/50 dark:bg-slate-900/50 rounded-b-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="text-5xl mb-4 opacity-80">🛒</div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No expenses matches</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Tap the floating + button to log a brand new transaction.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[400px] overflow-y-auto scrollbar-hide">
                    {displayedTransactions.map((tx) => (
                      <li key={tx.id} className="p-4 flex justify-between items-center text-sm group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">
                            {tx.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{tx.name}</p>
                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                              {tx.category} <span className="opacity-40 mx-1">•</span> {new Date(tx.created_at).toLocaleDateString()}
                              {tx.paid_by && <span className="text-emerald-500 font-bold ml-2">• Paid by: {tx.paid_by === 'Me' ? 'You' : tx.paid_by.split('@')[0]}</span>}
                              {tx.is_autopay && <span className="text-indigo-500 font-bold ml-2">(Autopay: {tx.due_date})</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-extrabold ${tx.is_autopay && tx.due_date > todayStr ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            -{(formatCurrency(tx.amount))}
                          </span>
                          <button onClick={() => handleDeleteTransaction(tx.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-sm active:scale-95 print:hidden">✕</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>

          {/* DANGER ZONE - DELETE WORKSPACE */}
          <div className="mt-10 mb-10 p-6 border border-red-500/20 bg-red-500/5 dark:bg-red-900/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div>
              <h3 className="text-red-600 dark:text-red-400 font-semibold text-lg">Danger Zone</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Permanently delete this workspace and all its associated data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={handleDeleteWorkspace}
              className="whitespace-nowrap px-6 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all rounded-xl font-medium text-sm border border-red-500/20 shadow-sm active:scale-95"
            >
              Delete Workspace
            </button>
          </div>

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
                  Connect on LinkedIn
                </a>
              </div>
            </div>
          </footer>

        </div>
      </motion.div>

      {/* FLOATING ACTION BUTTON (FAB) */}
      <button 
        onClick={() => setIsFabModalOpen(true)}
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center text-3xl transition-transform hover:scale-110 active:scale-95 z-40 print:hidden font-bold"
      >
        +
      </button>

      {/* QUICK LOG ACCESSIBLE MODAL FORM */}
      {isFabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-3xl shadow-2xl p-6 relative border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setIsFabModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold"
            >
              ✕
            </button>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <span>📝</span> Log Workspace Expense
            </h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <input type="text" required placeholder="Description (e.g. Uber)" className="w-full px-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white" value={txName} onChange={(e) => setTxName(e.target.value)} />
              
              <select className="w-full px-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer dark:text-white dark:bg-slate-900" value={txCategory} onChange={(e) => setTxCategory(e.target.value)}>
                {categories.slice(1).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select className="w-full px-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer dark:text-white dark:bg-slate-900" value={txPaidBy} onChange={(e) => setTxPaidBy(e.target.value)}>
                <option value="Me">Paid by: Me</option>
                {project.collaborators?.map(email => (
                  <option key={email} value={email}>Paid by: {email.split('@')[0]}</option>
                ))}
              </select>

              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 text-sm font-bold">{getCurrencySymbol()}</span>
                <input type="number" step="0.01" required placeholder="0.00" className="w-full pl-9 pr-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isAutopay} onChange={(e) => setIsAutopay(e.target.checked)} />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Schedule Autopay</span>
                </label>
                
                <input type="file" accept="image/*" capture="environment" ref={receiptInputRef} onChange={handleReceiptScan} className="hidden" />
                <button type="button" onClick={() => receiptInputRef.current?.click()} disabled={isScanning} className="mt-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 px-3 py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 w-full">
                  {isScanning ? `⏳ Scanning ${scanProgress}` : '📸 Capture Receipt with Scanner'}
                </button>
              </div>
              
              {isAutopay && (
                <input type="date" required className="w-full px-4 py-3 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-600 dark:text-slate-300" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              )}

              <button type="submit" disabled={isAdding || isScanning} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50">
                {isAdding ? 'Saving...' : 'Submit Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING AI CHATBOT UI */}
      <div className="fixed bottom-6 left-6 z-40 print:hidden flex flex-col items-start">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl w-[calc(100vw-3rem)] sm:w-[350px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden flex flex-col"
              style={{ height: '480px' }}
            >
              <div className="bg-transparent p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>
                  FinBot AI
                </span>
                <button onClick={() => { setIsChatOpen(false); playSound('pop'); }} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-hide bg-slate-50/50 dark:bg-slate-950/30">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm font-medium' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-bl-sm font-normal'}`}>
                      {msg.text.split(/(\*\*.*?\*\*)/).map((part, i) => 
                        part.startsWith('**') && part.endsWith('**') ? 
                        <strong key={i} className="font-black text-indigo-700 dark:text-indigo-400">{part.slice(2, -2)}</strong> 
                        : part
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleAIChatSubmit} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Message FinBot..." 
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white placeholder:text-slate-400"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                />
                <button type="submit" disabled={!userMessage.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform active:scale-95">
                  ↑
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {!isChatOpen && (
          <motion.button 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            onClick={() => { setIsChatOpen(true); playSound('pop'); }} 
            className="w-14 h-14 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full shadow-xl shadow-indigo-500/20 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-2xl transition-transform hover:scale-105 active:scale-95"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl shadow-slate-900/20 border border-slate-800 text-sm font-bold z-50 print:hidden flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectDetails;