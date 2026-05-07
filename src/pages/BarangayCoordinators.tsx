import React, { useState, useEffect } from 'react';
import { FiPhone, FiPlus, FiEdit2, FiTrash2, FiSearch, FiRefreshCw, FiUser, FiMapPin, FiMail } from 'react-icons/fi';
import PageMeta from "../components/common/PageMeta";
import { toast } from 'react-hot-toast';

const BarangayCoordinators: React.FC = () => {
    const [coordinators, setCoordinators] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', barangay: '', role: 'Coordinator' });

    useEffect(() => {
        fetchCoordinators();
    }, []);

    const fetchCoordinators = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/brgy-coordinators-list.php`);
            const data = await res.json();
            if (data.success) setCoordinators(data.data);
        } catch (e) {
            toast.error("Failed to load coordinators");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const endpoint = editingItem ? 'brgy-coordinators-update.php' : 'brgy-coordinators-add.php';
        const payload = editingItem ? { ...formData, id: editingItem.id } : formData;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                toast.success(editingItem ? "Coordinator updated" : "Coordinator added");
                setShowModal(false);
                setEditingItem(null);
                setFormData({ name: '', phone: '', email: '', barangay: '', role: 'Coordinator' });
                fetchCoordinators();
            } else {
                toast.error(data.message || "Failed to save");
            }
        } catch (e) {
            toast.error("Connection error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to remove this coordinator?')) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/brgy-coordinators-delete.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Coordinator removed");
                fetchCoordinators();
            }
        } catch (e) {
            toast.error("Failed to remove coordinator");
        }
    };

    const filteredCoordinators = coordinators.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.barangay.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="tactical-page">
            <PageMeta title="Barangay Coordinators | Admin" description="Manage local emergency coordinators across all sectors." />
            
            <div className="tactical-container">
                
                {/* Header */}
                <div className="tactical-header">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="tactical-status-pill mb-4">
                                <div className="tactical-status-dot bg-emerald-500 animate-pulse" />
                                <span>COMMS_NETWORK: ACTIVE</span>
                            </div>
                            <h1 className="tactical-title">Community Coordinators</h1>
                            <p className="tactical-subtitle">Sector leads and emergency response personnel directory.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="tactical-search-group mb-0 p-2 h-14">
                                <div className="relative">
                                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or sector..."
                                        className="tactical-input w-64 pl-12 border-none bg-transparent h-10"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={fetchCoordinators}
                                className="tactical-icon-container hover:bg-white hover:text-blue-600"
                            >
                                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button 
                                onClick={() => { setEditingItem(null); setFormData({ name: '', barangay: '', phone: '', email: '', role: 'Coordinator' }); setShowModal(true); }}
                                className="tactical-button-accent"
                            >
                                <FiPlus /> Enroll Lead
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table View */}
                <div className="tactical-table-wrapper">
                    <div className="overflow-x-auto">
                        <table className="tactical-table">
                            <thead>
                                <tr>
                                    <th className="tactical-th">Name</th>
                                    <th className="tactical-th">Barangay</th>
                                    <th className="tactical-th">Contact</th>
                                    <th className="tactical-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-8 py-8 h-20 bg-slate-50/20" />
                                        </tr>
                                    ))
                                ) : filteredCoordinators.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <FiUser size={32} className="text-slate-200" />
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No_Active_Signals_Detected</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCoordinators.map(c => (
                                    <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="tactical-td">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{c.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tactical-td">
                                            <span className="text-sm font-medium text-slate-700">{c.barangay}</span>
                                        </td>
                                        <td className="tactical-td">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs text-slate-700">{c.phone}</span>
                                                <span className="text-xs text-slate-400 lowercase">{c.email}</span>
                                            </div>
                                        </td>
                                        <td className="tactical-td text-right">
                                            <div className="flex justify-end gap-1">
                                                <button 
                                                    onClick={() => { setEditingItem(c); setFormData({ name: c.name, phone: c.phone, email: c.email, barangay: c.barangay, role: c.role }); setShowModal(true); }}
                                                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-blue-600 transition-all"
                                                >
                                                    <FiEdit2 size={11} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(c.id)}
                                                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-rose-600 transition-all"
                                                >
                                                    <FiTrash2 size={11} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[2000] p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-10">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{editingItem ? 'Edit Sector Lead' : 'Enroll New Lead'}</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Synchronization Node</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="tactical-icon-container hover:bg-slate-50">
                                    <FiPlus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="tactical-label">Lead_Full_Name</label>
                                    <input 
                                        required
                                        className="tactical-input w-full"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="IDENT_NAME..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="tactical-label">Sector_Assignment</label>
                                        <input 
                                            required
                                            className="tactical-input w-full"
                                            value={formData.barangay}
                                            onChange={e => setFormData({...formData, barangay: e.target.value})}
                                            placeholder="BRGY_NAME..."
                                        />
                                    </div>
                                    <div>
                                        <label className="tactical-label">Lead_Access_Role</label>
                                        <select 
                                            className="tactical-input w-full appearance-none pr-10"
                                            value={formData.role}
                                            onChange={e => setFormData({...formData, role: e.target.value})}
                                        >
                                            <option value="Coordinator">Coordinator</option>
                                            <option value="Deputy">Deputy</option>
                                            <option value="Representative">Representative</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="tactical-label">Phone_Comms_Target</label>
                                    <input 
                                        required
                                        className="tactical-input w-full"
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        placeholder="+63_9XX..."
                                    />
                                </div>
                                <div>
                                    <label className="tactical-label">Email_Digital_ID</label>
                                    <input 
                                        type="email"
                                        required
                                        className="tactical-input w-full"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        placeholder="MAILTO_ADDRESS..."
                                    />
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="tactical-button-ghost flex-1"
                                    >
                                        Abort
                                    </button>
                                    <button 
                                        type="submit"
                                        className="tactical-button-accent flex-1"
                                    >
                                        {editingItem ? 'Update_Registry' : 'Confirm_Enrollment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarangayCoordinators;
