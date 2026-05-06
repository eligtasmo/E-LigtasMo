import React, { useState, useEffect } from 'react';
import { FaPhone, FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import PageMeta from "../../components/common/PageMeta";

const HotlineManagement: React.FC = () => {
    const [hotlines, setHotlines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [formData, setFormData] = useState({ name: '', number: '', category: 'Medical', icon: 'HeartPulse' });

    useEffect(() => {
        fetchHotlines();
    }, []);

    const fetchHotlines = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/hotlines-list.php`);
            const data = await res.json();
            if (data.success) setHotlines(data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const endpoint = editingItem ? 'hotlines-update.php' : 'hotlines-add.php';
        const payload = editingItem ? { ...formData, id: editingItem.id } : formData;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                setEditingItem(null);
                setFormData({ name: '', number: '', category: 'Medical', icon: 'HeartPulse' });
                fetchHotlines();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this hotline?')) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/hotlines-delete.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.success) fetchHotlines();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-6">
            <PageMeta title="Manage Hotlines | Admin" description="Manage emergency hotlines and categories." />
            
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Emergency Hotlines</h1>
                    <p className="text-gray-600">Configure public emergency contacts and their categories</p>
                </div>
                <button 
                    onClick={() => { setEditingItem(null); setFormData({ name: '', number: '', category: 'Medical', icon: 'HeartPulse' }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
                >
                    <FaPlus /> Add New Hotline
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-bold text-gray-600">Name</th>
                            <th className="px-6 py-4 font-bold text-gray-600">Number</th>
                            <th className="px-6 py-4 font-bold text-gray-600">Category</th>
                            <th className="px-6 py-4 font-bold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="p-12 text-center text-gray-500">Loading hotlines...</td></tr>
                        ) : hotlines.map(h => (
                            <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-800">{h.name}</td>
                                <td className="px-6 py-4 text-gray-600">{h.number}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                        h.category === 'Medical' ? 'bg-red-100 text-red-700' :
                                        h.category === 'Fire' ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {h.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => { setEditingItem(h); setFormData({ name: h.name, number: h.number, category: h.category, icon: h.icon }); setIsModalOpen(true); }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(h.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <form onSubmit={handleSave} className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">{editingItem ? 'Edit Hotline' : 'Add Hotline'}</h2>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Service Name</label>
                                    <input 
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="e.g. Police Department"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                    <input 
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.number}
                                        onChange={e => setFormData({...formData, number: e.target.value})}
                                        placeholder="e.g. 911"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                                    <select 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                    >
                                        <option value="Medical">Medical</option>
                                        <option value="Fire">Fire</option>
                                        <option value="Police">Police</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Icon (Lucide)</label>
                                    <select 
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
                                        value={formData.icon}
                                        onChange={e => setFormData({...formData, icon: e.target.value})}
                                    >
                                        <option value="HeartPulse">Heart (Medical)</option>
                                        <option value="Flame">Flame (Fire)</option>
                                        <option value="Shield">Shield (Police)</option>
                                        <option value="Phone">Phone (General)</option>
                                        <option value="AlertTriangle">Triangle (Alert)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
                                >
                                    {editingItem ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HotlineManagement;
