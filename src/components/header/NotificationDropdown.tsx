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
  }, [role, brgyName]);
  
  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-slate-500 transition-all duration-300 bg-white border border-slate-100 rounded-xl dropdown-toggle hover:text-brand-600 h-11 w-11 hover:bg-brand-50/50 hover:border-brand-100 shadow-sm hover:shadow-md group"
        onClick={handleClick}
      >
        {computedCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center min-w-[20px] h-[20px] text-[10px] font-bold text-white bg-brand-500 rounded-full border-2 border-white shadow-sm">
            {computedCount > 99 ? '99+' : computedCount}
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
        className="absolute -right-[240px] mt-4 flex h-[480px] w-[350px] flex-col rounded-2xl border border-brand-100 bg-white p-3 shadow-premium-xl z-[9999]"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-brand-50">
          <h5 className="text-base font-bold text-gray-950">
            Notifications
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {items.length === 0 && (
            <li className="text-[13px] font-medium text-gray-400 text-center py-10">No recent notifications</li>
          )}
          {items.length > 0 && items.map((n) => (
            <li key={n.id}>
              <CustomDropdownItem
                onItemClick={closeDropdown}
                className="flex gap-4 rounded-xl border-b border-brand-50 p-4 hover:bg-brand-50 transition-colors"
                to={n.link}
              >
                <div className="w-10 h-10 rounded-full bg-brand-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-brand-100">
                  <img 
                    src={n.kind === "pending_user" ? "/images/user/user-02.jpg" : "/images/final logo.png"} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 mb-0.5 truncate">{n.title}</p>
                  <p className="text-[12px] font-medium text-gray-500 leading-tight mb-2 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                    <span>{n.kind === 'pending_user' ? 'Approval' : 'System'}</span>
                    <span className="w-1 h-1 rounded-full bg-brand-200" />
                    <span className="text-gray-400">{n.time || 'recent'}</span>
                  </div>
                </div>
              </CustomDropdownItem>
            </li>
          ))}
        </ul>
        <Link
          to={role === 'admin' ? '/admin/user-management' : '/announcements'}
          className="mt-3 py-3 rounded-xl bg-gray-50 text-[13px] font-bold text-gray-600 hover:bg-gray-100 transition-all text-center"
        >
          View All Activities
        </Link>
      </CustomDropdown>
    </div>
  );
}
