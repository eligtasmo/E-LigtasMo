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
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between w-full">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="w-16 h-16 overflow-hidden rounded-xl bg-blue-600 shadow-lg flex items-center justify-center">
             <span className="text-white text-xl font-bold font-jetbrains">
               {(user?.full_name || user?.username || "User").charAt(0).toUpperCase()}
             </span>
          </div>
          <div className="order-3 xl:order-2">
            <h4 className="mb-1 text-lg font-bold text-slate-900 xl:text-left font-jetbrains uppercase tracking-tight">
              {user?.full_name || user?.username || "Operator"}
            </h4>
            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-600 tracking-widest uppercase">
                {user?.role === 'admin' ? 'HQ Administrator' : user?.role === 'brgy' ? 'Barangay Official' : 'Resident'}
              </span>
              <div className="hidden h-3.5 w-px bg-slate-200 xl:block"></div>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                {user?.city && user?.province ? `${user.city}, ${user.province}` : "Location not set"}
              </span>
            </div>
          </div>
          <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
            <button
              onClick={openModal}
              className="tactical-button bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Configure_ID
            </button>
          </div>
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
