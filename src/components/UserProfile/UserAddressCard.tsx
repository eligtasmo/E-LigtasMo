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
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h4 className="text-base font-semibold text-gray-900">Address</h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Country
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  N/A
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  City/State
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  N/A
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Postal Code
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  N/A
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  TAX ID
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  N/A
                </p>
              </div>
            </div>
          </div>

          <button onClick={openModal} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Edit</button>
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
