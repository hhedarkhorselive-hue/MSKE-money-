import { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { buyUserPackage } from '../../firebase';

export default function Home({ 
  user, 
  onUpdateUser,
  onNavigateToDeposit
}: { 
  user: any; 
  onUpdateUser: (updated: any) => void;
  onNavigateToDeposit: () => void;
}) {
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const bannerImages = [
    'https://i.postimg.cc/d0FJvC5v/file-0000000098a47206a10c341f27045a51.png',
    'https://i.postimg.cc/RhfCCrYW/file-000000000c187206935576bb3bf8764e.png',
    'https://i.postimg.cc/WbDN7TDT/file-00000000a2bc71faa50d7adae7d92d88.png'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const packages = [
    { id: 3, title: 'সবুজ দ্বীপ প্যাকেজ', price: 150, daily: 20, duration: 365, tier: 'Basic', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
    { id: 4, title: 'রূপালী নদী প্যাকেজ', price: 250, daily: 25, duration: 365, tier: 'Standard', img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80' },
    { id: 5, title: 'সোনার হরিণ প্যাকেজ', price: 300, daily: 30, duration: 365, tier: 'Classic', img: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=600&q=80' },
    { id: 1, title: 'সাপের মণি শিব প্যাকেজ', price: 500, daily: 40, duration: 365, tier: 'Starter', img: 'https://i.postimg.cc/WbsmDYtg/file-0000000058387207abcc303bd37095ad.png' },
    { id: 2, title: 'নীল সমুদ্র প্যাকেজ', price: 840, daily: 60, duration: 365, tier: 'Pro', img: 'https://i.postimg.cc/GhzFvPyb/file-0000000000f47206bf7ff53e391a87e1.png' },
  ];

  const handleBuyPackage = async (pkg: typeof packages[0]) => {
    if (!user || !user.phone) {
      alert('অনুগ্রহ করে প্রথমে লগইন করুন।');
      return;
    }
    if (buyingId !== null) return;

    if ((user.balance || 0) < pkg.price) {
      alert(`আপনার ডিপোজিট বা মূল ব্যালেন্স পর্যাপ্ত নেই! প্যাকেজের দাম ${pkg.price} ৳, আপনার মূল ব্যালেন্স ${(user.balance || 0).toFixed(2)} ৳। (রেফার বোনাস দিয়ে প্যাকেজ কেনা যায় না, ডিপোজিট করে প্যাকেজ কিনলে রেফার বোনাস মূল ব্যালেন্সে যোগ হবে)। সরাসরি ডিপোজিট পেজে নিয়ে যাওয়া হচ্ছে...`);
      onNavigateToDeposit();
      return;
    }

    setBuyingId(pkg.id);
    try {
      const updatedInfo = await buyUserPackage(user.phone, pkg.price, pkg.title);
      const newUserData = { ...user, ...updatedInfo };
      onUpdateUser(newUserData);
      alert(`🎉 অভিনন্দন! আপনি সফলভাবে "${pkg.title}" অ্যাক্টিভেট করেছেন।`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'প্যাকেজ কিনতে কোনো ত্রুটি হয়েছে!');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {/* Automatic Sliding Banner Showcase */}
        <div className="relative w-full aspect-[2.1/1] rounded-[2rem] overflow-hidden shadow-lg bg-indigo-50 border border-slate-100">
          <div className="w-full h-full relative">
            {bannerImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Banner ${idx + 1}`}
                className={`absolute inset-0 w-full h-full object-fill transition-opacity duration-700 ease-in-out ${
                  idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
          
          {/* Slider Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {bannerImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'bg-white w-4' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-emerald-100 p-4 rounded-[1.5rem] flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">১০০% বিশ্বস্ত প্ল্যাটফর্ম</h4>
            <p className="text-[11px] text-slate-500 leading-tight">আমরা কোনো অবাস্তব টাকার লোভ দিচ্ছি না, এটাই আমাদের সততা।</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
          বিনিয়োগ প্যাকেজসমূহ
        </h2>
        
        <div className="grid grid-cols-1 gap-5">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-2 shadow-sm animate-fade-in pb-4">
              <div
                className="h-40 rounded-[2rem] bg-cover bg-center relative overflow-hidden"
                style={{ backgroundImage: `url('${pkg.img}')` }}
              >
                <div className="absolute inset-0 bg-black/30"></div>
                <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/30">
                  {pkg.tier}
                </span>
              </div>
              <div className="p-4 pb-0">
                <h3 className="font-bold text-slate-800 text-lg">{pkg.title}</h3>
                <div className="flex justify-between mt-3 mb-4 gap-2">
                  <div className="text-center bg-slate-50 flex-1 py-2 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">দাম</p>
                    <p className="font-bold text-indigo-600 text-[14px]">{pkg.price} ৳</p>
                  </div>
                  <div className="text-center bg-slate-50 flex-1 py-2 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">ডেইলি আয়</p>
                    <p className="font-bold text-emerald-600 text-[14px]">{pkg.daily} ৳</p>
                  </div>
                  <div className="text-center bg-slate-50 flex-1 py-2 rounded-2xl">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">মেয়াদ</p>
                    <p className="font-bold text-amber-600 text-[14px]">{pkg.duration} দিন</p>
                   </div>
                </div>
                <button 
                  onClick={() => handleBuyPackage(pkg)} 
                  disabled={buyingId !== null}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl active:bg-slate-800 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {buyingId === pkg.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> অপেক্ষা করুন...
                    </>
                  ) : (
                    'প্যাকেজটি কিনুন'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
