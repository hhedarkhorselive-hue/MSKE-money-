import { Wallet } from 'lucide-react';

interface HeaderProps {
  balance: number;
  toggleBalance: () => void;
  showBalance: boolean;
}

export default function Header({ balance, toggleBalance, showBalance }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <img 
          src="https://i.postimg.cc/X7kLXrdf/1000030658-removebg-preview.png" 
          alt="MSKE money Logo" 
          className="h-11 w-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      <button onClick={toggleBalance} className="bg-slate-50 border border-slate-200 pl-3 pr-1 py-1 rounded-full flex items-center gap-2 group active:scale-95 transition whitespace-nowrap">
        <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{showBalance ? balance.toFixed(2) + ' ৳' : 'ব্যালেন্স দেখুন'}</span>
        <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-indigo-600">
          <Wallet size={16} />
        </div>
      </button>
    </header>
  );
}
