import { useModal } from "../../hooks/useModal";
import { CustomModal, CustomButton } from "../common";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useAuth } from "../../context/AuthContext";
import { UserCircleIcon } from "../../icons";

export default function UserMetaCard() {
  const { user } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    closeModal();
  };
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-1 ring-gray-200 bg-gray-100 flex items-center justify-center">
              {String(user?.role || "").toLowerCase() === "resident" ? (
                <UserCircleIcon className="w-10 h-10 text-gray-600" />
              ) : (
                <img src="/images/user/default-avatar.png" alt="user" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{user?.full_name || "User"}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {user?.role === 'admin' ? 'Administrator' : user?.role === 'brgy' ? 'Barangay Official' : 'Resident'}
                </span>
                <span className="text-xs text-gray-500">
                  {user?.city && user?.province ? `${user.city}, ${user.province}` : "Location not set"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
        </div>
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
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>First Name</Label>
                    <Input type="text" value="Migo" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Last Name</Label>
                    <Input type="text" value="Test" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email Address</Label>
                    <Input type="text" value="migo@gmail.com" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input type="text" value="+09 363 398 46" />
                  </div>

                  <div className="col-span-2">
                    <Label>Bio</Label>
                    <Input type="text" value="Team Manager" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <CustomButton size="sm" variant="outline" onClick={closeModal}>
                Close
              </CustomButton>
              <CustomButton size="sm" onClick={handleSave}>
                Save Changes
              </CustomButton>
            </div>
          </form>
        </div>
      </CustomModal>
    </>
  );
}
