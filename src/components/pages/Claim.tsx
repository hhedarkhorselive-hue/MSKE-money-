import { useState, useEffect } from 'react';
import { Gift, Coins, Loader2, Sparkles, Clock, AlertTriangle, X } from 'lucide-react';
import { claimDailyIncome } from '../../firebase';

export default function Claim({ user, onUpdateUser }: { user: any; onUpdateUser: (updated: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const [isWithinTime, setIsWithinTime] = useState(false);
  const [showPackages, setShowPackages] = useState(false);

  const hasActivePackage = user?.hasActivePackage || false;
  const packageTitle = user?.activePackageTitle || 'কোনো প্যাকেজ একটিভ নেই';
  const dailyIncomeRate = user?.dailyIncomeRate || 0;
  const purchasedPackages = user?.purchasedPackages || [];

  // Track if they already claimed recently (within 24h)
  const lastClaimedAt = user?.lastClaimedAt;

  // Re-declare alreadyClaimedToday based on 24 hours logic
  const now = new Date();
  const alreadyClaimedToday = lastClaimedAt ? (now.getTime() - new Date(lastClaimedAt).getTime()) < 24 * 60 * 60 * 1000 : false;

  useEffect(() => {
    if (!lastClaimedAt) {
      setIsWithinTime(true);
      setCountdownText('আপনি এখন টাস্ক ক্লেম করতে পারবেন!');
      return;
    }

    const updateTime = () => {
      const current = new Date();
      const lastClaim = new Date(lastClaimedAt);
      const targetTime = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

      if (current >= targetTime) {
        setIsWithinTime(true);
        setCountdownText('ক্লেম করার সময় হয়েছে! ২৪ ঘণ্টা অতিবাহিত হয়েছে।');
      } else {
        setIsWithinTime(false);
        const diffMs = targetTime.getTime() - current.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setCountdownText(`পরবর্তী ক্লেম করতে আর বাকি: ${diffHrs} ঘণ্টা ${diffMins} মিনিট ${diffSecs} সেকেন্ড।`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastClaimedAt]);

  const handleClaim = async () => {
    if (!user || !user.phone) {
      alert('অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }

    if (!hasActivePackage) {
      alert('আপনার কোনো একটিভ প্যাকেজ নেই! অনুগ্রহ করে হোম পেজ থেকে একটি প্যাকেজ ক্রয় করুন।');
      return;
    }

    if (!isWithinTime && !testMode) {
      alert('শর্ত অনুযায়ী ২৪ ঘণ্টা পর পর ইনকাম ক্লেম করতে পারবেন!');
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
    <>
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
      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 p-6 rounded-[2.2rem] max-w-sm mx-auto border border-slate-100 text-left space-y-3 shadow-sm relative">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-500">চলতি প্যাকেজ</span>
            <h3 className="font-extrabold text-slate-800 text-lg">{packageTitle}</h3>
          </div>
          {purchasedPackages.length > 0 && (
            <button 
              onClick={() => setShowPackages(true)}
              className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform"
            >
              <div className="bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                {purchasedPackages.length}
              </div>
              টি প্যাকেজ
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">ডেইলি ইনকাম</p>
            <p className="font-extrabold text-emerald-600 text-xl font-mono">{hasActivePackage ? `${dailyIncomeRate} ৳` : '০.০০ ৳'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase font-sans">সর্বশেষ ক্লেম</p>
            <p className="font-bold text-slate-600 text-xs mt-1">
              {alreadyClaimedToday ? 'আজ সম্পূর্ণ' : lastClaimedAt ? 'আগে সম্পূর্ণ' : 'কখনো নয়'}
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
            <p className="text-xs font-medium leading-snug mt-0.5">আপনি আপনার প্যাকেজ টাস্ক সফলভাবে ক্লেম করেছেন! ২৪ ঘণ্টা পরে আবার ক্লেম করতে পারবেন।</p>
          </div>
        </div>
      )}

      <div className="max-w-sm mx-auto pt-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-3 flex justify-between items-center shadow-sm text-center">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">প্যাকেজ সংখ্যা</p>
            <p className="text-xl font-extrabold text-indigo-600">{purchasedPackages?.length > 0 ? purchasedPackages.length : (hasActivePackage ? 1 : 0)} <span className="text-sm font-medium">টি</span></p>
          </div>
          <div className="w-px h-10 bg-slate-200"></div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">দৈনিক ইনকাম</p>
            <p className="text-xl font-extrabold text-emerald-600">{hasActivePackage ? dailyIncomeRate : 0} <span className="text-sm font-medium">৳</span></p>
          </div>
        </div>

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
            'ক্লেম সম্পূর্ণ হয়েছে'
          ) : !hasActivePackage ? (
            'কোনো প্যাকেজ নেই'
          ) : (
            'ক্লেম করুন'
          )}
        </button>
      </div>


    </div>

      {/* Packages Modal */}
      {showPackages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between z-10 sticky top-0">
              <h3 className="font-extrabold text-slate-800 text-lg">আপনার সমস্ত প্যাকেজ</h3>
              <button 
                onClick={() => setShowPackages(false)}
                className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 active:scale-95 transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {purchasedPackages.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  আপনি এখনো কোনো প্যাকেজ কেনেননি।
                </div>
              ) : (
                purchasedPackages.map((pkg: any) => {
                  const daysElapsed = Math.floor((new Date().getTime() - new Date(pkg.purchasedAt).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={pkg.id || Math.random()} className="bg-white border text-left border-slate-100 p-4 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-base">{pkg.title || 'প্যাকেজ'}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">
                          সক্রিয়
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">প্যাকেজ মূল্য</p>
                          <p className="font-bold text-slate-700">{pkg.price || 0} ৳</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">ডেইলি ইনকাম</p>
                          <p className="font-bold text-emerald-600">{pkg.dailyRate || 0} ৳</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">মোট আয় হয়েছে</p>
                          <p className="font-bold text-indigo-600">{pkg.totalEarned || 0} ৳</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">দিন অতিবাহিত</p>
                          <p className="font-bold text-slate-700">{daysElapsed} দিন</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
