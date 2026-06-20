/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, X, Gift } from 'lucide-react';
import Auth from './components/Auth';
import Header from './components/layout/Header';
import Nav from './components/layout/Nav';
import Home from './components/pages/Home';
import Deposit from './components/pages/Deposit';
import Claim from './components/pages/Claim';
import Refer from './components/pages/Refer';
import Account from './components/pages/Account';
import Bonus from './components/pages/Bonus';
import Admin from './components/pages/Admin';
import { getUserDataByPhone } from './firebase';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('nagor_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState('home');
  const [accountAction, setAccountAction] = useState<'none' | 'deposit' | 'withdraw' | 'deposit_history' | 'withdraw_history'>('none');
  const [showBalance, setShowBalance] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
  
  // Custom Alert and Popup State
  const [customAlert, setCustomAlert] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);

  useEffect(() => {
    // Override window.alert
    const originalAlert = window.alert;
    window.alert = (message: string) => {
      let type: 'success' | 'error' | 'info' = 'info';
      if (message.includes('🎉') || message.includes('success') || message.includes('সফল') || message.includes('অভিনন্দন')) {
        type = 'success';
      } else if (message.includes('ত্রুটি') || message.includes('❌') || message.includes('Error') || message.includes('ভুল') || message.includes('দুঃখিত') || message.includes('Failed') || message.includes('wrong') || message.includes('🚫')) {
        type = 'error';
      }
      setCustomAlert({ message, type });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeSplash(true);
    }, 2500); 
    
    const unmountTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3200); 

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  const handlePageSwitch = (newPage: string) => {
    setPage(newPage);
    if (newPage !== 'account') {
      setAccountAction('none');
    }
  };

  // Sync user profile with Firestore on load, on page transitions, or every 6 seconds
  useEffect(() => {
    if (!user || !user.phone) return;

    const syncProfile = () => {
      getUserDataByPhone(user.phone)
        .then((latestData) => {
          if (latestData) {
            setUser(latestData);
            localStorage.setItem('nagor_user', JSON.stringify(latestData));
          }
        })
        .catch((err) => {
          console.error("Error refreshing user profile:", err);
        });
    };

    // Run immediately
    syncProfile();

    // Set up a periodic check
    const interval = setInterval(syncProfile, 6000);
    return () => clearInterval(interval);
  }, [user?.phone, page]);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('nagor_user', JSON.stringify(userData));
    if (userData.isNewRegistration) {
      setTimeout(() => {
        setShowWelcomeBonus(true);
      }, 500); // Wait a half second inside the app
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nagor_user');
  };

  const toggleBalance = () => {
    setShowBalance(true);
    setTimeout(() => { setShowBalance(false); }, 4000);
  };

  if (location.pathname === '/admin') {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-slate-100 my-8">
          <Admin 
            currentUser={user} 
            onClose={() => navigate('/')} 
          />
        </div>
      </div>
    );
  }

  if (showSplash) {
    return (
      <div className={`w-full min-h-screen fixed inset-0 z-[100] flex items-center justify-center transition-all duration-1000 ease-in-out ${fadeSplash ? 'opacity-0 scale-110 pointer-events-none blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
        {/* Deep, rich animated background */}
        <div className="absolute inset-0 bg-[#0f172a] overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/20 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-12">
          {/* Logo with elegant float and glow */}
          <div className="relative flex justify-center items-center animate-[bounce_4s_infinite]">
            <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full scale-150"></div>
            <img 
              src="https://i.postimg.cc/X7kLXrdf/1000030658-removebg-preview.png" 
              alt="MSKE money Logo" 
              className="h-36 sm:h-44 w-auto object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] relative z-10 transform scale-100 transition-transform duration-1000 ease-out"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Elegant loading bar */}
          <div className="flex flex-col items-center gap-5 mt-4">
            <div className="w-48 sm:w-56 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-1/2 rounded-full animate-[spin_2s_linear_infinite]" style={{ animation: 'loadBar 2s ease-in-out infinite' }}></div>
              <style>{`
                @keyframes loadBar {
                  0% { transform: translateX(-150%); }
                  50% { transform: translateX(150%); }
                  100% { transform: translateX(-150%); }
                }
              `}</style>
            </div>
            <p className="text-slate-400 font-mono text-[10px] sm:text-xs tracking-[0.4em] uppercase font-semibold">
              <span className="animate-pulse">Loading Workspace</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth 
          onLogin={handleLogin} 
          onOpenAdmin={() => navigate('/admin')} 
        />
        {customAlert && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
            <div className={`bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl transform transition-all duration-300 scale-100 ${customAlert.type === 'error' ? 'shadow-rose-500/20' : customAlert.type === 'success' ? 'shadow-emerald-500/20' : 'shadow-indigo-500/20'}`}>
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${customAlert.type === 'error' ? 'bg-rose-100 text-rose-500' : customAlert.type === 'success' ? 'bg-emerald-100 text-emerald-500' : 'bg-indigo-100 text-indigo-500'}`}>
                  {customAlert.type === 'error' ? <AlertCircle size={32} /> : customAlert.type === 'success' ? <CheckCircle2 size={32} /> : <Info size={32} />}
                </div>
                <p className="text-slate-800 font-medium whitespace-pre-wrap">{customAlert.message}</p>
                <button 
                  onClick={() => setCustomAlert(null)}
                  className={`mt-4 w-full py-3 rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${customAlert.type === 'error' ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30' : customAlert.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'}`}
                >
                  OK / ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-24 relative">
      {/* Global Alerts inside main layout */}
      {customAlert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className={`bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl transform transition-all duration-300 scale-100 ${customAlert.type === 'error' ? 'shadow-rose-500/20' : customAlert.type === 'success' ? 'shadow-emerald-500/20' : 'shadow-indigo-500/20'}`}>
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${customAlert.type === 'error' ? 'bg-rose-100 text-rose-500' : customAlert.type === 'success' ? 'bg-emerald-100 text-emerald-500' : 'bg-indigo-100 text-indigo-500'}`}>
                {customAlert.type === 'error' ? <AlertCircle size={32} /> : customAlert.type === 'success' ? <CheckCircle2 size={32} /> : <Info size={32} />}
              </div>
              <p className="text-slate-800 font-medium whitespace-pre-wrap">{customAlert.message}</p>
              <button 
                onClick={() => setCustomAlert(null)}
                className={`mt-4 w-full py-3 rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${customAlert.type === 'error' ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30' : customAlert.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'}`}
              >
                OK / ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Bonus Popup */}
      {showWelcomeBonus && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl transform transition-all duration-500 scale-100 opacity-100 animate-[bounce_0.6s_ease-out]">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 border-4 border-white animate-[pulse_2s_infinite]">
                <Gift className="text-white w-12 h-12" />
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">Registration Gift</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">অভিনন্দন! 🎉</h3>
              <p className="text-slate-500 font-medium mb-6">
                সফলভাবে অ্যাকাউন্ট তৈরি করার জন্য আপনাকে <span className="font-bold text-slate-800">৫০ টাকা</span> ক্যাশ রিবোর্ড দেয়া হয়েছে।
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                <p className="text-slate-400 text-xs mb-1">বর্তমান ব্যালেন্স</p>
                <div className="text-3xl font-black text-emerald-500">৳ ৫০</div>
              </div>

              <button 
                onClick={() => setShowWelcomeBonus(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98]"
              >
                ধন্যবাদ
              </button>
            </div>
          </div>
        </div>
      )}

      <Header balance={user?.balance || 0} toggleBalance={toggleBalance} showBalance={showBalance} />
      <main className="p-5">
        {page === 'home' && (
          <Home 
            user={user} 
            onUpdateUser={(updated: any) => {
              setUser(updated);
              localStorage.setItem('nagor_user', JSON.stringify(updated));
            }} 
            onNavigateToDeposit={() => {
              setAccountAction('deposit');
              setPage('account');
            }}
          />
        )}
        {page === 'bonus' && (
          <Bonus 
            user={user} 
            onUpdateUser={(updated: any) => {
              setUser(updated);
              localStorage.setItem('nagor_user', JSON.stringify(updated));
            }} 
          />
        )}
        {page === 'claim' && (
          <Claim 
            user={user} 
            onUpdateUser={(updated: any) => {
              setUser(updated);
              localStorage.setItem('nagor_user', JSON.stringify(updated));
            }} 
          />
        )}
        {page === 'refer' && <Refer user={user} />}
        {page === 'account' && (
          <Account 
            user={user} 
            onLogout={handleLogout} 
            onUpdateUser={(updated: any) => {
              setUser(updated);
              localStorage.setItem('nagor_user', JSON.stringify(updated));
            }} 
            onOpenAdmin={() => navigate('/admin')}
            initialAction={accountAction}
          />
        )}
      </main>
      <Nav onSwitch={handlePageSwitch} activePage={page} />
    </div>
  );
}
