import React, { useState } from 'react';
import { db, getUserDataByPhone, checkReferredPackagesStatus } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, History, Plus } from 'lucide-react';

interface WithdrawProps {
  user: any;
  onUpdateUser: (updated: any) => void;
  onClose: () => void;
  onOpenHistory: () => void;
}

export default function Withdraw({ user, onUpdateUser, onClose, onOpenHistory }: WithdrawProps) {
  const [selectedMethod, setSelectedMethod] = useState<'Bkash' | 'Nagad' | 'Upay' | 'Cellfin'>(
    user?.savedWithdrawMethod || 'Bkash'
  );
  const [phone, setPhone] = useState(user?.savedWithdrawPhone || '');
  const [amount, setAmount] = useState('');
  const [saveNumber, setSaveNumber] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSelectMethod = (method: 'Bkash' | 'Nagad' | 'Upay' | 'Cellfin') => {
    setSelectedMethod(method);
  };

  const handleSetAll = () => {
    const bal = user?.balance || 0;
    setAmount(bal.toFixed(2));
  };

  const handleConfirmWithdraw = async () => {
    if (!user || !user.phone) {
      alert('অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }

    const trimmedPhone = phone.trim();
    const withdrawAmount = Number(amount.trim());

    if (!trimmedPhone || !amount) {
      alert("অনুগ্রহ করে আপনার পেমেন্ট নম্বর এবং টাকা উইথড্র করার পরিমাণ প্রবেশ করান!");
      return;
    }

    if (isNaN(withdrawAmount) || withdrawAmount < 450) {
      alert('উইথড্র করার সর্বনিম্ন সীমা ৪৫০ টাকা!');
      return;
    }

    if (user.balance < withdrawAmount) {
      alert(`আপনার একাউন্টে পর্যাপ্ত ব্যালেন্স নেই! আপনার বর্তমান ব্যালেন্স ${user.balance || 0} ৳।`);
      return;
    }

    setLoading(true);
    try {
      // Run referral validation
      const { hasAnyReferralWithPackage, referredCount } = await checkReferredPackagesStatus(user.referCode);

      if (referredCount > 0 && !hasAnyReferralWithPackage) {
        alert(`❌ দুঃখিত! আপনি ${referredCount} জনকে রেফার করেছেন, কিন্তু তাদের মধ্য থেকে কেউ কোনো প্যাকেজ কেনেননি। টাকা তুলতে হলে আপনার রেফারেলদের মধ্যে অন্তত ১ জনকে যেকোনো একটি প্যাকেজ কিনতে হবে!`);
        setLoading(false);
        return;
      }

      const newBalance = user.balance - withdrawAmount;
      const withdrawLog = {
        amount: withdrawAmount,
        phone: trimmedPhone,
        method: selectedMethod === 'Bkash' ? 'বিকাশ' : selectedMethod === 'Nagad' ? 'নগদ' : selectedMethod === 'Upay' ? 'ইউপে' : 'সেলফিন',
        status: 'পেন্ডিং (২৪ ঘণ্টার মধ্যে পরিশোধ করা হবে)',
        date: new Date().toLocaleDateString('bn-BD'),
        time: new Date().toLocaleTimeString('bn-BD')
      };

      const existingLogs = user.withdrawLogs || [];
      const updatedLogs = [withdrawLog, ...existingLogs];

      const userRef = doc(db, 'users', user.phone);
      
      const updates: any = {
        balance: newBalance,
        withdrawLogs: updatedLogs
      };

      if (saveNumber) {
        updates.savedWithdrawPhone = trimmedPhone;
        updates.savedWithdrawMethod = selectedMethod;
      }

      await updateDoc(userRef, updates);

      onUpdateUser({ 
        ...user, 
        balance: newBalance,
        withdrawLogs: updatedLogs,
        ...(saveNumber ? { savedWithdrawPhone: trimmedPhone, savedWithdrawMethod: selectedMethod } : {})
      });

      alert(`🎉 অভিনন্দন! আপনার ${withdrawAmount} ৳ উইথড্র রিকোয়েস্টটি সফলভাবে পাঠানো হয়েছে। আগামী ২৪ ঘণ্টার মধ্যে আপনার দেয়া ${selectedMethod} মোবাইল নাম্বারে টাকা চলে যাবে।`);
      setAmount('');
      if (!saveNumber) {
        setPhone('');
      }
      onClose();
    } catch (error: any) {
      console.error("Error processing withdrawal:", error);
      alert('উইথড্র করার সময় কোনো সমস্যা হয়েছে: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const getLogos = () => {
    return {
      Nagad: 'https://i.postimg.cc/Bv1jzJPW/unnamed.jpg',
      Bkash: 'https://i.postimg.cc/854NKY48/images-(16).jpg',
      Upay: 'https://i.postimg.cc/mDYtbVSm/unnamed.png',
      Cellfin: 'https://i.postimg.cc/sxKxWXqR/images-(17).jpg'
    };
  };

  const logos = getLogos();

  const getBorderColor = (method: string) => {
    return selectedMethod === method ? 'border-green-500 scale-105 shadow-sm bg-green-50/10' : 'border-slate-200 opacity-80 hover:border-slate-300';
  };

  const displayReceivedAmount = () => {
    const val = Number(amount);
    if (isNaN(val) || val <= 0 || val > (user?.balance || 0)) {
       return '৳0.00';
    }
    return `৳${val.toFixed(2)}`;
  };

  const isBelowLimit = amount !== '' && (Number(amount) < 450 || isNaN(Number(amount)));
  const hasInsufficientBalance = amount !== '' && !isNaN(Number(amount)) && Number(amount) > (user?.balance || 0);

  return (
    <div className="w-full text-slate-800 font-sans animate-fade-in pb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button 
          type="button" 
          onClick={onClose} 
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-xl text-slate-800">Withdraw</h1>
        <button 
          type="button" 
          onClick={onOpenHistory} 
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition"
        >
          <History size={14} />
          History
        </button>
      </div>

      {/* Yellow Account Balance Card */}
      <div className="p-6 bg-[#f3be00] rounded-[2rem] text-slate-900 text-left shadow-md shadow-amber-100 mb-6 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
          <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2-.9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </div>
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-950 opacity-80 mb-1">Available balance</p>
          <h2 className="text-3xl font-extrabold font-mono">৳{(user?.balance || 0).toFixed(2)}</h2>
        </div>
      </div>

      {/* Select Withdrawal Method */}
      <div className="mb-6 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Select Withdrawal Method</p>
        <div className="grid grid-cols-4 gap-3">
          <div 
            className={`cursor-pointer transition rounded-2xl border p-1.5 flex justify-center items-center ${getBorderColor('Nagad')}`}
            onClick={() => handleSelectMethod('Nagad')}
          >
            <img 
              referrerPolicy="no-referrer"
              src={logos.Nagad} 
              className="h-10 w-full object-contain rounded-xl" 
              alt="Nagad"
            />
          </div>
          <div 
            className={`cursor-pointer transition rounded-2xl border p-1.5 flex justify-center items-center ${getBorderColor('Bkash')}`}
            onClick={() => handleSelectMethod('Bkash')}
          >
            <img 
              referrerPolicy="no-referrer"
              src={logos.Bkash} 
              className="h-10 w-full object-contain rounded-xl" 
              alt="Bkash"
            />
          </div>
          <div 
            className={`cursor-pointer transition rounded-2xl border p-1.5 flex justify-center items-center ${getBorderColor('Upay')}`}
            onClick={() => handleSelectMethod('Upay')}
          >
            <img 
              referrerPolicy="no-referrer"
              src={logos.Upay} 
              className="h-10 w-full object-contain rounded-xl" 
              alt="Upay"
            />
          </div>
          <div 
            className={`cursor-pointer transition rounded-2xl border p-1.5 flex justify-center items-center ${getBorderColor('Cellfin')}`}
            onClick={() => handleSelectMethod('Cellfin')}
          >
            <img 
              referrerPolicy="no-referrer"
              src={logos.Cellfin} 
              className="h-10 w-full object-contain rounded-xl" 
              alt="Cellfin"
            />
          </div>
        </div>
      </div>

      {/* Account Number Input with Saved Option */}
      <div className="mb-6 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Withdrawal Account</p>
        <div className="border border-slate-200 rounded-2xl p-4 flex justify-between items-center bg-slate-50 focus-within:border-green-500 focus-within:bg-white transition duration-200 shadow-inner">
          <input 
            type="text" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="নাম্বার লিখুন (বিকাশ / নগদ নম্বর)" 
            className="w-full outline-none text-sm font-bold bg-transparent text-slate-800 placeholder:text-slate-400"
          />
          <Plus className="text-slate-400 ml-1" size={18} />
        </div>

        {/* Save number toggle checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
          <input 
            type="checkbox" 
            checked={saveNumber}
            onChange={(e) => setSaveNumber(e.target.checked)}
            className="w-5 h-5 rounded-lg text-green-600 focus:ring-green-500 border-slate-300 transition"
          />
          <span className="text-xs text-slate-500 font-bold leading-normal select-none">
            ভবিষ্যতের উইথড্র এর জন্য এই নাম্বারটি সংরক্ষণ করুন
          </span>
        </label>
      </div>

      {/* Amount Box */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Withdrawal Amount</p>
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 focus-within:border-indigo-500 focus-within:bg-white transition duration-200">
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0" 
            className="w-full bg-transparent text-4xl font-black outline-none border-none text-slate-800 font-mono"
          />
          <div className="flex justify-between items-center mt-4">
            <p className="text-xs text-slate-400 font-bold">Available: ৳{(user?.balance || 0).toFixed(2)}</p>
            <button 
              type="button" 
              onClick={handleSetAll} 
              className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer"
            >
              ALL
            </button>
          </div>
        </div>

        {isBelowLimit && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-pulse">
            ⚠️ উইথড্র করার সর্বনিম্ন সীমা ৪৫০ টাকা!
          </div>
        )}

        {hasInsufficientBalance && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
            ⚠️ পর্যাপ্ত ব্যালেন্স নেই! আপনার বর্তমান ব্যালেন্স ৳{(user?.balance || 0).toFixed(2)}।
          </div>
        )}

        <p className="text-sm font-bold text-slate-600">
          Amount received: <span id="received" className="text-green-600 font-extrabold">{displayReceivedAmount()}</span>
        </p>
      </div>

      {/* Action Button */}
      <button 
        type="button"
        disabled={loading || isBelowLimit || hasInsufficientBalance || !amount || !phone}
        onClick={handleConfirmWithdraw} 
        className="w-full text-white py-4 rounded-[1.5rem] font-extrabold text-base transition-all duration-300 hover:brightness-105 active:scale-98 shadow-md border-none cursor-pointer"
        style={{
          boxShadow: isBelowLimit || hasInsufficientBalance || !amount || !phone ? 'none' : '0 8px 16px rgba(22, 163, 74, 0.2)',
          backgroundColor: isBelowLimit || hasInsufficientBalance || !amount || !phone ? '#cbcee0' : '#16a34a',
          cursor: isBelowLimit || hasInsufficientBalance || !amount || !phone ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Processing...' : 'Withdraw'}
      </button>
    </div>
  );
}
