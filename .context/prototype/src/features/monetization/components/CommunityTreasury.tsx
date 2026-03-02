import React, { useMemo, useState } from 'react';
import { Coins, TrendingUp, Users, Heart, ArrowUpRight, Wallet, Calendar, Download, X, Check, Activity } from 'lucide-react';
import { useMonetization } from '../../../context/MonetizationContext';
import { useData } from '../../../context/DataContext';
import { GlassCard } from '../../../components/ui/GlassCard';

interface CommunityTreasuryProps {
  communityId: string;
}

interface Transaction {
    id: string;
    type: 'WITHDRAWAL' | 'EVENT_FUNDING' | 'INCOME';
    amount: number;
    description: string;
    date: string;
    status: 'COMPLETED' | 'PENDING';
}

export const CommunityTreasury: React.FC<CommunityTreasuryProps> = ({ communityId }) => {
  const { allocatedCommunityIds, serverSupporters } = useMonetization();
  const { users } = useData();

  // Mock global data based on local + random seed
  const mockGlobalStats = useMemo(() => {
      const seed = communityId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const baseSlots = Math.floor(seed % 50) + 5; 
      const baseDirectSupporters = (serverSupporters[communityId] || []).length;
      const myAllocation = allocatedCommunityIds.includes(communityId) ? 1 : 0;
      
      const totalSlots = baseSlots + myAllocation;
      // Monthly recurring revenue
      const monthlyRevenue = (totalSlots * 2.00) + (baseDirectSupporters * 2.99); 

      return {
          totalSlots,
          monthlyRevenue,
          directSupporters: baseDirectSupporters,
          // Simulate some accumulated balance from previous months
          lifetimeRevenue: monthlyRevenue * 4.5 
      };
  }, [communityId, allocatedCommunityIds, serverSupporters]);

  // Local state for simulation
  const [spentAmount, setSpentAmount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([
      { id: 't_init_1', type: 'INCOME', amount: mockGlobalStats.monthlyRevenue, description: 'Monthly Subscription Payout', date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'COMPLETED' }
  ]);
  
  const [activeModal, setActiveModal] = useState<'NONE' | 'WITHDRAW' | 'FUND_EVENT'>('NONE');
  const [inputAmount, setInputAmount] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const availableBalance = Math.max(0, mockGlobalStats.lifetimeRevenue - spentAmount);

  const supportersList = useMemo(() => {
      const directIds = serverSupporters[communityId] || [];
      return users.filter(u => directIds.includes(u.id));
  }, [communityId, serverSupporters, users]);

  const handleTransaction = () => {
      const amount = parseFloat(inputAmount);
      if (!amount || amount <= 0 || amount > availableBalance) return;

      setIsProcessing(true);
      
      setTimeout(() => {
          const newTx: Transaction = {
              id: `t_${Date.now()}`,
              type: activeModal === 'WITHDRAW' ? 'WITHDRAWAL' : 'EVENT_FUNDING',
              amount: amount,
              description: inputDescription || (activeModal === 'WITHDRAW' ? 'Payout to Bank' : 'Community Event'),
              date: new Date().toISOString(),
              status: 'COMPLETED'
          };

          setSpentAmount(prev => prev + amount);
          setTransactions(prev => [newTx, ...prev]);
          setIsProcessing(false);
          setActiveModal('NONE');
          setInputAmount('');
          setInputDescription('');
      }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Treasury & Impact</h2>
                <p className="text-gray-400">Manage funds and track community contributions.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setActiveModal('WITHDRAW')}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-colors"
                >
                    <Wallet size={16} /> Withdraw
                </button>
                <button 
                    onClick={() => setActiveModal('FUND_EVENT')}
                    className="px-4 py-2 bg-mint/10 hover:bg-mint/20 border border-mint/20 text-mint rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                >
                    <Calendar size={16} /> Fund Event
                </button>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 bg-gradient-to-br from-mint/10 to-transparent border border-mint/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Wallet size={64} className="text-mint" />
                </div>
                <div className="relative z-10">
                    <div className="text-xs font-bold text-mint uppercase tracking-widest mb-1">Available Balance</div>
                    <div className="text-4xl font-black text-white">${availableBalance.toFixed(2)}</div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-2">
                        <span>Total Raised: ${mockGlobalStats.lifetimeRevenue.toFixed(2)}</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span>Monthly Run Rate: ${mockGlobalStats.monthlyRevenue.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <GlassCard className="p-6 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Users size={20} /></div>
                    <span className="text-xs font-bold text-gray-400 uppercase">Allocated Slots</span>
                </div>
                <div className="text-2xl font-bold text-white">{mockGlobalStats.totalSlots}</div>
                <div className="text-[10px] text-gray-500">From Premium subscribers</div>
            </GlassCard>

            <GlassCard className="p-6 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400"><Heart size={20} /></div>
                    <span className="text-xs font-bold text-gray-400 uppercase">Direct Supporters</span>
                </div>
                <div className="text-2xl font-bold text-white">{mockGlobalStats.directSupporters}</div>
                <div className="text-[10px] text-gray-500">Monthly donors</div>
            </GlassCard>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center gap-2">
                <Activity size={14} /> Recent Activity
            </h3>
            
            <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p className="text-sm">No recent activity.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-white/5">
                            {transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                tx.type === 'INCOME' ? 'bg-mint/10 text-mint' : 
                                                tx.type === 'WITHDRAWAL' ? 'bg-white/10 text-white' : 'bg-purple-500/10 text-purple-400'
                                            }`}>
                                                {tx.type === 'INCOME' ? <ArrowUpRight size={16} /> : 
                                                 tx.type === 'WITHDRAWAL' ? <Download size={16} /> : <Calendar size={16} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{tx.description}</div>
                                                <div className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`font-mono font-bold ${tx.type === 'INCOME' ? 'text-mint' : 'text-white'}`}>
                                            {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* Top Supporters */}
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Top Supporters</h3>
            
            <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
                {supportersList.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Heart size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No direct supporters yet.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-white/5">
                            {supportersList.map(user => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatarUrl} alt={user.displayName} className="w-10 h-10 rounded-full object-cover bg-gray-800" />
                                            <div>
                                                <div className="font-bold text-white text-sm">{user.displayName}</div>
                                                <div className="text-xs text-gray-500">{user.handle}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] font-bold uppercase">
                                            <Heart size={10} fill="currentColor" /> Supporter
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-sm text-white font-mono">
                                        $2.99
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* ACTION MODAL */}
        {activeModal !== 'NONE' && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#1A1D21] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-white text-lg">
                            {activeModal === 'WITHDRAW' ? 'Withdraw Funds' : 'Fund Community Event'}
                        </h3>
                        <button onClick={() => setActiveModal('NONE')} className="text-gray-400 hover:text-white"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <span className="text-xs text-gray-500 uppercase font-bold">Available</span>
                            <div className="text-2xl font-black text-white">${availableBalance.toFixed(2)}</div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={inputAmount}
                                    onChange={(e) => setInputAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-mono font-bold focus:outline-none focus:border-mint/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                                {activeModal === 'WITHDRAW' ? 'Destination / Note' : 'Event Name'}
                            </label>
                            <input 
                                type="text" 
                                value={inputDescription}
                                onChange={(e) => setInputDescription(e.target.value)}
                                placeholder={activeModal === 'WITHDRAW' ? 'e.g. Bank Transfer' : 'e.g. Pizza Party'}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-mint/50"
                            />
                        </div>

                        <button 
                            onClick={handleTransaction}
                            disabled={!inputAmount || parseFloat(inputAmount) <= 0 || parseFloat(inputAmount) > availableBalance || isProcessing}
                            className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-4
                                ${isProcessing || !inputAmount || parseFloat(inputAmount) > availableBalance
                                    ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                                    : 'bg-mint text-black hover:bg-emerald-400 shadow-lg shadow-mint/20'}
                            `}
                        >
                            {isProcessing ? (
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {activeModal === 'WITHDRAW' ? 'Confirm Withdrawal' : 'Allocate Budget'}
                                    <Check size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};