import React, { useState } from 'react';
import { registerUser, loginUser } from '../firebase';
import { Phone, Lock, Building2, Users } from 'lucide-react';

export default function Auth({ 
  onLogin, 
  onOpenAdmin 
}: { 
  onLogin: (user: any) => void; 
  onOpenAdmin: () => void; 
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [loading, setLoading] = useState(false);

  const banglaToEnglishDigits = (str: string) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[০-৯]/g, (d) => String(banglaDigits.indexOf(d)));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (loading) return;

    // Normalize phone number (convert Bangla digits and trim whitespace)
    const normalizedPhone = banglaToEnglishDigits(phone.trim()).replace(/\s+/g, '');
    const trimmedPassword = password.trim();

    if (!normalizedPhone || !trimmedPassword) {
      alert('দয়া করে নাম্বার এবং পাসওয়ার্ড দিন!');
      return;
    }

    if (!isLogin && trimmedPassword !== confirmPassword.trim()) {
      alert('পাসওয়ার্ড মিলছে না!');
      return;
    }
    
    setLoading(true);
    try {
      let userData;
      if (isLogin) {
        userData = await loginUser(normalizedPhone, trimmedPassword);
      } else {
        // Automatically give 50 TK bonus upon registration
        userData = await registerUser(normalizedPhone, trimmedPassword, referredBy);
      }
      onLogin(userData);
    } catch (error: any) {
      console.error(error);
      alert('ত্রুটি: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shadow-indigo-200 animate-bounce">
            <Building2 />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          {isLogin ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন'}
        </h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          {isLogin ? 'আপনার তথ্য দিয়ে লগইন করুন' : 'বিশ্বস্ততার সাথে শুরু হোক আপনার যাত্রা'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              disabled={loading}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium disabled:opacity-50" 
              placeholder="মোবাইল নাম্বার" 
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              disabled={loading}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium disabled:opacity-50" 
              placeholder="পাসওয়ার্ড" 
            />
          </div>
          {!isLogin && (
            <>
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium disabled:opacity-50" 
                  placeholder="কনফার্ম পাসওয়ার্ড" 
                />
              </div>
              <div className="relative">
                <Users className="absolute left-4 top-4 text-slate-400" size={20} />
                <input 
                  type="text" 
                  value={referredBy} 
                  onChange={(e) => setReferredBy(e.target.value)} 
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium disabled:opacity-50 font-mono" 
                  placeholder="আমন্ত্রণ কোড (অপশনাল)" 
                />
              </div>
            </>
          )}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                অপেক্ষা করুন...
              </span>
            ) : (
              isLogin ? 'লগইন' : 'রেজিস্ট্রেশন করুন'
            )}
          </button>
        </form>
        
        <p 
          className="text-center text-sm text-slate-600 mt-6 cursor-pointer font-medium hover:text-indigo-600 transition" 
          onClick={() => {
            if (loading) return;
            setIsLogin(!isLogin);
            setConfirmPassword('');
          }}
        >
          {isLogin ? 'নতুন অ্যাকাউন্ট তৈরি করবেন? সাইন আপ' : 'ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন'}
        </p>

        {isLogin && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onOpenAdmin}
              className="text-[11px] font-bold text-slate-300 hover:text-slate-400 cursor-pointer transition-colors bg-transparent border-none outline-none select-none hover:underline"
            >
              Risk Free
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
