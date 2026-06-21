import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const CreateProject = ({ userId, onProjectCreated }) => {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !budget) return;
    setIsLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase
      .from('projects')
      .insert([{ name, total_budget: parseFloat(budget), owner_id: userId }])
      .select();

    if (error) {
      setErrorMsg(error.message);
    } else {
      setName('');
      setBudget('');
      if (onProjectCreated) onProjectCreated();
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm h-full">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Start New Workspace</h3>
      
      {errorMsg && (
        <div className="mb-4 p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs rounded border border-red-100 dark:border-red-900/50">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Workspace Name</label>
          <input 
            type="text" 
            required 
            placeholder="e.g. Q3 Marketing" 
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-black dark:focus:border-white bg-transparent transition-colors text-gray-900 dark:text-white"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Total Capital</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
            <input 
              type="number" 
              required 
              min="0"
              step="0.01"
              placeholder="0.00" 
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md outline-none focus:border-black dark:focus:border-white bg-transparent transition-colors text-gray-900 dark:text-white"
              value={budget} 
              onChange={(e) => setBudget(e.target.value)} 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-black dark:bg-white text-white dark:text-black font-medium py-2.5 rounded-md text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-4"
        >
          {isLoading ? 'Creating...' : 'Create Workspace'}
        </button>
      </form>
    </div>
  );
};

export default CreateProject;