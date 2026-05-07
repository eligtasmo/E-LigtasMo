import { useModal } from "../../hooks/useModal";
import { useAuth } from "../../context/AuthContext";
import EditProfileModal from "./EditProfileModal";

export default function BrgyMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();
  return (
    <>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between w-full">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="w-16 h-16 overflow-hidden rounded-xl bg-blue-600 shadow-lg flex items-center justify-center">
             <span className="text-white text-xl font-bold font-jetbrains">
               {(user?.brgy_name || user?.username || "Brgy").charAt(0).toUpperCase()}
             </span>
          </div>
          <div className="order-3 xl:order-2">
            <h4 className="mb-1 text-lg font-bold text-slate-900 xl:text-left font-jetbrains uppercase tracking-tight">
              {user?.brgy_name || user?.full_name || user?.username || "Barangay User"}
            </h4>
            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-600 tracking-widest uppercase">
                Barangay Official
              </span>
              <div className="hidden h-3.5 w-px bg-slate-200 xl:block"></div>
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                {user?.city && user?.province ? `${user.city}, ${user.province}` : "Region: Santa Cruz"}
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
      <EditProfileModal isOpen={isOpen} onClose={closeModal} />
    </>
  );
}
