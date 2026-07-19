import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit2, Package, ShoppingBag, BarChart3, Trash2, Search, Plus } from 'lucide-react';
import { API_BASE_URL } from '../../context/AuthContext';

export const ProductManagementTab = ({
  products,
  formatPrice,
  setEditingProduct,
  setEditProductImages,
  initEditImages,
  setIsEditImagesOpen,
  handleOpenStockModal,
  handleOpenOrdersModal,
  handleOpenAnalyticsModal,
  onDeleteProduct,
  onAddProductClick
}) => {
  const [adminCollections, setAdminCollections] = useState([]);
  const [productFilterCategory, setProductFilterCategory] = useState('All');
  const [productFilterCollection, setProductFilterCollection] = useState('All');
  const [productFilterStatus, setProductFilterStatus] = useState('All');
  const [productFilterSearch, setProductFilterSearch] = useState('');

  useEffect(() => {
    const fetchCols = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/collections`);
        setAdminCollections(res.data || []);
      } catch (err) {
        console.error("Error fetching collections for filtering:", err);
      }
    };
    fetchCols();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = !productFilterSearch || 
      p.name.toLowerCase().includes(productFilterSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(productFilterSearch.toLowerCase()));
    
    const matchesCategory = productFilterCategory === 'All' || p.category === productFilterCategory;
    
    const matchesCollection = productFilterCollection === 'All' || p.collection === productFilterCollection;
    
    const matchesStatus = productFilterStatus === 'All' || p.status === productFilterStatus;
    
    return matchesSearch && matchesCategory && matchesCollection && matchesStatus;
  });

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        {/* Left Column/Group on Desktop & Mobile */}
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
            Catalog Products
          </h3>
          {/* Desktop Badge: hidden on mobile, visible on desktop */}
          <span className="hidden md:inline-block px-2.5 py-1 text-xs bg-[#D4A75F] text-[#111827] rounded-full font-bold shadow-sm whitespace-nowrap">
            {products.length} Products
          </span>
        </div>

        {/* Mobile-only badge and button row */}
        <div className="flex md:hidden flex-wrap items-center justify-between gap-3 w-full">
          <span className="px-2.5 py-1 text-xs bg-[#D4A75F] text-[#111827] rounded-full font-bold shadow-sm whitespace-nowrap">
            {products.length} Products
          </span>
          <button
            onClick={onAddProductClick}
            className="h-[42px] px-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[12px] text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Desktop-only button: hidden on mobile */}
        <button
          onClick={onAddProductClick}
          className="hidden md:flex py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow items-center gap-1.5 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
        {/* Search Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search name, description..."
              value={productFilterSearch}
              onChange={(e) => setProductFilterSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
          <select
            value={productFilterCategory}
            onChange={(e) => setProductFilterCategory(e.target.value)}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
          >
            <option value="All">All Categories</option>
            <option value="Rings">Rings</option>
            <option value="Necklaces">Necklaces</option>
            <option value="Earrings">Earrings</option>
            <option value="Bracelets">Bracelets</option>
            <option value="Bridal Collection">Bridal Collection</option>
          </select>
        </div>

        {/* Collection Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Collection</label>
          <select
            value={productFilterCollection}
            onChange={(e) => setProductFilterCollection(e.target.value)}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
          >
            <option value="All">All Collections</option>
            {adminCollections.map(col => (
              <option key={col.id} value={col.name}>{col.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
          <select
            value={productFilterStatus}
            onChange={(e) => setProductFilterStatus(e.target.value)}
            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
        
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProducts.map(p => {
          const discountedPrice = Math.round(p.price - (p.price * (p.discount / 100)));
          
          // Audit date formatting helper
          const formatAudit = (dateStr) => {
            if (!dateStr) return "N/A";
            try {
              const d = new Date(dateStr);
              return d.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
            } catch(e) {
              return dateStr;
            }
          };

          return (
            <div key={p._id} className="relative border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-955/20 rounded-2xl p-4.5 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              {/* Delete Button */}
              <button
                onClick={() => onDeleteProduct(p)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-full shadow-md hover:scale-105 transition-all duration-200 cursor-pointer z-20"
                title="Delete Product"
                aria-label="Delete Product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div>
                {/* Product Image and Category */}
                <div className="flex gap-4 mb-3">
                  <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{p.category}</span>
                      {p.collection && (
                        <span className="text-[9px] font-bold bg-[#D4A75F]/15 text-[#D4A75F] px-1.5 py-0.5 rounded">{p.collection}</span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {p.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5" title={p.name}>{p.name}</h4>
                  </div>
                </div>

                {/* Price / Discount History */}
                <div className="bg-white dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800/80 p-2.5 rounded-xl text-xs space-y-1 mb-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400 font-medium">Pricing:</span>
                    <div className="flex items-center gap-1.5">
                      {p.discount > 0 ? (
                        <>
                          <span className="text-slate-455 dark:text-slate-555 line-through price-amount">₹{formatPrice(p.price)}</span>
                          <span className="text-slate-400">↓</span>
                          <span className="text-slate-900 dark:text-slate-100 font-extrabold text-sm price-amount">₹{formatPrice(discountedPrice)}</span>
                          <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-955/40 dark:text-rose-455 rounded">{p.discount}% OFF</span>
                        </>
                      ) : (
                        <span className="text-slate-900 dark:text-slate-100 font-extrabold text-sm price-amount">₹{formatPrice(p.price)}</span>
                      )}
                    </div>
                  </div>
                  {p.discount > 0 && p.discount_applied_at && (
                    <div className="text-[9px] text-slate-400 flex justify-between border-t border-slate-100 dark:border-slate-850/50 pt-1 mt-1">
                      <span>Applied On:</span>
                      <span className="font-semibold">{formatAudit(p.discount_applied_at)}</span>
                    </div>
                  )}
                </div>

                {/* Stock Display */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-slate-400 font-medium">Stock Status:</span>
                  <span className={`stock-badge-container ${
                    p.stock === 0 
                      ? 'stock-badge-out-of-stock' 
                      : p.stock < 10 
                        ? 'stock-badge-low-stock' 
                        : 'stock-badge-in-stock'
                  }`}>
                    {p.stock === 0 ? "Out Of Stock" : p.stock < 10 ? `Low Stock: ${p.stock} Units` : `Stock: ${p.stock} Units`}
                  </span>
                </div>

                {/* Audit Logs */}
                <div className="border-t border-slate-100 dark:border-slate-850/60 pt-2.5 pb-2 text-[10px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-semibold text-slate-550 dark:text-slate-455">{formatAudit(p.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modified:</span>
                    <span className="font-semibold text-slate-550 dark:text-slate-455">{formatAudit(p.updated_at || p.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-850/60">
                <button
                  onClick={() => {
                    setEditingProduct({ ...p, image_url: p.images?.[0] || '' });
                    setEditProductImages(initEditImages(p));
                    setIsEditImagesOpen(false);
                  }}
                  className="py-2 px-2.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Product</span>
                </button>
                <button
                  onClick={() => handleOpenStockModal(p)}
                  className="py-2 px-2.5 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-455 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Manage Stock</span>
                </button>
                <button
                  onClick={() => handleOpenOrdersModal(p)}
                  className="py-2 px-2.5 text-[10px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-650 dark:text-purple-400 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>View Orders</span>
                </button>
                <button
                  onClick={() => handleOpenAnalyticsModal(p)}
                  className="py-2 px-2.5 text-[10px] font-bold border border-[#D4A75F]/35 dark:border-[#D4A75F] bg-[#D4A75F]/8 dark:bg-[rgba(212,167,95,0.12)] text-[#9A7232] dark:text-[#D4A75F] hover:bg-[#D4A75F] hover:text-white dark:hover:bg-[#D4A75F] dark:hover:text-white dark:hover:border-transparent hover:translate-y-[-2px] shadow-[0_4px_12px_rgba(212,167,95,0.08)] dark:shadow-[0_4px_12px_rgba(212,167,95,0.20)] rounded-xl transition-all duration-[250ms] ease-in-out text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>View Sales</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
