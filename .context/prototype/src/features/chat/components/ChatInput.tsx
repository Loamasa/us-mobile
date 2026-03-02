
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Send, Image as ImageIcon, Mic, Video, X, Reply, Smile, AlertCircle, Zap } from 'lucide-react';
import { Message, Attachment } from '../../../types';
import { useSubscription } from '../../monetization/hooks/useSubscription';

interface ChatInputProps {
  chatName: string;
  onSend: (text: string, attachments?: Attachment[]) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onUpdateMessage: (id: string, newText: string) => void;
  onCancelEdit: () => void;
}

const COMMON_EMOJIS = ["😀", "😂", "😅", "😍", "🥰", "😎", "😭", "😤", "👍", "👎", "🙏", "🔥", "🎉", "❤️", "✨", "💯", "👀", "🤔", "👻", "💩"];

export const ChatInput: React.FC<ChatInputProps> = ({ 
    chatName, 
    onSend, 
    replyingTo, 
    onCancelReply,
    editingMessage,
    onUpdateMessage,
    onCancelEdit
}) => {
  const { canUpload, plan } = useSubscription();
  const [inputText, setInputText] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
            setShowEmojiPicker(false);
        }
    };

    if (showEmojiPicker) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Sync input when editing
  useEffect(() => {
      if (editingMessage) {
          setInputText(editingMessage.content);
          inputRef.current?.focus();
      }
  }, [editingMessage]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (editingMessage) {
        onUpdateMessage(editingMessage.id, inputText);
        setInputText('');
        onCancelEdit();
    } else {
        onSend(inputText);
        setInputText('');
        onCancelReply();
    }
  };

  const handleEmojiClick = (emoji: string) => {
      setInputText(prev => prev + emoji);
      inputRef.current?.focus();
  };

  const handleAttach = (type: 'IMAGE' | 'VIDEO' | 'AUDIO') => {
      // Simulation of file size check
      let mockSize = 0;
      if (type === 'IMAGE') mockSize = 3 * 1024 * 1024; // 3MB
      if (type === 'AUDIO') mockSize = 2 * 1024 * 1024; // 2MB
      if (type === 'VIDEO') mockSize = 25 * 1024 * 1024; // 25MB (Fails Free, Fits Basic/Premium)

      if (!canUpload(mockSize)) {
          const limitMB = Math.floor(plan.limits.maxUploadSizeBytes / (1024 * 1024));
          const sizeMB = Math.floor(mockSize / (1024 * 1024));
          
          setUploadError(`File too large (${sizeMB}MB). Your ${plan.name} limit is ${limitMB}MB.`);
          setShowMediaMenu(false);
          
          // Clear error after 5s
          setTimeout(() => setUploadError(null), 5000);
          
          // Trigger upgrade flow
          setTimeout(() => window.dispatchEvent(new CustomEvent('open-upgrade-modal')), 500);
          return;
      }

      // Simulation of file attachment
      const mockAttachment: Attachment = {
          type,
          url: type === 'IMAGE' 
            ? `https://picsum.photos/seed/${Date.now()}/400/300` 
            : 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4'
      };
      
      // For demo, we just send immediate message with attachment
      onSend("", [mockAttachment]);
      setShowMediaMenu(false);
  };

  return (
    <div className="p-4 pb-8 bg-void border-t border-white/5 z-20 relative">
      
      {/* Upload Error Banner */}
      {uploadError && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400" />
                  <span className="text-sm font-bold">{uploadError}</span>
              </div>
              <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal'))}
                  className="px-3 py-1 bg-signal text-white rounded-lg text-xs font-black flex items-center gap-1 hover:bg-blue-600 transition-colors shadow-lg"
              >
                  <Zap size={12} fill="currentColor" /> UPGRADE
              </button>
          </div>
      )}

      {/* Context Banners (Reply / Edit) */}
      {(replyingTo || editingMessage) && (
          <div className="absolute bottom-full left-0 right-0 bg-[#1A1D21] border-t border-white/10 px-4 py-2 flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3 overflow-hidden">
                   <div className="w-1 self-stretch bg-signal rounded-full"></div>
                   <div className="flex flex-col min-w-0">
                       <span className="text-xs font-bold text-signal flex items-center gap-1">
                           {editingMessage ? 'Editing Message' : <><Reply size={12} /> Replying to {replyingTo?.isMe ? 'Yourself' : 'User'}</>}
                       </span>
                       <span className="text-sm text-gray-400 truncate">
                           {editingMessage ? 'Make your changes below' : replyingTo?.content || 'Media message'}
                       </span>
                   </div>
              </div>
              <button 
                onClick={editingMessage ? onCancelEdit : onCancelReply} 
                className="p-1 hover:bg-white/10 rounded-full text-gray-400"
              >
                  <X size={16} />
              </button>
          </div>
      )}

      {/* Main Input Bar */}
      <div className={`flex items-end gap-2 bg-white/5 rounded-2xl p-2 border focus-within:border-signal/50 transition-colors shadow-inner relative ${uploadError ? 'border-red-500/30' : 'border-white/5'}`}>
          
          {/* Add / Media Menu */}
          <div className="relative">
              <button 
                onClick={() => setShowMediaMenu(!showMediaMenu)}
                className={`p-2 rounded-full transition-colors ${showMediaMenu ? 'bg-signal text-white rotate-45' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                  <Plus size={20} />
              </button>
              
              {showMediaMenu && (
                  <div className="absolute bottom-full left-0 mb-4 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1 min-w-[160px] animate-in slide-in-from-bottom-5 fade-in z-50">
                      <button onClick={() => handleAttach('IMAGE')} className="flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-300 transition-colors group">
                          <span className="flex items-center gap-3"><ImageIcon size={16} className="text-purple-400" /> Photo</span>
                          <span className="text-[10px] text-gray-600 group-hover:text-gray-500">~3MB</span>
                      </button>
                      <button onClick={() => handleAttach('VIDEO')} className="flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-300 transition-colors group">
                          <span className="flex items-center gap-3"><Video size={16} className="text-pink-400" /> Video</span>
                          <span className="text-[10px] text-gray-600 group-hover:text-gray-500">~25MB</span>
                      </button>
                      <button onClick={() => handleAttach('AUDIO')} className="flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-300 transition-colors group">
                          <span className="flex items-center gap-3"><Mic size={16} className="text-green-400" /> Voice</span>
                          <span className="text-[10px] text-gray-600 group-hover:text-gray-500">~2MB</span>
                      </button>
                  </div>
              )}
          </div>

          <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                  }
              }}
              placeholder={`Message ${chatName}...`}
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none max-h-32 p-2 focus:outline-none"
              rows={1}
          />
        
        <div className="flex items-center gap-1 pb-1">
            {/* Emoji Picker */}
           <div className="relative">
                <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
                    title="Insert Emoji"
                >
                    <Smile size={20} />
                </button>

                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-4 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl p-3 w-64 animate-in slide-in-from-bottom-5 fade-in z-50">
                        <div className="grid grid-cols-5 gap-2">
                            {COMMON_EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleEmojiClick(emoji)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-xl transition-colors text-center"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
           </div>

           <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={`p-2 rounded-full transition-all ${inputText.trim() ? 'bg-signal text-white shadow-lg' : 'bg-white/5 text-gray-600'}`}
           >
              <Send size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};
