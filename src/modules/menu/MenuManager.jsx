import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Plus, Edit, Trash2, Search, CheckCircle2, XCircle } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { CustomSelect } from '../../components/CustomSelect';
import { MENU_CATEGORIES } from '../../data/mockData';

export const MenuManager = () => {
  const { menuItems, upsertMenuItem, toggleMenuItemStatus, removeMenuItem } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleToggleStatus = async (id) => {
    try {
      await toggleMenuItemStatus(id);
    } catch (error) {
      console.error('Failed to toggle menu item status:', error);
      window.alert(error.message || 'Failed to update menu item status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this menu item permanently?')) {
      return;
    }

    try {
      await removeMenuItem(id);
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      window.alert(error.message || 'Failed to delete the menu item.');
    }
  };

  const saveItem = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const draftItem = {
      ...editingItem,
      name: formData.get('name'),
      price: Number(formData.get('price')),
      category: formData.get('category'),
    };

    if (editingItem.id === 'new') {
      draftItem.id = `item-${Date.now()}`;
      draftItem.active = true;
    }

    setIsSaving(true);

    try {
      await upsertMenuItem(draftItem);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save menu item:', error);
      window.alert(error.message || 'Failed to save the menu item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen bg-[var(--fuego-bg)] p-8 overflow-y-auto transition-colors duration-300">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold font-logo text-[var(--fuego-text)]">Menu Management</h1>
          <p className="text-[var(--fuego-text-muted)] mt-1 italic font-medium text-sm">
            Configure your offerings and prices
          </p>
        </div>
        <button
          onClick={() => setEditingItem({ id: 'new', name: '', price: 0, category: 'Classic', active: true })}
          className="flex items-center gap-2 bg-fuego-orange text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg shadow-fuego-orange/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
        >
          <Plus size={20} />
          Add New Item
        </button>
      </div>

      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fuego-text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Search menu..."
            className="w-full bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-fuego-orange text-[var(--fuego-text)] transition-colors shadow-sm"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <div className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[var(--fuego-bg)]/50 text-[10px] text-[var(--fuego-text-muted)] uppercase font-black tracking-widest">
            <tr>
              <th className="p-8">Item Name</th>
              <th className="p-8 border-l border-[var(--fuego-border)]">Category</th>
              <th className="p-8 border-l border-[var(--fuego-border)]">Price</th>
              <th className="p-8 border-l border-[var(--fuego-border)]">Status</th>
              <th className="p-8 border-l border-[var(--fuego-border)] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--fuego-border)]">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--fuego-bg)]/50 transition-colors">
                <td className="p-8">
                  <span className="font-bold text-[var(--fuego-text)] uppercase tracking-wide">{item.name}</span>
                </td>
                <td className="p-8 border-l border-[var(--fuego-border)]">
                  <span className="text-[10px] bg-fuego-orange/10 px-4 py-1.5 rounded-full text-fuego-orange font-black uppercase tracking-widest border border-fuego-orange/20">
                    {item.category}
                  </span>
                </td>
                <td className="p-8 border-l border-[var(--fuego-border)] font-mono font-bold text-[var(--fuego-text)]">
                  ₹{item.price.toFixed(2)}
                </td>
                <td className="p-8 border-l border-[var(--fuego-border)]">
                  <button onClick={() => handleToggleStatus(item.id)} className="flex items-center gap-2 group">
                    {item.active ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="text-[var(--fuego-text-muted)]" />
                        <span className="text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest">Inactive</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="p-8 border-l border-[var(--fuego-border)] text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2.5 text-[var(--fuego-text-muted)] hover:text-fuego-orange bg-[var(--fuego-bg)] rounded-xl border border-[var(--fuego-border)] transition-all hover:scale-105"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2.5 text-[var(--fuego-text-muted)] hover:text-red-500 bg-[var(--fuego-bg)] rounded-xl border border-[var(--fuego-border)] transition-all hover:scale-105"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <Motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--fuego-card)] border border-[var(--fuego-border)] rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-[var(--fuego-border)] flex items-center justify-between bg-[var(--fuego-bg)]/50">
                <h2 className="text-xl font-bold text-[var(--fuego-text)]">
                  {editingItem.id === 'new' ? 'New Item Protocol' : 'Modify Item Parameters'}
                </h2>
              </div>
              <form onSubmit={saveItem} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest mb-3">
                    Item Descriptor
                  </label>
                  <input
                    name="name"
                    defaultValue={editingItem.name}
                    required
                    className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl py-4 px-5 focus:outline-none focus:border-fuego-orange text-[var(--fuego-text)] font-bold uppercase transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest mb-3">
                      Category Group
                    </label>
                    <CustomSelect
                      name="category"
                      options={MENU_CATEGORIES.map((category) => ({ id: category, name: category }))}
                      value={editingItem.category}
                      onChange={(value) => setEditingItem({ ...editingItem, category: value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--fuego-text-muted)] uppercase tracking-widest mb-3">
                      Unit Price (₹)
                    </label>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={editingItem.price}
                      required
                      className="w-full bg-[var(--fuego-bg)] border border-[var(--fuego-border)] rounded-2xl py-4 px-5 focus:outline-none focus:border-fuego-orange font-mono font-bold text-[var(--fuego-text)] transition-all"
                    />
                  </div>
                </div>
                <div className="pt-8 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-4 border border-[var(--fuego-border)] rounded-2xl font-black text-[10px] tracking-widest hover:bg-[var(--fuego-bg)] transition-all text-[var(--fuego-text-muted)] uppercase"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-fuego-orange text-white rounded-2xl font-black text-[10px] tracking-[0.2em] hover:brightness-110 shadow-lg shadow-fuego-orange/20 transition-all active:scale-95 uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Commit'}
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
