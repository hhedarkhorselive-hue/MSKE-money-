import { Home, PlusCircle, Gift, Users, User, Sparkles } from 'lucide-react';

interface NavProps {
  onSwitch: (page: string) => void;
  activePage: string;
}

export default function Nav({ onSwitch, activePage }: NavProps) {
  const navItems = [
    { id: 'home', icon: Home, label: 'হোম' },
    { id: 'bonus', icon: Sparkles, label: 'বোনাস' },
    { id: 'claim', icon: Gift, label: 'ক্লেম', isSpecial: true },
    { id: 'refer', icon: Users, label: 'রেফার' },
    { id: 'account', icon: User, label: 'প্রোফাইল' },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto bg-white/90 backdrop-blur-md border border-white/50 flex justify-around items-center py-3 px-2 rounded-[2rem] shadow-2xl z-40">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onSwitch(item.id)}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activePage === item.id ? 'active-nav text-indigo-600' : 'text-slate-400'}`}
        >
          {item.isSpecial ? (
            <div className="bg-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white -mt-8 shadow-lg shadow-indigo-200 border-4 border-white">
              <item.icon size={20} />
            </div>
          ) : (
            <item.icon size={20} />
          )}
          <span className="text-[10px] font-bold">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
