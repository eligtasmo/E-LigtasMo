import { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { CustomModal, CustomButton } from "../common";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useAuth } from "../../context/AuthContext";
import { logActivity, LogActions, ResourceTypes } from "../../utils/logger";
import { apiFetch } from "../../utils/api";

export default function UserInfoCard() {
  const { user, updateUser } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    brgy_name: "",
    city: "",
    province: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        contact_number: user.contact_number || "",
        brgy_name: user.brgy_name || "",
        city: user.city || "",
        province: user.province || ""
      });
    }
  }, [user]);

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
      const response = await apiFetch("update-user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        updateUser(formData);
        
        // Log profile update
        logActivity(
          LogActions.USER_UPDATE,
          `User profile updated: ${formData.full_name}`,
          ResourceTypes.USER,
          user?.username
        );
        
        setTimeout(() => {
          closeModal();
          setSuccess("");
        }, 2000);
      } else {
        setError(data.message);
        
        // Log failed profile update
        logActivity(
          LogActions.USER_UPDATE,
          `Failed to update user profile: ${formData.full_name}`,
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
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h4 className="text-base font-semibold text-gray-900">Personal Information</h4>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Full Name
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.full_name || "Not set"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Email Address
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.email || "Not set"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Contact Number
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.contact_number || "Not set"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Barangay
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.brgy_name || "Not set"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  City
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.city || "Not set"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Province
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.province || "Not set"}
                </p>
              </div>
            </div>
        </div>

        <button onClick={openModal} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Edit</button>
      </div>

      <CustomModal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
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
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2">
                    <Label>Full Name</Label>
                    <Input 
                      type="text" 
                      value={formData.full_name}
                      onChange={(e) => handleInputChange("full_name", e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Email Address</Label>
                    <Input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Contact Number</Label>
                    <Input 
                      type="text" 
                      value={formData.contact_number}
                      onChange={(e) => handleInputChange("contact_number", e.target.value)}
                      placeholder="Enter your contact number"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Barangay</Label>
                    <Input 
                      type="text" 
                      value={formData.brgy_name}
                      onChange={(e) => handleInputChange("brgy_name", e.target.value)}
                      placeholder="Enter your barangay"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>City</Label>
                    <Input 
                      type="text" 
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="Enter your city"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Province</Label>
                    <Input 
                      type="text" 
                      value={formData.province}
                      onChange={(e) => handleInputChange("province", e.target.value)}
                      placeholder="Enter your province"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <CustomButton size="sm" variant="outline" onClick={closeModal} disabled={loading}>
                Cancel
              </CustomButton>
              <CustomButton size="sm" onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </CustomButton>
            </div>
          </form>
        </div>
      </CustomModal>
    </div>
  );
}
