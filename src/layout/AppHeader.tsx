import { useState } from "react";
import { Link } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { 
  MenuIcon, 
  SearchIcon, 
  BellIcon, 
  UserIcon, 
  LogoutIcon, 
  SettingsIcon,
  ChevronDownIcon
} from "../components/TacticalIcons";

const AppHeader: React.FC = () => {
  const { toggleMobileSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-brand-100 flex items-center justify-between px-6 sticky top-0 z-[1000] transition-all duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 hover:bg-brand-50 rounded-xl text-gray-500 transition-colors"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/images/final logo.png" alt="E-LigtasMo" className="h-8 w-auto" />
        </Link>
      </div>

      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search tactical data..." 
            className="w-full bg-brand-50/50 border border-transparent focus:border-brand-100 focus:bg-white rounded-2xl py-2 pl-11 pr-4 text-sm font-medium transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-brand-50 rounded-xl text-gray-500 relative group transition-colors">
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-500 border-2 border-white rounded-full" />
          </button>
        </div>

        <div className="h-8 w-px bg-brand-100 mx-1 hidden sm:block" />

        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-1.5 hover:bg-brand-50 rounded-2xl transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-premium-sm overflow-hidden border-2 border-brand-100 group-hover:border-brand-200 transition-all">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-bold text-gray-950 leading-tight truncate max-w-[100px]">{user?.name || "Command Officer"}</p>
              <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">{user?.role || "Unit"}</p>
            </div>
            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isProfileOpen ? "rotate-180" : ""}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-brand-100 rounded-2xl shadow-premium-xl py-2 z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-brand-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Session Active</p>
                <p className="text-sm font-bold text-gray-900 truncate">{user?.email || "officer@eligtasmo.gov"}</p>
              </div>
              <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <UserIcon className="w-4 h-4" /> Account Profile
              </Link>
              <Link to="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                <SettingsIcon className="w-4 h-4" /> Tactical Settings
              </Link>
              <div className="h-px bg-brand-50 my-1" />
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogoutIcon className="w-4 h-4" /> End Session
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
