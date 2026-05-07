import React, { useState, useEffect } from 'react';
import { FiPhone, FiPlus, FiEdit2, FiTrash2, FiSearch, FiRefreshCw, FiMapPin, FiActivity, FiShield, FiX, FiCheckCircle } from 'react-icons/fi';
import PageMeta from "../components/common/PageMeta";
import { toast } from 'react-hot-toast';

const EmergencyContacts: React.FC = () => {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [formData, setFormData] = useState({ name: '', number: '', type: 'Emergency', agency: '', location: '' });

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/emergency-contacts-list.php`);
            const data = await res.json();
            if (data.success) setContacts(data.data);
        } catch (e) {
            toast.error("Failed to load contacts");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const endpoint = editingItem ? 'emergency-contacts-update.php' : 'emergency-contacts-add.php';
        const payload = editingItem ? { ...formData, id: editingItem.id } : formData;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                toast.success(editingItem ? "Contact updated" : "Contact added");
                setShowModal(false);
                setEditingItem(null);
                setFormData({ name: '', number: '', type: 'Emergency', agency: '', location: '' });
                fetchContacts();
            } else {
                toast.error(data.message || "Failed to save");
            }
        } catch (e) {
            toast.error("Connection error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/emergency-contacts-delete.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Contact deleted");
                fetchContacts();
            }
        } catch (e) {
            toast.error("Failed to delete contact");
        }
    };

    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.agency.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.number.includes(searchTerm)
    );

    const getIcon = (type: string) => {
        switch(type.toLowerCase()) {
            case 'medical': return <FiActivity className="text-rose-500" />;
            case 'police': return <FiShield className="text-blue-500" />;
            case 'fire': return <FiActivity className="text-orange-500" />;
            default: return <FiPhone className="text-slate-400" />;
        }
    };

    return (
        <div className="min-h-screen bg-white p-8 font-outfit">
            <PageMeta title="Emergency Contacts | E-LigtasMo" description="Direct communication links for emergency services." />
            
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Emergency Contacts</h1>
                        <p className="text-slate-500 mt-1">Direct links to critical response services</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                className="h-12 w-64 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={fetchContacts}
                            className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all border border-slate-100"
                        >
                            <FiRefreshCw className={loading ? 'animate-spin text-blue-500' : ''} />
                        </button>
                        <button 
                            onClick={() => { setEditingItem(null); setFormData({ name: '', number: '', type: 'Emergency', agency: '', location: '' }); setShowModal(true); }}
                            className="h-12 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/10 active:scale-95"
                        >
                            <FiPlus size={18} /> Add Contact
                        </button>
                    </div>
                </div>

                {/* Grid View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-48 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse" />
                        ))
                    ) : filteredContacts.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-400">No contacts found</div>
                    ) : (
                        filteredContacts.map(c => (
                            <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-bl-[3rem] -mr-8 -mt-8 transition-all group-hover:scale-150" />
                                
                                <div className="relative flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-sm">
                                            {getIcon(c.type)}
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { setEditingItem(c); setFormData({ name: c.name, number: c.number, type: c.type, agency: c.agency, location: c.location }); setShowModal(true); }}
                                                className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center border border-slate-100"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(c.id)}
                                                className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 transition-all flex items-center justify-center border border-slate-100"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-6 flex-grow">
                                        <h3 className="font-bold text-slate-900 text-lg leading-none mb-2">{c.name}</h3>
                                        <p className="text-sm text-slate-500 font-medium">{c.agency}</p>
                                        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                            <FiMapPin className="text-cyan-500" />
                                            <span>{c.location || 'All Sectors'}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => window.open(`tel:${c.number}`)}
                                        className="w-full h-12 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg"
                                    >
                                        <FiPhone /> {c.number}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-slate-900">{editingItem ? 'Edit Contact' : 'Add Emergency Contact'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><FiX size={24} /></button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Station/Service Name</label>
                                    <input 
                                        required
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="e.g. Brgy Emergency Response"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                                        <select 
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                                            value={formData.type}
                                            onChange={e => setFormData({...formData, type: e.target.value})}
                                        >
                                            <option value="Emergency">Emergency</option>
                                            <option value="Medical">Medical</option>
                                            <option value="Police">Police</option>
                                            <option value="Fire">Fire</option>
                                            <option value="Support">Support</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Agency</label>
                                        <input 
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            value={formData.agency}
                                            onChange={e => setFormData({...formData, agency: e.target.value})}
                                            placeholder="e.g. MMDRMO"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                                    <input 
                                        required
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        value={formData.number}
                                        onChange={e => setFormData({...formData, number: e.target.value})}
                                        placeholder="09xx... or local number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Location</label>
                                    <input 
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        value={formData.location}
                                        onChange={e => setFormData({...formData, location: e.target.value})}
                                        placeholder="Barangay or Sector name"
                                    />
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 h-12 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-all border border-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/10 active:scale-95"
                                    >
                                        {editingItem ? 'Save Changes' : 'Add Contact'}
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

export default EmergencyContacts;