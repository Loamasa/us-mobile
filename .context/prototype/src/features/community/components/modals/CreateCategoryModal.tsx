
import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

interface CreateCategoryModalProps {
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = () => {
      if (!name.trim()) return;
      onSubmit(name.trim());
  };

  return (
      <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Create Category</h2>
                  <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Category Name</label>
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-white/30 transition-colors">
                          <FolderPlus size={16} className="text-gray-500 mr-2" />
                          <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. EVENTS"
                            className="bg-transparent text-white w-full focus:outline-none text-sm font-bold uppercase"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                          />
                      </div>
                  </div>
              </div>

              <div className="flex justify-end mt-8">
                  <button 
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-colors ${name.trim() ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                  >
                      Create
                  </button>
              </div>
          </div>
      </div>
  );
};
