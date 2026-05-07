import { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { CustomModal, CustomButton } from "../common";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { logActivity, LogActions, ResourceTypes } from "../../utils/logger";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

export default function ChangePasswordCard() {
  const { user } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("change-password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setFormData({
          current_password: "",
          new_password: "",
          confirm_password: ""
        });
        
        // Log password change
        logActivity(
          LogActions.PASSWORD_CHANGE,
          `Password changed successfully for user: ${user?.username}`,
          ResourceTypes.USER,
          user?.username
        );
        
        setTimeout(() => {
          closeModal();
          setSuccess("");
        }, 2000);
      } else {
        setError(data.message);
        
        // Log failed password change
        logActivity(
          LogActions.PASSWORD_CHANGE,
          `Failed to change password for user: ${user?.username}`,
          ResourceTypes.USER,
          user?.username,
          'error',
          data.message
        );
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      current_password: "",
      new_password: "",
      confirm_password: ""
    });
    setError("");
    setSuccess("");
    closeModal();
  };

  return (
    <>
      <div className="w-full">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account Security</h4>
            <p className="text-sm font-bold text-slate-900">Change your password to keep your account secure.</p>
          </div>

          <button onClick={openModal} className="tactical-button bg-slate-100 hover:bg-slate-200 text-slate-700">Update_Auth</button>
        </div>
      </div>

      <CustomModal isOpen={isOpen} onClose={handleClose} className="max-w-[500px] m-4">
        <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Change Password
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Enter your current password and choose a new one.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          <form className="flex flex-col">
            <div className="px-2 pb-3">
              <div className="space-y-5">
                <div>
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={formData.current_password}
                    onChange={(e) => handleInputChange("current_password", e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={formData.new_password}
                    onChange={(e) => handleInputChange("new_password", e.target.value)}
                    placeholder="Enter your new password"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div>
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                    placeholder="Confirm your new password"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <CustomButton size="sm" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </CustomButton>
              <CustomButton size="sm" onClick={handleSave} disabled={loading}>
                {loading ? "Changing..." : "Change Password"}
              </CustomButton>
            </div>
          </form>
        </div>
      </CustomModal>
    </>
  );
}