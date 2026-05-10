import { useEffect, useState } from "react";
import { CustomDropdown, CustomDropdownItem } from "../common";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

interface NotificationDropdownProps {
  notificationCount?: number;
}

type NotificationItem = {
  id: string;
  kind: "pending_user" | "announcement" | "system";
  title: string;
  message: string;
  link?: string;
  time?: string;
};

export default function NotificationDropdown({ notificationCount = 0 }: NotificationDropdownProps) {
  const { user } = useAuth();
  const role = (user?.role || "guest").toLowerCase();
  const brgyName = (user as any)?.brgy_name || (user as any)?.brgy || "";
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const computedCount = items.length;
  const [notifying, setNotifying] = useState(computedCount > 0);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setNotifying(false);
  };
  
  useEffect(() => {
    const load = async () => {
      const all: NotificationItem[] = [];
      if (role === "admin") {
        try {
          const res = await apiFetch("list-users.php?status=pending");
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            data.users.forEach((u: any) => {
              all.push({
                id: `pending-${u.id}`,
                kind: "pending_user",
                title: "Pending Account",
                message: `${u.full_name || u.username} • ${u.brgy_name || "Barangay"}`,
                link: "/admin/user-management",
                time: "now",
              });
            });
          }
        } catch {}
      }
      // Announcements
      try {
        const aud = role === 'admin' ? 'all' : (role.includes('brgy') ? 'brgy' : 'residents');
        const brgyParam = brgyName && aud !== 'all' ? `&brgy=${encodeURIComponent(brgyName)}` : '';
        const res = await apiFetch(`list-announcements.php?audience=${encodeURIComponent(aud)}&limit=5${brgyParam}`, { headers: { 'X-Role': role } });
        const data = await res.json();
        const rows = (data?.success && Array.isArray(data.announcements)) ? data.announcements : [];
        rows.forEach((a: any) => {
          all.push({
            id: `announce-${a.id}`,
            kind: 'announcement',
            title: a.title || 'Announcement',
            message: a.message || '',
            link: role === 'admin' ? '/admin/announcements' : (role.includes('brgy') ? '/brgy' : '/announcements'),
            time: a.created_at || 'recent'
          });
        });
      } catch {}

      // Notifications (bell-specific)
      try {
        const aud = role === 'admin' ? 'all' : (role.includes('brgy') ? 'brgy' : 'residents');
        const brgyParam = brgyName && aud !== 'all' ? `&brgy=${encodeURIComponent(brgyName)}` : '';
        const res = await apiFetch(`list-notifications.php?audience=${encodeURIComponent(aud)}&limit=5${brgyParam}`, { headers: { 'X-Role': role } });
        const data = await res.json();
        const rows = (data?.success && Array.isArray(data.notifications)) ? data.notifications : [];
        rows.forEach((n: any) => {
          all.push({
            id: `notif-${n.id}`,
            kind: 'system',
            title: n.title || 'Notification',
            message: n.message || '',
            link: role === 'admin' ? '/admin/announcements' : (role.includes('brgy') ? '/brgy' : '/announcements'),
            time: n.created_at || 'recent'
          });
        });
      } catch {}

      setItems(all);
      setNotifying(all.length > 0);
    };
    load();
  }, [role]);
  
  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-slate-500 transition-all duration-300 bg-white border border-slate-100 rounded-xl dropdown-toggle hover:text-blue-600 h-11 w-11 hover:bg-blue-50/50 hover:border-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 shadow-sm hover:shadow-md group"
        onClick={handleClick}
      >
        {/* Notification Count Badge - Tactical Style */}
        {computedCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center min-w-[20px] h-[20px] text-[10px] font-bold text-white bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
            {computedCount > 99 ? '99+' : computedCount}
          </span>
        )}

        {/* Tactical Pulse Indicator */}
        {computedCount > 0 && (
          <span className="absolute -right-0.5 top-0.5 z-0 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
        )}

        <svg
          className="transition-transform duration-300 group-hover:scale-110"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </button>

      <CustomDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0 z-[9999]"
        style={{ 
          position: 'absolute',
          zIndex: 9999,
          pointerEvents: 'auto'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notification
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {items.length === 0 && (
            <li className="text-sm text-gray-500 px-4 py-3">No notifications</li>
          )}
          {items.length > 0 && items.map((n) => (
            <li key={n.id}>
              <CustomDropdownItem
                onItemClick={closeDropdown}
                className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                to={n.link}
              >
                <span className="relative block w-full h-10 rounded-full z-1 max-w-10">
                  <img width={40} height={40} src={n.kind === "pending_user" ? "/images/user/user-02.jpg" : "/images/logo/logo-icon-dark.svg"} alt="" className="w-full overflow-hidden rounded-full" />
                  <span className={`absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white ${n.kind === 'pending_user' ? 'bg-warning-500' : 'bg-success-500'} dark:border-gray-900`}></span>
                </span>
                <span className="block">
                  <span className="mb-1.5 block text-theme-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-gray-800 dark:text-white/90">{n.title}</span>
                    <span className="ml-1">{n.message}</span>
                  </span>
                  <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                    <span>{n.kind === 'pending_user' ? 'Approvals' : 'Announcements'}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span>{n.time || 'recent'}</span>
                  </span>
                </span>
              </CustomDropdownItem>
            </li>
          ))}
        </ul>
        <Link
          to={role === 'admin' ? '/admin/user-management' : '/announcements'}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link>
      </CustomDropdown>
    </div>
  );
}
