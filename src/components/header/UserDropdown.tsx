import { useState } from "react";
import { CustomDropdownItem, CustomDropdown, CustomBadge } from "../common";
import { useAuth } from "../../context/AuthContext";
import { UserCircleIcon } from "../../icons";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const role = user?.role || "guest";

  const renderRoleBadge = (r: string) => {
    if (r === "admin") return <CustomBadge size="sm" variant="light" color="primary">Admin</CustomBadge>;
    if (r === "brgy") return <CustomBadge size="sm" variant="light" color="success">Barangay</CustomBadge>;
    if (r === "resident") return <CustomBadge size="sm" variant="light" color="info">Resident</CustomBadge>;
    return <CustomBadge size="sm" variant="light" color="dark">{r}</CustomBadge>;
  };

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const profilePath = user?.role === 'brgy' ? '/brgy/profile' : user?.role === 'admin' ? '/admin/profile' : '/profile';

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 text-gray-700 dropdown-toggle dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <span className="overflow-hidden rounded-full h-8 w-8 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
          {role.toLowerCase() === "resident" ? (
            <UserCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {(user?.username || "User").charAt(0).toUpperCase()}
            </span>
          )}
        </span>

        <div className="hidden sm:block text-left">
          <span className="block font-medium text-sm text-gray-800 dark:text-gray-200">
            {user?.username || "John Doe"}
          </span>
          <span className="mt-0.5 block">
            {renderRoleBadge((user?.role || "guest").toLowerCase())}
          </span>
        </div>
        
        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="14"
          height="14"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <CustomDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-2 flex w-[220px] flex-col rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl z-[9999]"
        style={{ 
          position: 'absolute',
          zIndex: 9999,
          pointerEvents: 'auto'
        }}
      >
        <div className="flex items-center gap-2 px-2 py-1 mb-2">
          <span className="overflow-hidden rounded-xl h-8 w-8 bg-blue-50 flex items-center justify-center border border-blue-100">
            {role.toLowerCase() === "resident" ? (
              <UserCircleIcon className="w-7 h-7 text-blue-600" />
            ) : (
              <span className="text-lg font-bold text-blue-600">
                {(user?.username || "User").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="flex-1 min-w-0">
            <span className="block font-bold text-slate-900 text-xs truncate">
              {user?.username || "User"}
            </span>
            <span className="block text-[9px] font-medium text-slate-400 truncate">
              {user?.email || "No email address"}
            </span>
          </div>
        </div>

        <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Account</div>
        <ul className="flex flex-col gap-1 mb-2">
          <li>
            <CustomDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to={profilePath}
              className="flex items-center gap-2 px-2 py-2 font-bold text-slate-800 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all text-xs"
            >
              <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all">
                <UserCircleIcon width={14} height={14} />
              </div>
              Profile Details
            </CustomDropdownItem>
          </li>
          {(role === "admin" || role === "brgy") && (
            <li>
              <CustomDropdownItem
                onItemClick={closeDropdown}
                tag="a"
                to={profilePath}
                className="flex items-center gap-2 px-2 py-2 font-bold text-slate-800 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all text-xs"
              >
                <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                Settings
              </CustomDropdownItem>
            </li>
          )}
        </ul>

        <button
          className="flex items-center justify-center gap-2 w-full px-2 py-2 font-bold rounded-xl text-xs bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
          onClick={logout}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </CustomDropdown>
    </div>
  );
}
