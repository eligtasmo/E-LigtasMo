import { useModal } from "../../hooks/useModal";
import { CustomModal, CustomButton } from "../common";
import Input from "../form/input/InputField";
import Label from "../form/Label";

export default function UserAddressCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    closeModal();
  };
  return (
    <>
      <div className="w-full">
        <div className="flex items-start justify-between gap-6 mb-6">
          <h4 className="text-sm font-bold text-slate-900 font-jetbrains uppercase tracking-widest">Address Details</h4>
          <button onClick={openModal} className="tactical-button bg-slate-100 hover:bg-slate-200 text-slate-700">Update_Data</button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Country</p>
            <p className="text-sm font-bold text-slate-900">Philippines</p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Region</p>
            <p className="text-sm font-bold text-slate-900">N/A</p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Postal Code</p>
            <p className="text-sm font-bold text-slate-900">N/A</p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Geographic Coordinates</p>
            <p className="text-sm font-bold text-slate-900 font-mono text-blue-600">UNSET</p>
          </div>
        </div>
      </div>
      <CustomModal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Address
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="px-2 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div>
                  <Label>Country</Label>
                  <Input type="text" value="N/A" />
                </div>

                <div>
                  <Label>City/State</Label>
                  <Input type="text" value="N/A" />
                </div>

                <div>
                  <Label>Postal Code</Label>
                  <Input type="text" value="N/A" />
                </div>

                <div>
                  <Label>TAX ID</Label>
                  <Input type="text" value="N/A" />
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
