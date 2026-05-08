import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import EditProfileModal from "../components/UserProfile/EditProfileModal";
import { useModal } from "../hooks/useModal";
import { useState } from "react";
import { apiFetch } from "../utils/api";
import { FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiEdit2, FiShield, FiX } from "react-icons/fi";

export default function UserProfiles() {
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

  const roleLabel = user?.role === "admin" ? "HQ Administrator" : user?.role === "brgy" ? "Barangay Official" : "Resident";
  const roleColor = user?.role === "admin" ? "bg-rose-50 text-rose-600" : user?.role === "brgy" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600";

  const fields = [
    { label: "Full Name", value: user?.full_name, icon: <FiUser /> },
    { label: "Email", value: user?.email, icon: <FiMail /> },
    { label: "Contact Number", value: user?.contact_number, icon: <FiPhone /> },
    { label: "Barangay", value: user?.brgy_name, icon: <FiMapPin /> },
    { label: "City", value: user?.city, icon: <FiMapPin /> },
    { label: "Province", value: user?.province, icon: <FiMapPin /> },
  ];

  return (
    <div className="tactical-page">
      <PageMeta title="Profile | E-LigtasMo" description="Manage your user profile and account settings." />
      
      {/* Header */}
      <div className="tactical-header">
        <div>
          <h1 className="tactical-title">Profile Settings</h1>
          <p className="tactical-subtitle">Your account information and security parameters.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Info */}
        <div className="tactical-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-700">Account Information</h3>
            <button onClick={openModal} className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1">
              <FiEdit2 size={12} /> Edit Profile
            </button>
          </div>
          <div className="p-8">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-50">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg shrink-0">
                <span className="text-white text-2xl font-bold">{(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.full_name || user?.username || "User"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${roleColor}`}>{roleLabel}</span>
                  <span className="text-xs text-gray-400 font-medium">{user?.username}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {fields.map((f, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-bold text-gray-400">{f.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">{f.icon}</span>
                    <p className="text-sm font-semibold text-gray-900">{f.value || <span className="text-gray-300 italic">Not set</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="tactical-card">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-700">Security & Credentials</h3>
          </div>
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <FiLock size={20} />
              </div>
              <div>
                <p className="text-md font-bold text-gray-900">Update Password</p>
                <p className="text-xs text-gray-400">Keep your mission access secure.</p>
              </div>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              {[
                { label: "Current Password", field: "current_password" },
                { label: "New Password", field: "new_password" },
                { label: "Confirm New Password", field: "confirm_password" },
              ].map(({ label, field }) => (
                <div key={field} className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">{label}</label>
                  <input
                    type="password"
                    required
                    value={(pwForm as any)[field]}
                    onChange={(e) => setPwForm((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="tactical-input w-full h-11 bg-white border-gray-200"
                  />
                </div>
              ))}

              {pwMsg && (
                <div className={`p-4 rounded-xl text-xs font-bold ${pwMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                  {pwMsg.text}
                </div>
              )}

              <button type="submit" disabled={pwLoading} className="tactical-btn-primary w-full h-12 mt-4">
                {pwLoading ? "Saving..." : "Update Credentials"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <EditProfileModal isOpen={isOpen} onClose={closeModal} />
    </div>
  );
}
