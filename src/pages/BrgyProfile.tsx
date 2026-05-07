import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import EditProfileModal from "../components/UserProfile/EditProfileModal";
import { useModal } from "../hooks/useModal";
import { useState } from "react";
import { apiFetch } from "../utils/api";
import { FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiEdit2 } from "react-icons/fi";

export default function BrgyProfile() {
  const { user } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const res = await apiFetch("change-password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm),
      });
      const data = await res.json();
      if (data.success) {
        setPwMsg({ type: "success", text: "Password changed successfully." });
        setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      } else {
        setPwMsg({ type: "error", text: data.message || "Failed to change password." });
      }
    } catch {
      setPwMsg({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setPwLoading(false);
    }
  };

  const fields = [
    { label: "Full Name", value: user?.full_name || user?.username, icon: <FiUser /> },
    { label: "Email", value: user?.email, icon: <FiMail /> },
    { label: "Contact Number", value: user?.contact_number, icon: <FiPhone /> },
    { label: "Barangay", value: user?.brgy_name, icon: <FiMapPin /> },
    { label: "City", value: user?.city, icon: <FiMapPin /> },
    { label: "Province", value: user?.province, icon: <FiMapPin /> },
  ];

  return (
    <>
      <PageMeta title="Profile | E-LigtasMo" description="Manage your barangay profile." />
      <div className="tactical-page">
        <div className="tactical-container">
          <div className="tactical-header">
            <h1 className="tactical-title">Profile & Settings</h1>
            <p className="tactical-subtitle">Your account information and security settings.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Profile Info */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ outline: "1px solid #e2e8f0" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Account Info</span>
                <button onClick={openModal} className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                  <FiEdit2 size={11} /> Edit
                </button>
              </div>
              <div className="p-6">
                {/* Avatar Row */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                    <span className="text-white text-xl font-bold">{(user?.brgy_name || user?.full_name || user?.username || "B").charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{user?.brgy_name || user?.full_name || user?.username || "Barangay User"}</h2>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-600 tracking-widest uppercase">Barangay Official</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                        <span className="text-xs">{f.icon}</span>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{f.label}</p>
                        <p className="text-sm font-semibold text-slate-900">{f.value || <span className="text-slate-300 italic text-xs">Not set</span>}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ outline: "1px solid #e2e8f0" }}>
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Change Password</span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    <FiLock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Account Security</p>
                    <p className="text-[10px] text-slate-400">Update your password to keep your account safe.</p>
                  </div>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {[
                    { label: "Current Password", field: "current_password" },
                    { label: "New Password", field: "new_password" },
                    { label: "Confirm New Password", field: "confirm_password" },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">{label}</label>
                      <input
                        type="password"
                        required
                        value={(pwForm as any)[field]}
                        onChange={(e) => setPwForm((prev) => ({ ...prev, [field]: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      />
                    </div>
                  ))}

                  {pwMsg && (
                    <div className={`p-3 rounded-xl text-[11px] font-bold ${pwMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                      {pwMsg.text}
                    </div>
                  )}

                  <button type="submit" disabled={pwLoading} className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 mt-2">
                    {pwLoading ? "Saving..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EditProfileModal isOpen={isOpen} onClose={closeModal} />
    </>
  );
}