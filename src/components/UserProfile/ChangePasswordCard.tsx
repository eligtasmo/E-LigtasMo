import { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { logActivity, LogActions, ResourceTypes } from "../../utils/logger";
import { useAuth } from "../../context/AuthContext";

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
      const response = await fetch("http://localhost/eligtasmo/api/change-password.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Security Settings
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Change your password to keep your account secure.
            </p>
          </div>

          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 1.5C6.51875 1.5 4.5 3.51875 4.5 6V7.5H3.75C3.33594 7.5 3 7.83594 3 8.25V15.75C3 16.1641 3.33594 16.5 3.75 16.5H14.25C14.6641 16.5 15 16.1641 15 15.75V8.25C15 7.83594 14.6641 7.5 14.25 7.5H13.5V6C13.5 3.51875 11.4813 1.5 9 1.5ZM9 2.625C10.8625 2.625 12.375 4.1375 12.375 6V7.5H5.625V6C5.625 4.1375 7.1375 2.625 9 2.625ZM9 9.75C9.41406 9.75 9.75 10.0859 9.75 10.5V12.75C9.75 13.1641 9.41406 13.5 9 13.5C8.58594 13.5 8.25 13.1641 8.25 12.75V10.5C8.25 10.0859 8.58594 9.75 9 9.75Z"
                fill=""
              />
            </svg>
            Change Password
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[500px] m-4">
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
              <Button size="sm" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
} 