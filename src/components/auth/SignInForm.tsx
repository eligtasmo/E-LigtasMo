import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Ensure this path is correct
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { CustomButton } from "../common";
import { useAuth } from "../../context/AuthContext"; // <-- Make sure this path is correct

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth(); // Call login from context
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that username and password are not empty
    if (!username || !password) {
      alert("Username and password are required!");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-8 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-gray-500 transition-all hover:text-brand-500 group"
        >
          <ChevronLeftIcon className="size-4 mr-1 transition-transform group-hover:-translate-x-1" />
          BACK TO HOME
        </Link>
      </div>
      
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto py-12">
        <div className="bg-[#0C0B0A]/80 backdrop-blur-xl border border-white/5 p-8 sm:p-10 rounded-2xl shadow-2xl">
          <div className="mb-8 sm:mb-10">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">
              TACTICAL SIGN IN
            </h1>
            <p className="text-sm text-gray-500 font-medium border-l-2 border-brand-500 pl-3">
              IDENTIFICATION REQUIRED. ENTER CREDENTIALS TO ACCESS SECTOR.
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  USERNAME <span className="text-brand-500">*</span>
                </label>
                <Input
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-500/50 focus:ring-brand-500/10 h-12"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  PASSWORD <span className="text-brand-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-500/50 focus:ring-brand-500/10 h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeIcon className="size-5" />
                    ) : (
                      <EyeCloseIcon className="size-5" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isChecked} onChange={setIsChecked} />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    REMAIN AUTHENTICATED
                  </span>
                </div>
                <Link
                  to="/auth/forgot-password"
                  className="text-[11px] font-bold text-brand-500 hover:text-brand-400 uppercase tracking-wider transition-colors"
                >
                  RECOVERY?
                </Link>
              </div>
              
              <div className="pt-2">
                <CustomButton 
                  className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(245,178,53,0.2)]" 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? "AUTHENTICATING..." : "ESTABLISH CONNECTION"}
                </CustomButton>
              </div>
            </div>
          </form>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">NO CLEARANCE?</span>
                <Link to="/brgy-signin" className="text-[10px] font-black text-white hover:text-brand-500 uppercase tracking-widest transition-colors">
                  REGISTER BARANGAY
                </Link>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">RESIDENT ACCESS?</span>
                <Link to="/register" className="text-[10px] font-black text-white hover:text-brand-500 uppercase tracking-widest transition-colors">
                  CREATE ACCOUNT
                </Link>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
