import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { CustomButton } from "../common";
import { useAuth } from "../../context/AuthContext";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    <div className="flex flex-col">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-brand-600 transition-colors hover:text-brand-700"
        >
          <ChevronLeftIcon className="size-4 mr-1" />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          Sign In
        </h1>
        <p className="text-sm font-medium text-gray-500">
          Access the tactical dashboard with your credentials.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <Label className="text-gray-900 font-bold uppercase tracking-wider text-[10px]">
              Username
            </Label>
            <Input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-gray-900 font-bold uppercase tracking-wider text-[10px] mb-0">
                Password
              </Label>
              <Link
                to="/auth/forgot-password"
                className="text-[10px] font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeIcon className="size-5" />
                ) : (
                  <EyeCloseIcon className="size-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <Checkbox checked={isChecked} onChange={setIsChecked} />
            <span className="block font-bold text-gray-700 text-[11px] uppercase tracking-wide">
              Keep me logged in
            </span>
          </div>

          <div className="pt-2">
            <CustomButton 
              className="w-full py-4 rounded-2xl shadow-premium-md hover:shadow-premium-lg transition-all" 
              variant="primary"
              size="lg" 
              type="submit" 
              disabled={loading}
            >
              {loading ? "AUTHENTICATING..." : "SIGN IN TO DASHBOARD"}
            </CustomButton>
          </div>
        </div>
      </form>
    </div>
  );
}
