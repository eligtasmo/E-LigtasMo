import { useState } from 'react';
import Alert from '../../components/ui/alert/Alert';
import Badge from '../../components/ui/badge/Badge';
import { Modal } from '../../components/ui/modal';

const mockAnnouncements = [
  { id: 1, title: 'Flood Warning', message: 'Heavy rain expected in your area. Stay alert!', type: 'warning', date: '2024-06-10', sender: 'Admin', audience: 'All Residents' },
  { id: 2, title: 'Barangay Meeting', message: 'Barangay assembly this Friday at 6pm.', type: 'info', date: '2024-06-08', sender: 'Brgy Captain', audience: 'Bagumbayan Residents' },
];

export default function Announcements() {
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', audience: 'All Residents' });

  const handleSend = () => {
    setAnnouncements([
      { id: Date.now(), ...form, date: new Date().toISOString().slice(0,10), sender: 'You' },
      ...announcements
    ]);
    setShowModal(false);
    setForm({ title: '', message: '', type: 'info', audience: 'All Residents' });
  };

  return (
    <div className="px-4 py-6 md:px-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Announcements & Notifications</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold" onClick={() => setShowModal(true)}>
          Send Announcement
        </button>
      </div>
      <div className="space-y-4">
        {announcements.map(a => (
          <Alert
            key={a.id}
            variant={a.type as 'success' | 'error' | 'warning' | 'info'}
            title={a.title}
            message={
              `${a.message}\n${a.date} • ${a.sender} • ${a.audience}`
            }
          />
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">Send Announcement</h2>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">Title</label>
            <input className="w-full border rounded p-2" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">Message</label>
            <textarea className="w-full border rounded p-2" value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">Type</label>
            <select className="w-full border rounded p-2" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">Audience</label>
            <select className="w-full border rounded p-2" value={form.audience} onChange={e => setForm(f => ({...f, audience: e.target.value}))}>
              <option>All Residents</option>
              <option>Barangay Only</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700" onClick={handleSend}>Send</button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 