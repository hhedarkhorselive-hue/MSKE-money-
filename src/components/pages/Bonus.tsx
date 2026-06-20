import React, { useState, useEffect } from 'react';
import { Gift, Coins, Trophy, Sparkles, Star, Heart, ArrowRight, CheckCircle2, ChevronRight, HelpCircle, AlertCircle, Sparkle } from 'lucide-react';
import { db, claimNightlyBonus } from '../../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export default function Bonus({ user, onUpdateUser }: { user: any; onUpdateUser: (updated: any) => void }) {
  const [claiming, setClaiming] = useState(false);
  const [bonusClaimedToday, setBonusClaimedToday] = useState(false);
  const [randomBonusAmount, setRandomBonusAmount] = useState<number | null>(null);

  // Nightly package bonus state
  const [nightlyClaiming, setNightlyClaiming] = useState(false);
  const [testOverride, setTestOverride] = useState(false); // Default to live mode (false) to be fully standard and safe.
  const [nightlyClmToday, setNightlyClmToday] = useState(false);
  const [nightlyAmount, setNightlyAmount] = useState<number | null>(null);

  const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');

  useEffect(() => {
    if (user?.lastExtraBonusDate === todayStr) {
      setBonusClaimedToday(true);
    }
    if (user?.lastBonusClaimedDate === todayStr) {
      setNightlyClmToday(true);
    }
  }, [user, todayStr]);

  const handleClaimExtraBonus = async () => {
    if (!user || !user.phone) {
      alert('অনুগ্রহ করে প্রথমে লগইন করুন!');
      return;
    }

    if (user?.lastExtraBonusDate === todayStr) {
      alert('আপনি আজকের অতিরিক্ত বোনাস ইতিমধ্যেই দাবি করেছেন! আগামীকাল আবার চেষ্টা করুন।');
      return;
    }

    setClaiming(true);

    try {
      const generatedBonus = Math.round((1.0 + Math.random() * 2.0) * 100) / 100;
      
      const userRef = doc(db, 'users', user.phone);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const currentBalance = userSnap.data().balance || 0;
        const newBalance = currentBalance + generatedBonus;

        await updateDoc(userRef, {
          balance: newBalance,
          lastExtraBonusDate: todayStr
        });

        onUpdateUser({
          ...user,
          balance: newBalance,
          lastExtraBonusDate: todayStr
        });

        setRandomBonusAmount(generatedBonus);
        setBonusClaimedToday(true);
        alert(`🎉 অভিনন্দন! আপনি সফলভাবে ${generatedBonus} ৳ অতিরিক্ত দৈনিক রিওয়ার্ড অর্জন করেছেন!`);
      }
    } catch (err: any) {
      console.error(err);
      alert('বোনাস নেয়ার সময় বৈষয়িক ত্রুটি ঘটেছে! আবার চেষ্টা করুন।');
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimNightlyPackageBonus = async () => {
    if (!user || !user.phone) {
      alert('অনুগ্রহ করে প্রথমে লগইন করুন!');
      return;
    }

    if (!user.hasActivePackage) {
      alert('আপনার কোনো সক্রিয় মেম্বারশিপ প্যাকেজ নেই! অনুগ্রহ করে হোম পেজ থেকে একটি প্যাকেজ বেছে নিন।');
      return;
    }

    setNightlyClaiming(true);
    try {
      const result = await claimNightlyBonus(user.phone, testOverride);
      
      // Update local state and local storage immediately
      const updatedUser = {
        ...user,
        balance: result.balance,
        lastBonusClaimedDate: result.lastBonusClaimedDate,
        lastBonusClaimedAt: result.lastBonusClaimedAt,
        dailyBonusRate: result.claimedBonusAmount
      };
      
      onUpdateUser(updatedUser);
      setNightlyClmToday(true);
      setNightlyAmount(result.claimedBonusAmount);
      alert(`🎉 অসাধারণ! আপনার সক্রিয় প্যাকেজ বোনাস ${result.claimedBonusAmount} ৳ আপনার মূল ব্যালেন্সে সফলভাবে যোগ করা হয়েছে।`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'বোনাস ক্লেম সফল হয়নি! দয়া করে আবার চেষ্টা করুন।');
    } finally {
      setNightlyClaiming(false);
    }
  };

  const bonusPoints = [
    { title: '১৫০ টাকার প্যাকেজ', subtitle: 'প্রতিদিন রাত ০৮:০০ টায় ১ টাকা আয়', reward: '১ ৳ / দিন' },
    { title: '২৫০ টাকার প্যাকেজ', subtitle: 'প্রতিদিন রাত ০৮:০০ টায় ২ টাকা আয়', reward: '২ ৳ / দিন' },
    { title: '৩০০ টাকার প্যাকেজ', subtitle: 'প্রতিদিন রাত ০৮:০০ টায় ৩ টাকা আয়', reward: '৩ ৳ / দিন' },
    { title: '৫০০ টাকার প্যাকেজ', subtitle: 'প্রতিদিন রাত ০৮:০০ টায় ৫ টাকা আয়', reward: '৫ ৳ / দিন' },
    { title: '৮৪০ টাকার প্যাকেজ', subtitle: 'প্রতিদিন রাত ০৮:০০ টায় ৮ টাকা আয়', reward: '৮ ৳ / দিন' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-wider">
            <Sparkles size={12} className="animate-pulse" /> বোনাস প্ল্যাটফর্ম
          </div>
          <h2 className="text-2xl font-black">আকর্ষণীয় অতিরিক্ত বোনাসসমূহ!</h2>
          <p className="text-xs text-orange-50 opacity-90 leading-relaxed font-semibold">
            প্রতিটি আমন্ত্রণ ও সক্রিয় প্যাকেজ থেকে নিশ্চিত আয় এবং প্রতিদিন অতিরিক্ত ফ্রী ক্যাশ বোনাস লুফে নেওয়ার সুবর্ণ সুযোগ পান!
          </p>
        </div>
        
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-10 -mb-10 blur-lg"></div>
      </div>

      {/* Interactive Daily Extra Gift Box */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm text-center space-y-4">
        <div className="inline-flex p-4 bg-orange-50 rounded-full text-orange-500 relative">
          <Gift size={32} className={bonusClaimedToday ? '' : 'animate-bounce'} />
          {!bonusClaimedToday && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-extrabold text-slate-800 text-lg">প্রতিদিনের গিফট বক্স</h3>
          <p className="text-xs text-slate-500 px-6">
            নিচের বোতামে স্পর্শ করে সম্পূর্ণ ফ্রীতে দৈনন্দিন অতিরিক্ত <span className="text-orange-500 font-bold">১ থেকে ৩ টাকা</span> পর্যন্ত বোনাস সংগ্রহ করুন!
          </p>
        </div>

        <div className="max-w-sm mx-auto p-2">
          {bonusClaimedToday ? (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold leading-normal">
              ✅ আপনি আজকের অতিরিক্ত রিওয়ার্ড সফলভাবে দাবি করেছেন! {randomBonusAmount && `(পেয়েছেন: ${randomBonusAmount} ৳)`} আগামীকাল পুনরায় চেষ্টা করুন।
            </div>
          ) : (
            <button
              onClick={handleClaimExtraBonus}
              disabled={claiming}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-100 active:scale-95 transition flex items-center justify-center gap-2"
            >
              {claiming ? 'যাচাই হচ্ছে...' : 'ফ্রি গিফট বোনাস নিন'}
            </button>
          )}
        </div>
      </div>

      {/* Nightly 8:00 PM Active Package Bonus Section */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Coins className="text-amber-500" size={22} /> প্যাকেজ বোনাস (রাত ০৮:০০ টায়)
          </h4>
          <span className="text-[10px] bg-indigo-55 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
            {user?.hasActivePackage ? 'সক্রিয় প্যাকেজ' : 'কোনো প্যাকেজ নেই'}
          </span>
        </div>

        {user?.hasActivePackage ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">আপনার প্যাকেজ</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{user.activePackageTitle}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">বাড়তি ডেইলি বোনাস</p>
                <p className="font-extrabold text-emerald-600 text-sm mt-0.5">
                  +{user.dailyBonusRate || (user.packagePrice === 150 ? 1 : user.packagePrice === 250 ? 2 : user.packagePrice === 300 ? 3 : user.packagePrice === 500 ? 5 : user.packagePrice === 840 ? 8 : 0)} ৳
                </p>
              </div>
            </div>



            {nightlyClmToday ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3.5 rounded-2xl text-xs font-bold leading-normal text-center">
                ✅ অভিনন্দন! আপনি আজকের রাত ০৮:০০ টার বাড়তি বোনাসটি সফলভাবে দাবি করেছেন। আগামীকাল আবার রাত ০৮:০০ টায় চেক করতে আসুন!
              </div>
            ) : (
              <button
                onClick={handleClaimNightlyPackageBonus}
                disabled={nightlyClaiming}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                {nightlyClaiming ? 'যাচাই হচ্ছে...' : 'রাত ০৮:০০ টার বোনাস ক্লেম করুন'}
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center py-6">
            <AlertCircle size={24} className="mx-auto text-indigo-500 mb-2 animate-pulse" />
            <p className="text-xs font-bold text-slate-700">কোনো সক্রিয় প্যাকেজ পাওয়া যায়নি!</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-normal">
              রাত ৮:০০ টার দৈনিক বিশেষ বোনাস দাবি করতে হলে হোম পেজ থেকে যেকোনো একটি প্যাকেজ চালু করতে হবে।
            </p>
          </div>
        )}
      </div>

      {/* Package Specific Bonus Rules (পড়ার সিস্টেম) */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <Trophy className="text-amber-500" size={20} /> প্যাকেজ ডেইলি আয় তালিকা:
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">প্রতিদিন রাত ০৮:০০ টায় সরাসরি আপনার একাউন্টে জমা হবে</p>
        </div>

        <div className="divide-y divide-slate-100/80">
          {bonusPoints.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between group">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-slate-700">{item.title}</h5>
                  <p className="text-[10px] text-slate-400 font-bold">{item.subtitle}</p>
                </div>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-600 font-black px-3 py-1.5 rounded-xl border border-emerald-100">
                {item.reward}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Program Guidelines */}
      <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-5 -mt-5 blur-xl"></div>
        
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-2">
            <Star className="text-amber-400 fill-amber-400" size={18} />
            <h4 className="font-bold">রেফারাল বোনাস পলিসি</h4>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-semibold">
            আপনার রেফার কোড দিয়ে অন্য কেউ অ্যাকাউন্ট খোলার সাথে সাথেই আপনি <span className="text-amber-400 font-bold">৫০ টাকা</span> নগদ পাবেন। তবে আপনার রেফারালদের থেকে কেউ কোনো প্যাকেজ না কিনলে উইথড্র করার সুবিধাজনক নিয়মে কিছু শর্ত আরোপিত হতে পারে।
          </p>

          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex gap-2.5 items-start text-xs">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>রেফার করার প্রথম দিন থেকেই ব্যালেন্সে বোনাস জমা।</span>
            </div>
            <div className="flex gap-2.5 items-start text-xs">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>নিরাপদ সিস্টেমের মাধ্যমে প্রিমিয়াম উইথড্র সুবিধা।</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
