import { useState, useEffect } from 'react';
import { Gift, Coins, Loader2, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { claimDailyIncome } from '../../firebase';

export default function Claim({ user, onUpdateUser }: { user: any; onUpdateUser: (updated: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const [isWithinTime, setIsWithinTime] = useState(false);

  const hasActivePackage = user?.hasActivePackage || false;
  const packageTitle = user?.activePackageTitle || 'কোনো প্যাকেজ একটিভ নেই';
  const dailyIncomeRate = user?.dailyIncomeRate || 0;

  // Track if they already claimed today
  const lastClaimedDate = user?.lastClaimedDate;
  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const alreadyClaimedToday = lastClaimedDate === todayStr;

  useEffect(() => {
    const updateTime = () => {
      const current = new Date();
      const hour = current.getHours();
      
      const target = new Date(current);
      target.setHours(20, 0, 0, 0); // 8:00 PM today

      if (hour >= 20) {
        setIsWithinTime(true);
        setCountdownText('ক্লেম করার সময় হয়েছে! রাত ০৮:০০ টা অতিক্রম করেছে।');
      } else {
        setIsWithinTime(false);
        const diffMs = target.getTime() - current.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setCountdownText(`রাত ৮:০০ টা বাজতে আরও ${diffHrs} ঘণ্টা ${diffMins} মিনিট ${diffSecs} সেকেন্ড বাকি।`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = async () => {
    if (!user || !user.phone) {
      alert('অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }

    if (!hasActivePackage) {
      alert('আপনার কোনো একটিভ প্যাকেজ নেই! অনুগ্রহ করে হোম পেজ থেকে একটি প্যাকেজ ক্রয় করুন।');
      return;
    }

    if (alreadyClaimedToday) {
      alert('আপনি আজকের ডেইলি ইনকাম ইতিমধ্যেই সফলভাবে ক্লেম করেছেন! আগামীকাল আবার ট্রাই করুন।');
      return;
    }

    if (!isWithinTime && !testMode) {
      alert('শর্ত অনুযায়ী আজকের ইনকাম শুধুমাত্র রাত ৮:০০ টার পর ক্লেম করতে পারবেন!');
      return;
    }

    setLoading(true);
    try {
      const result = await claimDailyIncome(user.phone, testMode);
      onUpdateUser({ ...user, ...result });
      alert(`🎉 অভিনন্দন! আপনার ব্যালেন্সে সফলভাবে ${dailyIncomeRate} ৳ যোগ করা হয়েছে।`);
    } catch (error: any) {
      console.error("Error claiming income:", error);
      alert(error.message || 'ক্লেম করতে কোনো সমস্যা হয়েছে!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center py-6 space-y-6 animate-fade-in">
      <div className="w-28 h-28 bg-orange-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-md relative group">
        <Coins className="text-5xl text-orange-500 animate-pulse" />
        <Sparkles className="absolute -top-1 -right-1 text-yellow-500 animate-bounce" size={24} />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-800">ডেইলি টাস্ক ক্লেম</h2>
        <p className="text-slate-500 text-sm mt-1">প্রতিদিন রাত আটটায় আপনার ইনকাম এখান থেকে বুঝে নিন</p>
      </div>
      
      {/* Active Package Card */}
      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-6 rounded-[2.2rem] max-w-sm mx-auto border border-slate-100 text-left space-y-3 shadow-sm">
        <div>
          <span className="text-[10px] uppercase font-bold text-indigo-500">চলতি প্যাকেজ</span>
          <h3 className="font-extrabold text-slate-800 text-lg">{packageTitle}</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">ডেইলি ইনকাম</p>
            <p className="font-extrabold text-emerald-600 text-xl font-mono">{hasActivePackage ? `${dailyIncomeRate} ৳` : '০.০০ ৳'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase font-sans">সর্বশেষ ক্লেম</p>
            <p className="font-bold text-slate-600 text-xs mt-1">
              {alreadyClaimedToday ? 'আজ সম্পূর্ণ' : lastClaimedDate ? 'আগে সম্পূর্ণ' : 'কখনো নয়'}
            </p>
          </div>
        </div>
      </div>

      {/* Countdown Card */}
      {hasActivePackage && !alreadyClaimedToday && (
        <div className={`p-4 rounded-2xl max-w-sm mx-auto border flex items-center gap-3 text-left ${isWithinTime ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
          <Clock className={isWithinTime ? 'text-emerald-500 animate-spin-slow' : 'text-amber-500'} size={24} />
          <div>
            <h4 className="text-xs font-bold uppercase">সময় সূচি</h4>
            <p className="text-xs font-medium font-mono leading-snug mt-0.5">{countdownText}</p>
          </div>
        </div>
      )}

      {alreadyClaimedToday && (
        <div className="p-4 rounded-2xl max-w-sm mx-auto border bg-emerald-50 border-emerald-100 text-emerald-800 flex items-center gap-3 text-left">
          <Clock className="text-emerald-500" size={24} />
          <div>
            <h4 className="text-xs font-bold uppercase">ক্লেম অবস্থা</h4>
            <p className="text-xs font-medium leading-snug mt-0.5">আপনি আজকের টাস্ক সফলভাবে ক্লেম করেছেন! আগামীকাল রাত ৮:০০ টায় আবার ক্লেম করতে পারবেন।</p>
          </div>
        </div>
      )}

      <div className="max-w-sm mx-auto pt-2">
        <button 
          onClick={handleClaim}
          disabled={loading || alreadyClaimedToday || (!isWithinTime && !testMode && hasActivePackage)}
          className={`w-full py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition flex items-center justify-center gap-2 text-white
            ${alreadyClaimedToday 
              ? 'bg-slate-300 shadow-none cursor-not-allowed' 
              : !hasActivePackage 
                ? 'bg-slate-400 shadow-none'
                : (!isWithinTime && !testMode) 
                  ? 'bg-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-100'
            }`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} /> চেক হচ্ছে...
            </>
          ) : alreadyClaimedToday ? (
            'আজকের ক্লেম সম্পূর্ণ হয়েছে'
          ) : !hasActivePackage ? (
            'কোনো প্যাকেজ নেই'
          ) : (
            'ক্লেম করুন'
          )}
        </button>
      </div>


    </div>
  );
}
