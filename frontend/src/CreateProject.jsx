import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const CreateProject = ({ userId, onProjectCreated }) => {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase
      .from('projects')
      .insert([
        { name: name, total_budget: parseFloat(budget), owner_id: userId }
      ])
      .select();

    if (error) {
      alert("Error: " + error.message);
    } else {
      setName('');
      setBudget('');
      if (onProjectCreated) onProjectCreated(data[0]);
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md transition-colors">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 text-center">Start New Project</h2>
      
      <div className="space-y-4">
        <div>
          <input 
            type="text" 
            required 
            placeholder="Project Name" 
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none bg-transparent text-slate-900 dark:text-white transition-all font-bold"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>
        
        <div>
          <input 
            type="number" 
            required 
            placeholder="Total Budget" 
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 outline-none bg-transparent text-slate-900 dark:text-white transition-all font-bold"
            value={budget} 
            onChange={(e) => setBudget(e.target.value)} 
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 shadow-lg shadow-blue-600/30 mt-2"
        >
          {isLoading ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </form>
  );
};

export default CreateProject;
