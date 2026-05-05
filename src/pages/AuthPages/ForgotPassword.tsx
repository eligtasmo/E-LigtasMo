import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import { useState } from "react";

export default function ForgotPassword() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    // Simulate API call (replace with real backend call)
    setTimeout(() => {
      setLoading(false);
      if (input.match(/@/) || input.match(/^09\d{9}$/)) {
        setSuccess("If an account with that email or phone exists, a recovery link/code has been sent.");
      } else {
        setError("Please enter a valid email or phone number.");
      }
    }, 1200);
  };

  return (
    <>
      <PageMeta
        title="Forgot Password | Eligtasmo"
        description="Reset your barangay account password via email or phone."
      />
      <div className="w-full max-w-lg mx-auto">
        <div className="w-full mt-2">
          <form
            className="w-full max-w-md mx-auto bg-white flex flex-col space-y-6"
            onSubmit={handleSubmit}
            autoComplete="off"
          >
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Forgot Password
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your barangay account email or phone number to recover your password.
              </p>
            </div>
            <div>
              <label className="block mb-2 font-medium text-gray-700">Email or Phone</label>
              <input
                type="text"
                name="recovery"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="e.g. brgy@email.com or 09171234567"
                className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800"
                required
              />
            </div>
            {error && <div className="text-error-500 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-600 transition disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Recovery Link/Code"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            <a href="/signin" className="text-blue-600 hover:underline">Go back to Sign In</a>
          </div>
        </div>
      </div>
    </>
  );
} 