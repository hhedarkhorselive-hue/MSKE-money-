import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Search, CheckCircle, XCircle, Users, Wallet, RefreshCw, Layers, ShieldCheck, DollarSign, Activity } from 'lucide-react';

interface AdminProps {
  onClose: () => void;
  currentUser: any;
}

export default function Admin({ onClose, currentUser }: AdminProps) {
  const [pinEntered, setPinEntered] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'stats' | 'withdraws' | 'users' | 'deposits'>('stats');
  
  // Selected user for editing
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editBalanceAmount, setEditBalanceAmount] = useState('');
  const [editBalanceAction, setEditBalanceAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [editPackageTitle, setEditPackageTitle] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);

  // UID Diagnostics states
  const [investigateUid, setInvestigateUid] = useState('');
  const [diagnosedUser, setDiagnosedUser] = useState<any | null>(null);
  const [diagnosedIssues, setDiagnosedIssues] = useState<string[]>([]);
  
  // Custom Confirm modals for withdraws (bypassing window.confirm in iframe)
  const [confirmApproveModal, setConfirmApproveModal] = useState<any | null>(null);
  const [confirmRejectModal, setConfirmRejectModal] = useState<any | null>(null);

  // Correct master PIN
  const MASTER_PIN = '889900';

  useEffect(() => {
    // Auto-authenticate as convenience if the user's document has role === 'admin'
    if (currentUser?.role === 'admin') {
      setIsAuthenticated(true);
      fetchData();
    }
  }, [currentUser]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinEntered === MASTER_PIN) {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert('❌ ভুল সিক্রেট পিন! আবার চেষ্টা করুন।');
      setPinEntered('');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      // Sort users sequentially by customUid or phone
      list.sort((a, b) => (b.customUid || 0) - (a.customUid || 0));
      setUsersList(list);
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      alert("তথ্য লোড করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnoseUid = () => {
    const target = investigateUid.trim();
    if (!target) {
      alert("দয়া করে একটি UID লিখুন!");
      return;
    }
    
    // Find user in usersList by customUid (it can be number or string) or phone
    const found = usersList.find((u) => String(u.customUid || '').trim() === target || String(u.phone || '').trim() === target);
    if (!found) {
      alert("❌ এই UID দিয়ে কোনো ব্যবহারকারী পাওয়া যায়নি!");
      setDiagnosedUser(null);
      setDiagnosedIssues([]);
      return;
    }
    
    setDiagnosedUser(found);
    
    // Diagnose issues
    const issuesList: string[] = [];
    
    // Check pending withdrawals with insufficient balance
    if (found.withdrawLogs && Array.isArray(found.withdrawLogs)) {
      const pendingLogs = found.withdrawLogs.filter((l: any) => l.status && (l.status.includes('পেন্ডিং') || l.status.includes('pending')));
      if (pendingLogs.length > 0) {
        pendingLogs.forEach((log: any) => {
          if (Number(log.amount) > (found.balance || 0)) {
            issuesList.push(`⚠️ উইথড্র সমস্যা: ব্যবহারকারী ৳${log.amount} উইথড্র করতে চেয়েছেন কিন্তু উনার বর্তমান ব্যালেন্স মাত্র ৳${(found.balance || 0).toFixed(2)} (যা অপর্যাপ্ত)।`);
          } else {
            issuesList.push(`ℹ️ উইথড্র পেন্ডিং: ব্যবহারকারীর ৳${log.amount} উইথড্র রিকোয়েস্ট পেন্ডিং অবস্থায় রয়েছে।`);
          }
        });
      }
    }
    
    // Check if they have an active package
    if (!found.hasActivePackage) {
      issuesList.push(`⚠️ ভিআইপি প্যাকেজ নেই: কোনো একটিভ প্যাকেজ না থাকার কারণে এই একাউন্টটি থেকে দৈনিক কোনো অটো-আয় হচ্ছে না।`);
    } else {
      issuesList.push(`✅ প্যাকেজ সচল: উনার '${found.activePackageTitle}' প্যাকেজটি সচল আছে (ডেইলি আয় ৳${found.dailyIncomeRate || 0})।`);
    }

    // Check if balance looks strange
    if ((found.balance || 0) < 0) {
      issuesList.push(`🚨 ঋণাত্মক ব্যালেন্স: ব্যবহারকারীর ব্যালেন্স শূন্যের নিচে চলে গেছে!`);
    }
    
    // If no negative issues
    const realAnomalies = issuesList.filter(item => item.startsWith('⚠️') || item.startsWith('🚨'));
    if (realAnomalies.length === 0) {
      issuesList.push(`🟢 একাউন্ট স্ট্যাটাস: একাউন্ট সম্পূর্ণ ফ্রেশ এবং কোনো ত্রুটি বা অসঙ্গতি পাওয়া যায়নি!`);
    }
    
    setDiagnosedIssues(issuesList);
  };

  // Extract all withdraw logs that are pending
  const getPendingWithdrawals = () => {
    const list: any[] = [];
    usersList.forEach((u) => {
      if (u.withdrawLogs && Array.isArray(u.withdrawLogs)) {
        u.withdrawLogs.forEach((log: any, index: number) => {
          if (log.status && (log.status.includes('পেন্ডিং') || log.status.includes('pending'))) {
            list.push({
              userPhone: u.phone,
              userUid: u.customUid,
              userName: u.name || 'User',
              logIndex: index,
              ...log
            });
          }
        });
      }
    });
    return list;
  };

  // Extract all deposit attempts
  const getAllDeposits = () => {
    const list: any[] = [];
    usersList.forEach((u) => {
      if (u.depositLogs && Array.isArray(u.depositLogs)) {
        u.depositLogs.forEach((log: any) => {
          list.push({
            userPhone: u.phone,
            userUid: u.customUid,
            ...log
          });
        });
      }
    });
    // Sort deposits by date/time eventually or keep as list
    return list;
  };

  // HANDLE WITHDRAW APPROVE
  const handleApproveWithdraw = (item: any) => {
    setConfirmApproveModal(item);
  };

  const executeApproveWithdraw = async () => {
    const item = confirmApproveModal;
    if (!item) return;
    try {
      const userDocRef = doc(db, 'users', item.userPhone);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        alert("ব্যবহারকারী খুঁজে পাওয়া যায়নি!");
        setConfirmApproveModal(null);
        return;
      }

      const userData = userSnap.data();
      const logs = [...(userData.withdrawLogs || [])];
      
      // Update the status of the specific log
      if (logs[item.logIndex]) {
        logs[item.logIndex].status = `সফল (পরিশোধিত ${new Date().toLocaleDateString('bn-BD')})`;
      }

      await updateDoc(userDocRef, {
        withdrawLogs: logs
      });

      alert("🎉 উইথড্র সফলভাবে অনুমোদিত হয়েছে!");
      fetchData(); // Refresh list
    } catch (error: any) {
      console.error(error);
      alert("উইথড্র অনুমোদন করতে ব্যর্থ হয়েছে: " + error.message);
    } finally {
      setConfirmApproveModal(null);
    }
  };

  // HANDLE WITHDRAW REJECT (With instant balance refund!)
  const handleRejectWithdraw = (item: any) => {
    setConfirmRejectModal(item);
  };

  const executeRejectWithdraw = async () => {
    const item = confirmRejectModal;
    if (!item) return;
    try {
      const userDocRef = doc(db, 'users', item.userPhone);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        alert("ব্যবহারকারী খুঁজে পাওয়া যায়নি!");
        setConfirmRejectModal(null);
        return;
      }

      const userData = userSnap.data();
      const logs = [...(userData.withdrawLogs || [])];
      
      // Update the status of the specific log
      if (logs[item.logIndex]) {
        logs[item.logIndex].status = `প্রত্যাখ্যাত (টাকা রিফান্ড করা হয়েছে)`;
      }

      // Refund the money to the user's active balance!
      const refundedBalance = (userData.balance || 0) + Number(item.amount);

      await updateDoc(userDocRef, {
        withdrawLogs: logs,
        balance: refundedBalance
      });

      alert(`❌ উইথড্র বাতিল করা হয়েছে এবং ${item.amount} ৳ ব্যবহারকারীর ব্যালেন্সে ফেরত দেওয়া হয়েছে!`);
      fetchData(); // Refresh list
    } catch (error: any) {
      console.error(error);
      alert("উইথড্র বাতিল করতে ব্যর্থ হয়েছে: " + error.message);
    } finally {
      setConfirmRejectModal(null);
    }
  };

  // HANDLE USER PROFILE UPDATES (Balance & packages)
  const handleUpdateUsersProfile = async () => {
    if (!selectedUser) return;
    setUpdatingUser(true);

    try {
      const userDocRef = doc(db, 'users', selectedUser.phone);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        alert("ব্যবহারকারী খুঁজে পাওয়া যায়নি!");
        setUpdatingUser(false);
        return;
      }

      const userData = userSnap.data();
      let newBalance = userData.balance || 0;
      
      // Calculate balance changes
      const parsedAmount = Number(editBalanceAmount);
      if (editBalanceAmount !== '' && !isNaN(parsedAmount)) {
        if (editBalanceAction === 'add') {
          newBalance += parsedAmount;
        } else if (editBalanceAction === 'deduct') {
          newBalance = Math.max(0, newBalance - parsedAmount);
        } else if (editBalanceAction === 'set') {
          newBalance = parsedAmount;
        }
      }

      const updates: any = {
        balance: newBalance
      };

      // Package changes
      if (editPackageTitle) {
        if (editPackageTitle === 'NONE') {
          updates.hasActivePackage = false;
          updates.activePackageTitle = null;
          updates.packagePrice = 0;
          updates.dailyIncomeRate = 0;
          updates.dailyBonusRate = 0;
        } else {
          // Determine parameters depending on options
          let price = 0;
          let dailyRate = 0;
          let dailyBonus = 0;

          if (editPackageTitle === 'সবুজ দ্বীপ প্যাকেজ (৳১৫০)') {
            price = 150; dailyRate = 20; dailyBonus = 1;
          } else if (editPackageTitle === 'রূপালী নদী প্যাকেজ (৳২৫০)') {
            price = 250; dailyRate = 30; dailyBonus = 2;
          } else if (editPackageTitle === 'সোনার হরিণ প্যাকেজ (৳৩০০)') {
            price = 300; dailyRate = 40; dailyBonus = 3;
          } else if (editPackageTitle === 'সাপের মণি শিব প্যাকেজ (৳৫০০)') {
            price = 500; dailyRate = 60; dailyBonus = 5;
          } else if (editPackageTitle === 'নীল সমুদ্র প্যাকেজ (৳৮০০)') {
            price = 800; dailyRate = 80; dailyBonus = 8;
          }


          updates.hasActivePackage = true;
          updates.activePackageTitle = editPackageTitle.split(' ')[0];
          updates.packagePrice = price;
          updates.dailyIncomeRate = dailyRate;
          updates.dailyBonusRate = dailyBonus;
          updates.lastClaimedDate = null;
          updates.lastBonusClaimedDate = null;
        }
      }

      await updateDoc(userDocRef, updates);
      alert("🎉 ব্যবহারকারীর অ্যাকাউন্ট সফলভাবে আপডেট করা হয়েছে!");
      
      setSelectedUser(null);
      setEditBalanceAmount('');
      setEditPackageTitle('');
      fetchData(); // Refresh list
    } catch (err: any) {
      console.error(err);
      alert("তথ্য আপডেট করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setUpdatingUser(false);
    }
  };

  // Filter users list on query (by UID or phone)
  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.trim();
    if (!q) return true;
    return String(u.customUid || '').includes(q) || String(u.phone || '').includes(q);
  });

  const pendingWithdraws = getPendingWithdrawals();
  const allDeposits = getAllDeposits();

  // Compute stats metrics
  const totalUsers = usersList.length;
  const totalBalance = usersList.reduce((acc, curr) => acc + (curr.balance || 0), 0);
  const activePackagesCount = usersList.filter((u) => u.hasActivePackage).length;

  if (!isAuthenticated) {
    return (
      <div className="w-full text-slate-800 font-sans pb-12 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer transition"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-extrabold text-xl text-slate-800">Admin Authentication</h1>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 max-w-sm mx-auto text-center space-y-5">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-800">এডমিন প্যানেল প্রবেশ করুন</h2>
            <p className="text-xs text-slate-400 font-medium">নিরাপত্তার স্বার্থে আপনার ৬-ডিজিটের সিক্রেট এডমিন পিনটি প্রদান করুন।</p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4 pt-2">
            <input 
              type="password"
              maxLength={6}
              value={pinEntered}
              onChange={(e) => setPinEntered(e.target.value)}
              placeholder="এডমিন পিন প্রবেশ করুন"
              className="w-full text-center px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-extrabold font-mono tracking-widest outline-none focus:border-red-400 focus:bg-white transition"
              autoFocus
            />

            <button 
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-2xl text-sm transition cursor-pointer"
            >
              ভেরিফাই করুন ➔
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-800 font-sans pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer transition flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-slate-800 flex items-center gap-1">
              Admin Interface
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping inline-block"></span>
            </h1>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">● Online Live Connected</p>
          </div>
        </div>

        <button 
          type="button" 
          onClick={fetchData} 
          disabled={loading}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl transition flex items-center justify-center cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1 mb-6 gap-0.5">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'stats' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent border-none'}`}
        >
          <Activity size={14} /> Stats
        </button>
        <button
          onClick={() => setActiveTab('withdraws')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${activeTab === 'withdraws' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent border-none'}`}
        >
          <Wallet size={14} /> Withdraws
          {pendingWithdraws.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-[9px] font-black animate-bounce shadow">
              {pendingWithdraws.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent border-none'}`}
        >
          <Users size={14} /> Users
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'deposits' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent border-none'}`}
        >
          <Layers size={14} /> Deposits
        </button>
      </div>

      {/* TAB CONTENT: STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm text-left relative overflow-hidden">
              <Users size={20} className="text-indigo-600 mb-2" />
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Users</p>
              <h3 className="text-2xl font-black text-slate-800 font-mono mt-0.5">{totalUsers}</h3>
              <div className="absolute right-0 bottom-0 translate-x-1.5 translate-y-1.5 text-indigo-50 opacity-40 font-mono font-black text-7xl select-none">U</div>
            </div>

            <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm text-left relative overflow-hidden">
              <DollarSign size={20} className="text-emerald-600 mb-2" />
              <p className="text-[10px] uppercase font-bold text-slate-400">Combined Balances</p>
              <h3 className="text-xl font-black text-slate-800 font-mono mt-1">৳{totalBalance.toFixed(2)}</h3>
              <div className="absolute right-0 bottom-0 translate-x-1.5 translate-y-1.5 text-emerald-50 opacity-40 font-mono font-black text-7xl select-none">৳</div>
            </div>

            <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm text-left relative overflow-hidden">
              <Wallet size={20} className="text-orange-500 mb-2" />
              <p className="text-[10px] uppercase font-bold text-slate-400">Pending Withdraws</p>
              <h3 className="text-2xl font-black text-slate-800 font-mono mt-0.5">{pendingWithdraws.length}</h3>
              <div className="absolute right-0 bottom-0 translate-x-1.5 translate-y-1.5 text-orange-50 opacity-40 font-mono font-black text-7xl select-none">W</div>
            </div>

            <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm text-left relative overflow-hidden">
              <Layers size={20} className="text-blue-500 mb-2" />
              <p className="text-[10px] uppercase font-bold text-slate-400">Active Packages</p>
              <h3 className="text-2xl font-black text-slate-800 font-mono mt-0.5">{activePackagesCount}</h3>
              <div className="absolute right-0 bottom-0 translate-x-1.5 translate-y-1.5 text-blue-50 opacity-40 font-mono font-black text-7xl select-none">P</div>
            </div>
          </div>

          {/* Quick Tasks List */}
          <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 text-left space-y-3">
            <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-amber-700" /> Admin Fast Dashboard Instruction
            </h4>
            <div className="space-y-1.5 text-xs text-amber-900 leading-normal font-medium">
              <p>১. ব্যবহারকারীদের ব্যালেন্স ও একটিভ প্যাকেজ সংশোধন করতে <strong>'Users'</strong> ট্যাবে ক্লিক করে নির্দিষ্ট আইডিতে চাপুন।</p>
              <p>২. পেন্ডিং ক্যাশআউটগুলো সফল বা প্রত্যাখ্যাত করতে সরাসরি <strong>'Withdraws'</strong> ট্যাবে চলে যান।</p>
              <p>৩. প্রত্যাখ্যাত উইথড্রগুলোর টাকা ইনস্ট্যান্ট ইউজার একাউন্ট ব্যালেন্সে রিফান্ড হয়ে যাবে।</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PENDING WITHDRAWALS */}
      {activeTab === 'withdraws' && (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider text-left pl-1">
            Pending Withdraw Requests ({pendingWithdraws.length})
          </h2>

          {pendingWithdraws.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-2">
              <CheckCircle className="text-emerald-500 mx-auto" size={36} />
              <p className="text-sm font-bold text-slate-800">কোনো উইথড্র রিকোয়েস্ট পেন্ডিং নেই!</p>
              <p className="text-xs text-slate-400 font-semibold">সকল ক্যাশআউট রিকোয়েস্ট সফলভাবে পরিশোধ করা হয়েছে।</p>
            </div>
          ) : (
            <div className="space-y-3 text-left">
              {pendingWithdraws.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">UID: {item.userUid || 'N/A'}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">{item.userPhone}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono mt-1">{item.date} • {item.time}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-indigo-600 font-mono text-xs font-black px-2.5 py-1 bg-indigo-50 rounded-xl">
                        {item.method}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px]">উইথড্র নম্বর</p>
                      <p className="text-slate-800 font-extrabold font-mono text-sm mt-0.5">{item.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-bold uppercase text-[9px]">উইথড্র পরিমাণ</p>
                      <p className="text-emerald-600 font-black text-lg font-mono">৳{item.amount}</p>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRejectWithdraw(item)}
                      className="bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-600 text-xs font-bold py-3 rounded-xl transition cursor-pointer border-none flex items-center justify-center gap-1"
                    >
                      <XCircle size={14} /> রিজেক্ট ও রিফান্ড
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveWithdraw(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer border-none flex items-center justify-center gap-1 shadow-sm shadow-emerald-100"
                    >
                      <CheckCircle size={14} /> রিকোয়েস্ট সফল
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4 text-left">
          {/* UID Diagnose Tool */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 p-5 rounded-3xl border border-indigo-100/80 space-y-3">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              🔍 ইউজার আইডি (UID) দিয়ে রোগ নির্ণয় ও তদন্ত
            </h3>
            <p className="text-[11.5px] text-indigo-700/80 leading-relaxed font-semibold">
              যেকোনো অ্যাকাউন্টের বিস্তারিত লগ, সক্রিয় প্যাকেজ, পাসওয়ার্ড এবং সম্ভাব্য ভুলত্রুটি সরাসরি অডিট করতে ব্যবহারকারীর UID খুঁজুন।
            </p>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={investigateUid}
                onChange={(e) => setInvestigateUid(e.target.value)}
                placeholder="ইউজার UID বা ফোন নম্বর লিখুন (যেমন: 1037830 বা 01...)" 
                className="flex-1 px-4 py-3 bg-white border border-indigo-200/70 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleDiagnoseUid}
                className="px-4.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition text-white font-black text-xs rounded-xl cursor-pointer border-none"
              >
                তদন্ত করুন
              </button>
            </div>

            {/* Diagnosis Result Output Box */}
            {diagnosedUser && (
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-3 mt-3 animate-fade-in block text-slate-800 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <span>👤 {diagnosedUser.name || 'সম্মানিত ইউজার'}</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 font-extrabold px-1.5 py-0.5 rounded">UID: {diagnosedUser.customUid || 'কোনো UID নেই'}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 font-mono">মোবাইল: {diagnosedUser.phone} • পাসওয়ার্ড: {diagnosedUser.password}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setDiagnosedUser(null);
                      setDiagnosedIssues([]);
                      setInvestigateUid('');
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 font-sans font-bold border-none bg-transparent outline-none cursor-pointer text-sm"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-indigo-950 tracking-wider">অ্যাকাউন্টের অবস্থা ও সম্ভাব্য ত্রুটিসমূহ:</p>
                  <ul className="space-y-1 pl-0 list-none m-0">
                    {diagnosedIssues.map((issue, i) => (
                      <li key={i} className="text-[11px] font-bold text-slate-700 flex items-start gap-1">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 my-2"></div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="সংক্ষিপ্ত তালিকা ফিল্টার করতে ইউজার UID বা ফোন নম্বর লিখুন..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-slate-400 placeholder:text-slate-400 font-sans"
            />
          </div>

          <div className="space-y-2.5">
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold">
                কোনো ব্যবহারকারী খুঁজে পাওয়া যায়নি।
              </div>
            ) : (
              filteredUsers.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSelectedUser(item);
                    setEditBalanceAmount('');
                    setEditPackageTitle(item.hasActivePackage ? `${item.activePackageTitle} (৳${item.packagePrice})` : '');
                  }}
                  className="bg-white border border-slate-100 hover:border-slate-300 rounded-2.5xl p-4 shadow-xs flex justify-between items-center cursor-pointer transition"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-800">UID: {item.customUid || 'N/A'}</span>
                      <span className="text-[10px] px-1.5 bg-slate-100 text-slate-500 rounded font-mono font-bold">{item.phone}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      {item.hasActivePackage ? (
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold">
                          📦 {item.activePackageTitle || 'Package'}
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-md font-bold">
                          কোনো প্যাকেজ নেই
                        </span>
                      )}

                      {item.referredBy && (
                        <span className="text-[9px] text-slate-400 font-medium">Referred: {item.referredBy}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-800 font-mono">৳{(item.balance || 0).toFixed(2)}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5 font-sans">পাসওয়ার্ড: {item.password}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DEPOSIT LOGS OVERVIEW */}
      {activeTab === 'deposits' && (
        <div className="space-y-4 text-left">
          <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider pl-1">
            User Deposits Log History ({allDeposits.length})
          </h2>

          {allDeposits.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-xs font-bold">
              কোনো ডিপোজিট রেকর্ড এখনো পর্যন্ত পাওয়া যায়নি।
            </div>
          ) : (
            <div className="space-y-2.5">
              {allDeposits.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-100 rounded-2.5xl p-4 shadow-xs flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-800">UID: {item.userUid || 'N/A'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({item.userPhone})</span>
                    </div>
                    <p className="text-[10px] text-indigo-600 font-mono font-bold mt-1">TxID: {item.txid}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.date} • {item.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-emerald-600">+{item.amount} ৳</p>
                    <span className="text-[9px] bg-slate-50 font-bold px-1.5 py-0.5 rounded text-amber-600 uppercase">
                      {item.method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL / FORM OVERLAY FOR UPDATING SELECTED USER */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl p-6 text-left space-y-4 border border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">সম্পাদনা এবং ব্যালেন্স</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-bold">UID: {selectedUser.customUid || 'N/A'} • {selectedUser.phone}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedUser(null)} 
                className="p-1 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full border-none cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="border bg-slate-50 rounded-2xl p-4 flex justify-between items-center text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px]">বর্তমান ব্যালেন্স</p>
                <p className="text-slate-800 font-extrabold text-base font-mono mt-0.5">৳{(selectedUser.balance || 0).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-bold uppercase text-[9px]">যোগাযোগ/পাসওয়ার্ড</p>
                <p className="text-slate-800 font-extrabold font-mono mt-0.5">{selectedUser.password}</p>
              </div>
            </div>

            {/* Adjust Balance Section */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Adjustment Amount (ব্যালেন্স পরিবর্তন)</label>
              <div className="flex rounded-xl overflow-hidden border border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditBalanceAction('add')}
                  className={`flex-1 py-2 text-xs font-bold transition border-none cursor-pointer ${editBalanceAction === 'add' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  টাকা যোগ
                </button>
                <button
                  type="button"
                  onClick={() => setEditBalanceAction('deduct')}
                  className={`flex-1 py-2 text-xs font-bold transition border-none cursor-pointer ${editBalanceAction === 'deduct' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  টাকা বিয়োগ
                </button>
                <button
                  type="button"
                  onClick={() => setEditBalanceAction('set')}
                  className={`flex-1 py-2 text-xs font-bold transition border-none cursor-pointer ${editBalanceAction === 'set' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  সরাসরি সেট
                </button>
              </div>
              <input 
                type="number" 
                value={editBalanceAmount}
                onChange={(e) => setEditBalanceAmount(e.target.value)}
                placeholder="পরিবর্তনের পরিমাণ লিখুন (যেমন: ৫০০)" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white font-mono"
              />
            </div>

            {/* Adjust packages */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">একটিভ প্যাকেজ পরিবর্তন / দিন</label>
              <select 
                value={editPackageTitle}
                onChange={(e) => setEditPackageTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="">কোন পরিবর্তন নয়</option>
                <option value="NONE">প্যাকেজ বাতিল (কোনো একটিভ প্যাকেজ নেই)</option>
                <option value="সবুজ দ্বীপ প্যাকেজ (৳১৫০)">Basic (৳১৫০ - ডেইলি ২০৳ আয়)</option>
                <option value="রূপালী নদী প্যাকেজ (৳২৫০)">Standard (৳২৫০ - ডেইলি ৩০৳ আয়)</option>
                <option value="সোনার হরিণ প্যাকেজ (৳৩০০)">Classic (৳৩০০ - ডেইলি ৪০৳ আয়)</option>
                <option value="সাপের মণি শিব প্যাকেজ (৳৫০০)">Starter (৳৫০০ - ডেইলি ৬০৳ আয়)</option>
                <option value="নীল সমুদ্র প্যাকেজ (৳৮০০)">Pro (৳৮০০ - ডেইলি ৮০৳ আয়)</option>
              </select>
            </div>

            {/* Submit updates */}
            <button
              type="button"
              onClick={handleUpdateUsersProfile}
              disabled={updatingUser}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl text-xs transition cursor-pointer border-none"
            >
              {updatingUser ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modals for Withdrawals */}
      {confirmApproveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative space-y-4">
            <h3 className="text-xl font-extrabold text-slate-800 text-center">উইথড্র সফল নিশ্চিতকরণ</h3>
            <p className="text-sm text-slate-600 font-medium text-center">
              আপনি কি এই <strong>{confirmApproveModal.amount} ৳</strong> উইথড্র রিকোয়েস্টটি সফল করতে চান?
            </p>
            <div className="bg-indigo-50 p-4 rounded-2xl text-xs space-y-1 font-mono">
              <p><strong>নম্বর:</strong> {confirmApproveModal.phone}</p>
              <p><strong>মেথড:</strong> {confirmApproveModal.method}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button 
                onClick={() => setConfirmApproveModal(null)}
                className="py-3 bg-red-100 text-red-700 font-bold rounded-xl active:scale-95 transition"
              >
                বাতিল করুন
              </button>
              <button 
                onClick={executeApproveWithdraw}
                className="py-3 bg-emerald-600 text-white font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1"
              >
                <CheckCircle size={14} /> রিকোয়েস্ট সফল
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative space-y-4">
            <h3 className="text-xl font-extrabold text-slate-800 text-center">উইথড্র রিজেক্ট ও রিফান্ড</h3>
            <p className="text-sm text-slate-600 font-medium text-center">
              আপনি কি এই <strong>{confirmRejectModal.amount} ৳</strong> উইথড্র রিকোয়েস্টটি প্রত্যাখান ও ব্যবহারকারীর একাউন্টে রিফান্ড করতে চান?
            </p>
            <div className="bg-rose-50 p-4 rounded-2xl text-xs space-y-1 font-mono text-rose-800">
              <p><strong>নম্বর:</strong> {confirmRejectModal.phone}</p>
              <p><strong>রিফান্ড পরিমাণ:</strong> {confirmRejectModal.amount} ৳</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button 
                onClick={() => setConfirmRejectModal(null)}
                className="py-3 bg-slate-100 text-slate-700 font-bold rounded-xl active:scale-95 transition"
              >
                বাতিল করুন
              </button>
              <button 
                onClick={executeRejectWithdraw}
                className="py-3 bg-rose-600 text-white font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1"
              >
                <XCircle size={14} /> রিজেক্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
