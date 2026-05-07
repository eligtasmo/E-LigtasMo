import { useModal } from "../../hooks/useModal";
import { useAuth } from "../../context/AuthContext";
import EditProfileModal from "./EditProfileModal";

export default function BrgyInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();
  
  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-6 mb-6">
        <h4 className="text-sm font-bold text-slate-900 font-jetbrains uppercase tracking-widest">Personal Information</h4>
        <button onClick={openModal} className="tactical-button bg-slate-100 hover:bg-slate-200 text-slate-700">Update_Data</button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
          <p className="text-sm font-bold text-slate-900">{user?.full_name || user?.username || "-"}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
          <p className="text-sm font-bold text-slate-900">{user?.email || "-"}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Number</p>
          <p className="text-sm font-bold text-slate-900">{user?.contact_number || "-"}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Barangay</p>
          <p className="text-sm font-bold text-slate-900">{user?.brgy_name || "-"}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">City</p>
          <p className="text-sm font-bold text-slate-900">{user?.city || "-"}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Province</p>
          <p className="text-sm font-bold text-slate-900">{user?.province || "-"}</p>
        </div>
      </div>

      <EditProfileModal isOpen={isOpen} onClose={closeModal} />
    </div>
  );
}
