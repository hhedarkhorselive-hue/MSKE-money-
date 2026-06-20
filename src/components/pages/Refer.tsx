import { useState, useEffect } from 'react';
import { Users, Copy, Check, Coins, TrendingUp } from 'lucide-react';
import { getReferralsCountAndIncome } from '../../firebase';

export default function Refer({ user }: { user: any }) {
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [referralIncome, setReferralIncome] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const myReferCode = user?.referCode || 'এখনো বরাদ্দ হয়নি';

  useEffect(() => {
    if (user?.referCode) {
      getReferralsCountAndIncome(user.referCode)
        .then(({ count, income }) => {
          setReferralCount(count);
          setReferralIncome(income);
        })
        .catch((err) => {
          console.error("Error fetching referral stats:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user?.referCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(myReferCode);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="text-center py-10 space-y-8 animate-fade-in">
      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto rotate-12 shadow-md">
        <Users size={40} />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800">বন্ধুদের ইনভাইট করুন</h2>
        <p className="text-slate-500 text-sm px-10 mt-2">
          আপনার আমন্ত্রণ কোডটি ব্যবহার করে অন্য কেউ নতুন অ্যাকাউন্ট খুললে আপনি <span className="text-emerald-500 font-bold font-mono">৫০ টাকা</span> নগদ বোনাস পাবেন একদম ইনস্ট্যান্ট!
        </p>
      </div>

      {/* Stats Boxes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-3xl border border-indigo-100/80 text-left shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-xs font-bold">মোট জয়েন মেম্বার</span>
            <span className="p-1.5 bg-indigo-500 text-white rounded-xl">
              <Users size={14} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-indigo-900 font-mono">
            {loading ? '...' : `${referralCount ?? 0} জন`}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-3xl border border-emerald-100/80 text-left shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-xs font-bold">মোট রেফারড আয়</span>
            <span className="p-1.5 bg-emerald-500 text-white rounded-xl">
              <Coins size={14} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 font-mono">
            {loading ? '...' : `${referralIncome ?? 0} ৳`}
          </p>
        </div>
      </div>
      
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-between">
        <span className="text-slate-800 font-mono text-lg font-bold select-all tracking-widest pl-2">
          {myReferCode}
        </span>
        <button 
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-white px-5 py-3 rounded-xl text-xs font-bold transition duration-300 ${copied ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
        >
          {copied ? (
            <>
              <Check size={14} /> কপি হয়েছে
            </>
          ) : (
            <>
              <Copy size={14} /> কপি করুন
            </>
          )}
        </button>
      </div>

      <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
        <p className="font-bold text-slate-600 mb-1">💡 কীভাবে কাজ করে:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>আপনার আমন্ত্রণ কোডটি কপি করে বন্ধুদের সাথে শেয়ার করুন।</li>
          <li>রেজিস্ট্রেশন করার সময় তারা আপনার এই কোডটি দিবে।</li>
          <li>অ্যাকাউন্ট খোলার সাথে সাথেই আপনার ব্যালেন্সে ৫০ টাকা ও তাদের ব্যালেন্সে ৫০ টাকা বোনাস যোগ হবে।</li>
        </ol>
      </div>
    </div>
  );
}
