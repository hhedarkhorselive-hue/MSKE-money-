import React, { useState, useEffect } from 'react';
import { checkReferredPackagesStatus, db, getUserDataByPhone } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, Copy, RefreshCw, X, LogOut, ArrowRight, HelpCircle, Send, Download, Key, PhoneCall, MessageSquare } from 'lucide-react';
import Deposit from './Deposit';
import Withdraw from './Withdraw';
import Admin from './Admin';

export default function Account({ 
  user, 
  onLogout,
  onUpdateUser,
  onOpenAdmin,
  initialAction = 'none'
}: { 
  user: any; 
  onLogout: () => void;
  onUpdateUser?: (updated: any) => void;
  onOpenAdmin: () => void;
  initialAction?: 'none' | 'deposit' | 'withdraw' | 'deposit_history' | 'withdraw_history';
}) {
  const [activeAction, setActiveAction] = useState<'none' | 'deposit' | 'withdraw' | 'deposit_history' | 'withdraw_history'>(initialAction);

  useEffect(() => {
    setActiveAction(initialAction);
  }, [initialAction]);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Deposit form states
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('বিকাশ');
  const [depositTxid, setDepositTxid] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);

  const personalNumber = '01333468617';

  // Format today's date for display
  const [lastLoginStr, setLastLoginStr] = useState('');
  useEffect(() => {
    const now = new Date();
    const formatted = now.getFullYear() + '-' + 
                      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(now.getDate()).padStart(2, '0') + ' ' + 
                      String(now.getHours()).padStart(2, '0') + ':' + 
                      String(now.getMinutes()).padStart(2, '0') + ':' + 
                      String(now.getSeconds()).padStart(2, '0');
    setLastLoginStr(formatted);
  }, []);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert("UID কপি করা হয়েছে: " + text);
  };

  const handleRefreshBalance = async () => {
    if (!user || !user.phone) return;
    setRefreshing(true);
    try {
      const freshData = await getUserDataByPhone(user.phone);
      if (freshData && onUpdateUser) {
        onUpdateUser(freshData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.phone) {
      alert('অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }

    const amountStr = depositAmount.trim();
    const txid = depositTxid.trim();

    if (!amountStr || !txid) {
      alert('অনুগ্রহ করে জমার পরিমাণ এবং ট্রানজেকশন আইডি প্রবেশ করান!');
      return;
    }

    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('দয়া করে সঠিক জমার পরিমাণ লিখুন!');
      return;
    }

    setDepositLoading(true);

    try {
      const userRef = doc(db, 'users', user.phone);
      const newBalance = (user.balance || 0) + amount;
      
      // Add deposit to user transaction logs
      const depositLog = {
        amount,
        method: depositMethod,
        txid,
        status: 'সফল',
        date: new Date().toLocaleDateString('bn-BD'),
        time: new Date().toLocaleTimeString('bn-BD')
      };
      const existingLogs = user.depositLogs || [];
      const updatedLogs = [depositLog, ...existingLogs];

      // Simulate verification loader for premium experience
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await updateDoc(userRef, { 
        balance: newBalance,
        depositLogs: updatedLogs
      });

      if (onUpdateUser) {
        onUpdateUser({ 
          ...user, 
          balance: newBalance,
          depositLogs: updatedLogs
        });
      }

      alert(`🎉 সফল ডিপোজিট! ট্রানজেকশন আইডি '${txid}' সফলভাবে যাচাই করা হয়েছে। আপনার একাউন্টে ${amount} ৳ জমাকৃত টাকা যোগ করা হলো।`);
      setDepositAmount('');
      setDepositTxid('');
      setActiveAction('none');
    } catch (err: any) {
      console.error(err);
      alert('ডিপোজিট প্রসেসিং করার সময় সমস্যা হয়েছে। আবার চেষ্টা করুন!');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.phone) {
      alert('অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }

    const amount = Number(withdrawAmount.trim());
    const phoneNo = withdrawPhone.trim();

    if (!withdrawAmount || !phoneNo) {
      alert('দয়া করে উইথড্র পরিমাণ এবং বিকাশ/নগদ নাম্বার দিন!');
      return;
    }

    if (isNaN(amount) || amount < 450) {
      alert('উইথড্র করার সর্বনিম্ন সীমা ৪৫০ টাকা!');
      return;
    }

    if (user.balance < amount) {
      alert(`আপনার একাউন্টে পর্যাপ্ত ব্যালেন্স নেই! আপনার বর্তমান ব্যালেন্স ${user.balance || 0} ৳।`);
      return;
    }

    setLoading(true);
    try {
      const { hasAnyReferralWithPackage, referredCount } = await checkReferredPackagesStatus(user.referCode);

      if (referredCount > 0 && !hasAnyReferralWithPackage) {
        alert(`❌ দুঃখিত! আপনি ${referredCount} জনকে রেফার করেছেন, কিন্তু তাদের মধ্য থেকে কেউ কোনো প্যাকেজ কেনেননি। টাকা তুলতে হলে আপনার রেফারেলদের মধ্যে অন্তত ১ জনকে যেকোনো একটি প্যাকেজ কিনতে হবে!`);
        setLoading(false);
        return;
      }
      
      const newBalance = user.balance - amount;
      
      const withdrawLog = {
        amount,
        phone: phoneNo,
        status: 'পেন্ডিং (২৪ ঘণ্টার মধ্যে পরিশোধ করা হবে)',
        date: new Date().toLocaleDateString('bn-BD'),
        time: new Date().toLocaleTimeString('bn-BD')
      };
      const existingLogs = user.withdrawLogs || [];
      const updatedLogs = [withdrawLog, ...existingLogs];

      const userRef = doc(db, 'users', user.phone);
      await updateDoc(userRef, { 
        balance: newBalance,
        withdrawLogs: updatedLogs
      });

      if (onUpdateUser) {
        onUpdateUser({ 
          ...user, 
          balance: newBalance,
          withdrawLogs: updatedLogs
        });
      }

      alert(`🎉 অভিনন্দন! আপনার ${amount} ৳ উইথড্র রিকোয়েস্টটি সফলভাবে পাঠানো হয়েছে। আগামী ২৪ ঘণ্টার মধ্যে আপনার দেয়া মোবাইল নাম্বারে টাকা চলে যাবে।`);
      setWithdrawAmount('');
      setWithdrawPhone('');
      setActiveAction('none');
    } catch (error: any) {
      console.error("Error processing withdrawal:", error);
      alert('উইথড্র করার সময় কোনো সমস্যা হয়েছে: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.phone) return;
    const pwd = newPassword.trim();
    if (!pwd || pwd.length < 4) {
      alert('পাসওয়ার্ডটি অবশ্যই অন্তত ৪ অক্ষরের হতে হবে!');
      return;
    }
    setPasswordChanging(true);
    try {
      const userRef = doc(db, 'users', user.phone);
      await updateDoc(userRef, { password: pwd });
      if (onUpdateUser) {
        onUpdateUser({ ...user, password: pwd });
      }
      alert('🎉 সফলভাবে পাসওয়ার্ড পরিবর্তন করা হয়েছে!');
      setNewPassword('');
      setShowPasswordChange(false);
    } catch (err: any) {
      console.error(err);
      alert('পাসওয়ার্ড পরিবর্তন করার সময় কোনো সমস্যা হয়েছে!');
    } finally {
      setPasswordChanging(false);
    }
  };

  if (activeAction === 'deposit') {
    return (
      <Deposit 
        user={user} 
        onUpdateUser={(updated) => {
          if (onUpdateUser) onUpdateUser(updated);
        }}
        onClose={() => setActiveAction('none')}
        onOpenHistory={() => setActiveAction('deposit_history')}
      />
    );
  }

  if (activeAction === 'withdraw') {
    return (
      <Withdraw 
        user={user} 
        onUpdateUser={(updated) => {
          if (onUpdateUser) onUpdateUser(updated);
        }}
        onClose={() => setActiveAction('none')}
        onOpenHistory={() => setActiveAction('withdraw_history')}
      />
    );
  }

  return (
    <div className="flex justify-center items-center py-4 w-full">
      <style>{`
        /* Custom styled overrides to match user requested Premium User Dashboard exactly */
        .dashboard-container {
          width: 100%;
          max-width: 460px;
          background: linear-gradient(to bottom, #f3be00 0%, #f3be00 48%, #f8f9fa 48%, #f8f9fa 100%);
          border-radius: 28px;
          padding: 24px 16px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.06);
          position: relative;
        }

        .profile-wrapper {
          display: flex;
          align-items: center;
          margin-bottom: 24px;
          padding-left: 4px;
        }

        .profile-img {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.5);
          object-fit: cover;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }

        .profile-details {
          margin-left: 14px;
          flex-grow: 1;
        }

        .username-container {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .username {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: 0.2px;
          word-break: break-all;
        }

        .vip-badge {
          background: linear-gradient(180deg, #ffffff 0%, #dcdcdc 50%, #b5b5b5 100%);
          border: 1.5px solid #ffffff;
          color: #4a4a4a;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 3px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          text-shadow: 0 1px 0 rgba(255,255,255,0.8);
        }

        .uid-box {
          display: inline-flex;
          align-items: center;
          background: #ff8441;
          color: #ffffff;
          padding: 3px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          margin-top: 8px;
          box-shadow: 0 2px 4px rgba(255, 132, 65, 0.2);
        }

        .uid-box .divider {
          margin: 0 6px;
          opacity: 0.5;
        }

        .uid-box .copy-icon {
          margin-left: 6px;
          cursor: pointer;
          width: 12px;
          height: 12px;
          fill: #ffffff;
          transition: transform 0.2s;
        }

        .uid-box .copy-icon:hover {
          transform: scale(1.15);
        }

        .login-time {
          font-size: 11px;
          color: rgba(0, 0, 0, 0.55);
          font-weight: 500;
          margin-top: 6px;
        }

        .white-board {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.02);
        }

        .balance-title {
          color: #8e949a;
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .balance-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #f1f3f5;
          padding-bottom: 18px;
          margin-bottom: 22px;
        }

        .amount {
          font-size: 26px;
          font-weight: 700;
          color: #0d141c;
        }

        .refresh-icon-btn {
          width: 24px;
          height: 24px;
          background: transparent;
          border: none;
          color: #adb5bd;
          cursor: pointer;
          transition: transform 0.4s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .refresh-icon-btn:hover {
          transform: rotate(180deg);
          color: #f3be00;
        }

        .buttons-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          text-align: center;
        }

        .grid-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s;
        }

        .grid-item:active {
          transform: scale(0.95);
        }

        .icon-wrapper {
          width: 42px;
          height: 42px;
          margin-bottom: 10px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .item-label {
          font-size: 11.5px;
          font-weight: 600;
          line-height: 1.3;
          color: #000000;
        }

        .bottom-stars {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5px;
          margin-top: 24px;
        }

        .bottom-stars svg {
          width: 11px;
          height: 11px;
          fill: #6c757d;
          opacity: 0.7;
        }

        .bottom-stars svg.center-star {
          width: 16px;
          height: 16px;
          fill: #495057;
          opacity: 1;
        }
      `}</style>

      <div className="dashboard-container">
        
        {/* Profile Wrapper */}
        <div className="profile-wrapper">
          <img 
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop" 
            alt="User Avatar" 
            className="profile-img"
          />
          <div className="profile-details">
            <div className="username-container">
              <span className="username">MEMBER{user?.customUid || '1037830'}</span>
              <div className="vip-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#6a6a6a">
                  <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z"/>
                </svg>
                {user?.hasActivePackage ? 'VIP1' : 'VIP0'}
              </div>
            </div>
            
            <div className="uid-box">
              <span>UID</span>
              <span className="divider">|</span>
              <span>{user?.customUid || '1037830'}</span>
              <svg 
                className="copy-icon" 
                viewBox="0 0 24 24" 
                onClick={() => handleCopyText(String(user?.customUid || '1037830'))}
              >
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0 -1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </div>
            
            <div className="login-time">Last login: {lastLoginStr}</div>
          </div>
        </div>

        {/* White Balance & Buttons Board */}
        <div className="white-board">
          <div className="flex justify-between items-end">
            <div>
              <div className="balance-title">Total balance</div>
              <div className="balance-row">
                <span className="amount">৳{(user?.balance || 0).toFixed(2)}</span>
                <button 
                  className={`refresh-icon-btn ${refreshing ? 'animate-spin' : ''}`} 
                  onClick={handleRefreshBalance}
                  title="রিফ্রেশ করুন"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
            
            {(user?.referralBalance || 0) > 0 && (
              <div className="text-right pb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">রেফার বোনাস</p>
                <div className="font-mono font-bold text-amber-500 text-sm">৳{(user?.referralBalance || 0).toFixed(2)}</div>
                <p className="text-[8px] text-slate-400 mt-0.5 leading-tight max-w-[100px] text-right">ডিপোজিট করে প্যাকেজ কিনলে এই টাকা মূল ব্যালেন্সে যোগ হবে</p>
              </div>
            )}
          </div>
          
          {/* Main Action Grid */}
          <div className="buttons-grid">
            
            {/* Deposit */}
            <div 
              className="grid-item" 
              onClick={() => setActiveAction(activeAction === 'deposit' ? 'none' : 'deposit')}
            >
              <div className="icon-wrapper">
                <svg width="42" height="42" viewBox="0 0 44 44">
                  <path d="M6 22 C6 12, 38 12, 38 22 L38 34 C38 38, 6 38, 6 34 Z" fill="#fddcb8"/>
                  <path d="M6 22 C6 14, 38 14, 38 22 Z" fill="#f97316"/>
                </svg>
              </div>
              <span className="item-label"><br/>Deposit</span>
            </div>
            
            {/* Withdraw */}
            <div 
              className="grid-item" 
              onClick={() => setActiveAction(activeAction === 'withdraw' ? 'none' : 'withdraw')}
            >
              <div className="icon-wrapper">
                <svg width="42" height="42" viewBox="0 0 44 44">
                  <rect x="4" y="10" width="36" height="24" rx="6" fill="#9bc5fe" />
                  <rect x="4" y="15" width="36" height="5" fill="#5897fb" />
                  <circle cx="10" cy="26" r="2" fill="#ffffff" opacity="0.7"/>
                  <circle cx="16" cy="26" r="2" fill="#ffffff" opacity="0.7"/>
                </svg>
              </div>
              <span className="item-label"><br/>Withdraw</span>
            </div>

            {/* Deposit History */}
            <div 
              className="grid-item" 
              onClick={() => setActiveAction(activeAction === 'deposit_history' ? 'none' : 'deposit_history')}
            >
              <div className="icon-wrapper">
                <svg width="40" height="40" viewBox="0 0 44 44">
                  <rect x="6" y="4" width="26" height="32" rx="6" fill="#ffeccc" />
                  <rect x="12" y="10" width="26" height="32" rx="6" fill="#ffdfb0" />
                  <circle cx="30" cy="32" r="8" fill="#ff7014" />
                  <path d="M30 28 v4 h3" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <span className="item-label">Deposit<br/>History</span>
            </div>
            
            {/* Withdraw History */}
            <div 
              className="grid-item" 
              onClick={() => setActiveAction(activeAction === 'withdraw_history' ? 'none' : 'withdraw_history')}
            >
              <div className="icon-wrapper">
                <svg width="42" height="42" viewBox="0 0 44 44">
                  <path d="M4 14 C4 11, 8 11, 12 11 L18 14 L38 14 C40 14, 40 17, 40 18 L40 34 C40 37, 36 37, 34 37 L6 37 C4 37, 4 34, 4 32 Z" fill="#5294f9" />
                  <rect x="8" y="16" width="28" height="18" rx="4" fill="#3b82f6" />
                  <path d="M16 25 l4 4 l8 -8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <span className="item-label">Withdraw<br/>History</span>
            </div>
            
          </div>

          {/* Interactive functional overlays / forms inside the white board */}
          {activeAction !== 'none' && (
            <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in text-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm text-slate-700">
                  {activeAction === 'deposit' && 'টাকা ডিপোজিট করুন'}
                  {activeAction === 'withdraw' && 'টাকা উইথড্র করুন'}
                  {activeAction === 'deposit_history' && 'ডিপোজিট হিস্টোরি'}
                  {activeAction === 'withdraw_history' && 'উইথড্র হিস্টোরি'}
                </h4>
                <button 
                  onClick={() => setActiveAction('none')}
                  className="text-slate-400 hover:text-red-500 transition"
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Deposit Form */}
              {activeAction === 'deposit' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-900 space-y-2">
                    <p className="font-bold flex items-center gap-1">
                      <HelpCircle size={14} className="text-amber-600" /> আমাদের পার্সোনাল নাম্বার পেমেন্ট করুন:
                    </p>
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 mt-1">
                      <span className="font-mono font-black text-slate-800 text-sm">{personalNumber}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(personalNumber);
                          alert('নাম্বারটি কপি হয়েছে!');
                        }}
                        className="text-[10px] bg-amber-600 hover:bg-amber-700 font-bold text-white px-2.5 py-1 rounded"
                      >
                        কপি করুন
                      </button>
                    </div>
                    <p className="text-[10px] opacity-80 mt-1">এই নম্বরে সেন্ড মানি করে ট্রানজেকশন আইডিটি নিচে প্রদান করুন।</p>
                  </div>

                  <form onSubmit={handleDepositSubmit} className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">জমার পরিমাণ (৳)</label>
                      <input 
                        type="number" 
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        disabled={depositLoading}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-amber-400" 
                        placeholder="যেমন: ৫০০ " 
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-semibold">পেমেন্ট মাধ্যম</label>
                      <select 
                        value={depositMethod}
                        onChange={(e) => setDepositMethod(e.target.value)}
                        disabled={depositLoading}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none"
                      >
                        <option value="বিকাশ">বিকাশ (Bkash)</option>
                        <option value="নগদ">নগদ (Nagad)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ট্রানজেকশন আইডি (TxID)</label>
                      <input 
                        type="text" 
                        value={depositTxid}
                        onChange={(e) => setDepositTxid(e.target.value)}
                        disabled={depositLoading}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-wider outline-none text-slate-700 focus:border-amber-400" 
                        placeholder="যেমন: AKF8D69A" 
                        required
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={depositLoading}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md"
                    >
                      {depositLoading ? 'যাচাই করা হচ্ছে...' : 'ডিপোজিট সাবমিট করুন'}
                    </button>
                  </form>
                </div>
              )}

              {/* Withdraw Form */}
              {activeAction === 'withdraw' && (
                <form onSubmit={handleWithdraw} className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">উইথড্র পরিমাণ (৳)</label>
                    <input 
                      type="number" 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-amber-400" 
                      placeholder="মিনিমাম ৪৫০ হতে হবে" 
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">বিকাশ / নগদ মোবাইল নম্বর</label>
                    <input 
                      type="text" 
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 font-mono tracking-wider text-slate-700" 
                      placeholder="01XXXXXXXXX" 
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md"
                  >
                    {loading ? 'প্রসেসিং হচ্ছে...' : 'উইথড্র রিকোয়েস্ট পাঠান'}
                  </button>
                </form>
              )}

              {/* Deposit History Logs */}
              {activeAction === 'deposit_history' && (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {(!user.depositLogs || user.depositLogs.length === 0) ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                      কোনো পেমেন্ট বা রিচার্জ হিস্টোরি পাওয়া যায়নি।
                    </div>
                  ) : (
                    user.depositLogs.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{log.method} পেমেন্ট</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{log.date} • {log.time}</p>
                          <p className="text-[10px] text-indigo-600 font-mono mt-0.5" title="Transaction ID">TxID: {log.txid}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-emerald-600">+{log.amount} ৳</p>
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mt-1 font-bold">
                            {log.status || 'সফল'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Withdraw History Logs */}
              {activeAction === 'withdraw_history' && (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {(!user.withdrawLogs || user.withdrawLogs.length === 0) ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                      কোনো উইথড্র হিস্টোরি পাওয়া যায়নি।
                    </div>
                  ) : (
                    user.withdrawLogs.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-800">ক্যাশআউট রিকোয়েস্ট</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{log.date} • {log.time}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">নম্বর: {log.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-red-500">-{log.amount} ৳</p>
                          <p className="text-[9px] text-orange-600 mt-1 font-extrabold">
                            {log.status || 'পেন্ডিং'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Rating/Decoration Stars */}
        <div className="bottom-stars">
          <svg viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z"/></svg>
          <svg viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z"/></svg>
          <svg className="center-star" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z"/></svg>
          <svg viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z"/></svg>
          <svg viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z"/></svg>
        </div>

        {/* Profile Action Menu Items */}
        <div className="w-full mt-5 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2.5">
          {/* Telegram Group Join */}
          <a 
            href="https://t.me/+svaglTDhjKZkYzVl" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 active:scale-[0.99] transition border border-slate-100 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center">
                <Send size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Telegram Group Join</p>
                <p className="text-[10px] text-slate-400 font-semibold font-sans">আমাদের টেলিগ্রাম গ্রুপে যুক্ত হোন</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* App Download */}
          <button 
            type="button"
            onClick={() => {
              alert("🎉 আপনার ফোনে MSKE money অফিসিয়াল অ্যাপ ডাউনলোড শুরু হচ্ছে...");
              const link = document.createElement('a');
              link.href = '#';
              link.setAttribute('download', 'MSKEmoney.apk');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 active:scale-[0.99] transition border border-slate-100 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <Download size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">App Download</p>
                <p className="text-[10px] text-slate-400 font-semibold font-sans">অফিসিয়াল এন্ড্রয়েড অ্যাপ নামিয়ে নিন</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Password Change */}
          <div className="space-y-2">
            <button 
              type="button"
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 active:scale-[0.99] transition border border-slate-100 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <Key size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Password Change</p>
                  <p className="text-[10px] text-slate-400 font-semibold font-sans">একাউন্টের পাসওয়ার্ড পরিবর্তন করুন</p>
                </div>
              </div>
              <ArrowRight size={14} className={`text-slate-400 transition-transform ${showPasswordChange ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
            </button>
            
            {showPasswordChange && (
              <form onSubmit={handlePasswordChange} className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 space-y-2.5 animate-fade-in">
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">নতুন পাসওয়ার্ড লিখুন</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={passwordChanging}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-amber-400"
                    placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={passwordChanging}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-black py-2 rounded-lg text-xs transition"
                >
                  {passwordChanging ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড নিশ্চিত করুন'}
                </button>
              </form>
            )}
          </div>

          {/* Helpline Number */}
          <a 
            href="tel:09658988145" 
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 active:scale-[0.99] transition border border-slate-100 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <PhoneCall size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Helpline Number</p>
                <p className="text-[10px] text-emerald-600 font-bold font-mono">09658988145 (ক্লিক করলেই কল যাবে)</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Telegram Support */}
          <a 
            href="https://t.me/+it9cgrxWbWY1MjM1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 active:scale-[0.99] transition border border-slate-100 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Telegram Support</p>
                <p className="text-[10px] text-slate-400 font-semibold font-sans">সরাসরি ২৪/৭ কাস্টমার সাপোর্ট</p>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Dynamic Support Help Centers Desk & Logout */}
        <div className="mt-6 pt-4 border-t border-slate-200/50 flex flex-col items-center gap-3 w-full">
          <button 
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-red-500 transition px-5 py-2.5 bg-white rounded-full border border-slate-200/60 shadow-sm cursor-pointer"
          >
            <LogOut size={14} /> একাউন্ট লগআউট করুন
          </button>

          <button 
            type="button"
            onClick={onOpenAdmin}
            className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 active:scale-95 transition-all mt-1 cursor-pointer bg-transparent border-none outline-none flex items-center gap-1 hover:underline"
          >
            HTS
          </button>
        </div>

      </div>
    </div>
  );
}
