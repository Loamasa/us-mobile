
import React, { useState } from 'react';
import { X, Hash, Mic, FolderPlus } from 'lucide-react';

interface CreateChannelModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; type: 'text' | 'voice'; category: string }) => void;
  existingCategories: string[];
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ onClose, onSubmit, existingCategories }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [category, setCategory] = useState(existingCategories[0] || 'General');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleSubmit = () => {
      if (!name) return;
      const finalCategory = isNewCategory ? newCategoryName : category;
      if (!finalCategory) return;
      
      onSubmit({ name, type, category: finalCategory });
  };

  return (
      <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Create Channel</h2>
                  <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                  {/* Type Selector */}
                  <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                      <button 
                        onClick={() => setType('text')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${type === 'text' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                      >
                          <Hash size={14} /> Text
                      </button>
                      <button 
                        onClick={() => setType('voice')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${type === 'voice' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                      >
                          <Mic size={14} /> Voice
                      </button>
                  </div>

                  {/* Name Input */}
                  <div>
                      <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Channel Name</label>
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-white/30 transition-colors">
                          <span className="text-gray-500 mr-2">{type === 'text' ? '#' : <Mic size={14}/>}</span>
                          <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            placeholder="new-channel"
                            className="bg-transparent text-white w-full focus:outline-none text-sm"
                            autoFocus
                          />
                      </div>
                  </div>

                  {/* Category Selector */}
                  <div>
                      <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Category</label>
                      {!isNewCategory ? (
                          <div className="flex gap-2">
                              <select 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-white/30"
                              >
                                  {existingCategories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                  ))}
                              </select>
                              <button 
                                onClick={() => setIsNewCategory(true)}
                                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white"
                                title="New Category"
                              >
                                  <FolderPlus size={18} />
                              </button>
                          </div>
                      ) : (
                          <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Category Name"
                                className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-white/30"
                              />
                              <button 
                                onClick={() => setIsNewCategory(false)}
                                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white"
                              >
                                  Cancel
                              </button>
                          </div>
                      )}
                  </div>
              </div>

              <div className="flex justify-end mt-8">
                  <button 
                    onClick={handleSubmit}
                    disabled={!name || (isNewCategory && !newCategoryName)}
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-colors ${name ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                  >
                      Create Channel
                  </button>
              </div>
          </div>
      </div>
  );
};
