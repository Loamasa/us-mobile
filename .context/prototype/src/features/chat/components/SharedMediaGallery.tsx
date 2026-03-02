
import React, { useState, useMemo } from 'react';
import { X, Image as ImageIcon, Video, Music, ChevronRight, Download } from 'lucide-react';
import { Message, Attachment } from '../../../types';

interface SharedMediaProps {
  messages: Message[];
  onClose?: () => void;
}

// Helper to extract all attachments from messages
const useChatAttachments = (messages: Message[]) => {
    return useMemo(() => {
        const allAttachments: { attachment: Attachment; messageId: string; timestamp: string }[] = [];
        // Iterate backwards to show newest first
        [...messages].reverse().forEach(msg => {
            if (msg.attachments && msg.attachments.length > 0) {
                msg.attachments.forEach(att => {
                    allAttachments.push({
                        attachment: att,
                        messageId: msg.id,
                        timestamp: msg.timestamp
                    });
                });
            }
        });
        return allAttachments;
    }, [messages]);
};

export const SharedMediaWidget: React.FC<{ messages: Message[]; onClickViewAll: () => void }> = ({ messages, onClickViewAll }) => {
    const attachments = useChatAttachments(messages);
    const previewAttachments = attachments.slice(0, 4);

    if (attachments.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={12} /> Shared Media
                </h3>
                <button 
                    onClick={onClickViewAll}
                    className="text-[10px] font-bold text-signal hover:text-white transition-colors flex items-center gap-1"
                >
                    View All <ChevronRight size={10} />
                </button>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
                {previewAttachments.map((item, idx) => (
                    <div key={`${item.messageId}-${idx}`} className="relative aspect-square bg-white/5 rounded-lg overflow-hidden border border-white/5 cursor-pointer hover:opacity-80 transition-opacity" onClick={onClickViewAll}>
                        {item.attachment.type === 'IMAGE' ? (
                            <img src={item.attachment.url} alt="Shared" className="w-full h-full object-cover" />
                        ) : item.attachment.type === 'VIDEO' ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/40">
                                <Video size={16} className="text-white/70" />
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/40">
                                <Music size={16} className="text-white/70" />
                            </div>
                        )}
                    </div>
                ))}
                {/* Empty placeholders if less than 4 */}
                {Array.from({ length: Math.max(0, 4 - previewAttachments.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square bg-white/5 rounded-lg border border-dashed border-white/5"></div>
                ))}
            </div>
        </div>
    );
};

export const SharedMediaGallery: React.FC<SharedMediaProps> = ({ messages, onClose }) => {
    const attachments = useChatAttachments(messages);
    const [filter, setFilter] = useState<'ALL' | 'MEDIA' | 'AUDIO'>('ALL');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const filteredAttachments = useMemo(() => {
        if (filter === 'MEDIA') return attachments.filter(a => a.attachment.type === 'IMAGE' || a.attachment.type === 'VIDEO');
        if (filter === 'AUDIO') return attachments.filter(a => a.attachment.type === 'AUDIO');
        return attachments;
    }, [attachments, filter]);

    return (
        <div className="absolute inset-0 z-50 bg-[#0F1115] flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h2 className="text-lg font-bold text-white">Shared Media</h2>
                <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex p-4 gap-2 border-b border-white/5">
                {(['ALL', 'MEDIA', 'AUDIO'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`
                            px-4 py-1.5 rounded-full text-xs font-bold transition-colors
                            ${filter === tab ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}
                        `}
                    >
                        {tab === 'ALL' ? 'All' : tab === 'MEDIA' ? 'Photos & Videos' : 'Audio'}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {filteredAttachments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <ImageIcon size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">No media found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {filteredAttachments.map((item, idx) => (
                            <div 
                                key={`${item.messageId}-${idx}`} 
                                className="relative aspect-square bg-white/5 rounded-xl overflow-hidden border border-white/5 group cursor-pointer"
                                onClick={() => item.attachment.type === 'IMAGE' ? setSelectedImage(item.attachment.url) : null}
                            >
                                {item.attachment.type === 'IMAGE' ? (
                                    <>
                                        <img src={item.attachment.url} alt="Shared" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </>
                                ) : item.attachment.type === 'VIDEO' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                                        <Video size={24} className="text-white mb-1" />
                                        <span className="text-[10px] font-bold text-white">Video</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors p-2 text-center">
                                        <Music size={24} className="text-white mb-1" />
                                        <span className="text-[10px] font-bold text-white truncate w-full">Audio Clip</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox for Images */}
            {selectedImage && (
                <div className="absolute inset-0 z-[60] bg-black/95 flex items-center justify-center animate-in fade-in duration-200">
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <div className="max-w-full max-h-full p-4">
                        <img src={selectedImage} alt="Full view" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
                        <div className="mt-4 flex justify-center">
                            <a 
                                href={selectedImage} 
                                download="image.jpg"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-bold transition-colors"
                                onClick={(e) => e.stopPropagation()} 
                            >
                                <Download size={16} /> Open Original
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
