import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FolderOpen, Plus, Edit2, Trash2, Eye, EyeOff, X, 
  Search, Filter, Check, ShieldAlert, ArrowRight, Layers,
  Calendar, CheckCircle, ExternalLink, RefreshCw, Upload
} from 'lucide-react';
import { API_BASE_URL } from '../../context/AuthContext';
import { AdminImageManager } from './AdminImageManager';

export const CollectionManagementTab = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    hidden: 0,
    productsAssigned: 0
  });

  // Toast / Status messages
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isManageProductsOpen, setIsManageProductsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form states
  const [collectionForm, setCollectionForm] = useState({
    name: '',
    slug: '',
    description: '',
    banner_image: '',
    thumbnail_image: '',
    desktop_banner: '',
    mobile_banner: '',
    preview_image: '',
    highlights: '',
    rules: '',
    display_order: 0,
    is_active: true,
    show_on_homepage: true
  });

  const INITIAL_COLLECTION_IMAGE_SLOTS = [
    { slot: 'Banner Image', url: '', required: false, key: 'banner_image' },
    { slot: 'Thumbnail Image', url: '', required: false, key: 'thumbnail_image' },
    { slot: 'Desktop Banner', url: '', required: false, key: 'desktop_banner' },
    { slot: 'Mobile Banner', url: '', required: false, key: 'mobile_banner' },
    { slot: 'Preview Image', url: '', required: false, key: 'preview_image' }
  ];

  const [collectionImages, setCollectionImages] = useState(INITIAL_COLLECTION_IMAGE_SLOTS);
  const [isAddImagesOpen, setIsAddImagesOpen] = useState(false);
  const [isEditImagesOpen, setIsEditImagesOpen] = useState(false);

  const [selectedCollection, setSelectedCollection] = useState(null);
  
  // Product assignment states
  const [storeProducts, setStoreProducts] = useState([]);
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [unassignedProducts, setUnassignedProducts] = useState([]);
  const [assignedWorkingList, setAssignedWorkingList] = useState([]);
  const [unassignedWorkingList, setUnassignedWorkingList] = useState([]);
  
  // Search & Filter in assign product modal
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  // Fetch collections from server
  const fetchCollections = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const res = await axios.get(`${API_BASE_URL}/collections/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      setCollections(data);
      
      // Calculate Stats
      const total = data.length;
      const active = data.filter(c => c.is_active).length;
      const hidden = total - active;
      const productsAssigned = data.reduce((sum, c) => sum + (c.products_count || 0), 0);
      
      setStats({ total, active, hidden, productsAssigned });
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch collections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Handle Slug generation from name
  const handleNameChange = (e, isEdit = false) => {
    const nameVal = e.target.value;
    const slugVal = nameVal
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (isEdit) {
      setCollectionForm(prev => ({ ...prev, name: nameVal }));
    } else {
      setCollectionForm(prev => ({ ...prev, name: nameVal, slug: slugVal }));
    }
  };

  // CRUD Operations
  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!collectionForm.name) {
      showToast('Collection Name is required.', 'error');
      return;
    }

    const imageMap = {};
    collectionImages.forEach(slot => {
      imageMap[slot.key] = slot.url;
    });

    const payload = {
      ...collectionForm,
      banner_image: imageMap['banner_image'] || '',
      thumbnail_image: imageMap['thumbnail_image'] || '',
      desktop_banner: imageMap['desktop_banner'] || '',
      mobile_banner: imageMap['mobile_banner'] || '',
      preview_image: imageMap['preview_image'] || ''
    };

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      await axios.post(`${API_BASE_URL}/collections`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Collection created successfully!', 'success');
      setIsAddModalOpen(false);
      setIsAddImagesOpen(false);
      fetchCollections();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to create collection.', 'error');
    }
  };

  const handleUpdateCollection = async (e) => {
    e.preventDefault();
    if (!collectionForm.name) {
      showToast('Collection Name is required.', 'error');
      return;
    }

    const imageMap = {};
    collectionImages.forEach(slot => {
      imageMap[slot.key] = slot.url;
    });

    const payload = {
      ...collectionForm,
      banner_image: imageMap['banner_image'] || '',
      thumbnail_image: imageMap['thumbnail_image'] || '',
      desktop_banner: imageMap['desktop_banner'] || '',
      mobile_banner: imageMap['mobile_banner'] || '',
      preview_image: imageMap['preview_image'] || ''
    };

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      await axios.put(`${API_BASE_URL}/collections/${selectedCollection.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Collection updated successfully!', 'success');
      setIsEditModalOpen(false);
      setIsEditImagesOpen(false);
      fetchCollections();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update collection.', 'error');
    }
  };

  const handleDeleteCollection = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE_URL}/collections/${selectedCollection.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Collection deleted successfully!', 'success');
      setIsDeleteModalOpen(false);
      fetchCollections();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete collection.', 'error');
    }
  };

  const handleToggleVisibility = async (col) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      await axios.put(`${API_BASE_URL}/collections/${col.id}`, {
        is_active: !col.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`Collection is now ${!col.is_active ? 'Visible' : 'Hidden'}!`, 'success');
      fetchCollections();
    } catch (err) {
      console.error(err);
      showToast('Failed to update visibility.', 'error');
    }
  };

  // Manage products modal opener
  const handleOpenManageProducts = async (col) => {
    setSelectedCollection(col);
    setProductSearch('');
    setCategoryFilter('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      // Fetch assignment mappings
      const res = await axios.get(`${API_BASE_URL}/collections/${col.id}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { assigned, unassigned } = res.data;
      setAssignedProducts(assigned);
      setUnassignedProducts(unassigned);
      setAssignedWorkingList(assigned);
      setUnassignedWorkingList(unassigned);

      // Extract unique categories for filtering
      const allC = [...assigned, ...unassigned];
      const uniqueCats = [...new Set(allC.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCats);

      setIsManageProductsOpen(true);
    } catch (err) {
      console.error(err);
      showToast('Failed to load products list.', 'error');
    }
  };

  const handleAddProductToWorkingList = (product) => {
    setUnassignedWorkingList(prev => prev.filter(p => p.id !== product.id && p._id !== product._id));
    setAssignedWorkingList(prev => [...prev, product]);
  };

  const handleRemoveProductFromWorkingList = (product) => {
    setAssignedWorkingList(prev => prev.filter(p => p.id !== product.id && p._id !== product._id));
    setUnassignedWorkingList(prev => [...prev, product]);
  };

  const handleSaveProductSync = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const productIds = assignedWorkingList.map(p => p.id || p._id);
      
      await axios.post(`${API_BASE_URL}/collections/${selectedCollection.id}/products`, {
        product_ids: productIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast('Collection products synced successfully!', 'success');
      setIsManageProductsOpen(false);
      fetchCollections();
    } catch (err) {
      console.error(err);
      showToast('Failed to sync collection products.', 'error');
    }
  };

  // Preview collection details
  const [previewProducts, setPreviewProducts] = useState([]);
  const handleOpenPreview = async (col) => {
    setSelectedCollection(col);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const res = await axios.get(`${API_BASE_URL}/collections/${col.id}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewProducts(res.data.assigned);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error(err);
      showToast('Failed to load preview.', 'error');
    }
  };

  // Helpers for modals
  const openAddModal = () => {
    setCollectionForm({
      name: '',
      slug: '',
      description: '',
      banner_image: '',
      thumbnail_image: '',
      desktop_banner: '',
      mobile_banner: '',
      preview_image: '',
      highlights: '',
      rules: '',
      display_order: 0,
      is_active: true,
      show_on_homepage: true
    });
    setCollectionImages(INITIAL_COLLECTION_IMAGE_SLOTS);
    setIsAddImagesOpen(false);
    setIsAddModalOpen(true);
  };

  const openEditModal = (col) => {
    setSelectedCollection(col);
    setCollectionForm({
      name: col.name,
      slug: col.slug,
      description: col.description || '',
      banner_image: col.banner_image || '',
      thumbnail_image: col.thumbnail_image || '',
      desktop_banner: col.desktop_banner || '',
      mobile_banner: col.mobile_banner || '',
      preview_image: col.preview_image || '',
      highlights: col.highlights || '',
      rules: col.rules || '',
      display_order: col.display_order || 0,
      is_active: col.is_active,
      show_on_homepage: col.show_on_homepage !== undefined ? col.show_on_homepage : true
    });
    setCollectionImages([
      { slot: 'Banner Image', url: col.banner_image || '', required: false, key: 'banner_image' },
      { slot: 'Thumbnail Image', url: col.thumbnail_image || '', required: false, key: 'thumbnail_image' },
      { slot: 'Desktop Banner', url: col.desktop_banner || '', required: false, key: 'desktop_banner' },
      { slot: 'Mobile Banner', url: col.mobile_banner || '', required: false, key: 'mobile_banner' },
      { slot: 'Preview Image', url: col.preview_image || '', required: false, key: 'preview_image' }
    ]);
    setIsEditImagesOpen(false);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (col) => {
    setSelectedCollection(col);
    setIsDeleteModalOpen(true);
  };

  // Helpers for filtering working list
  const getFilteredUnassigned = () => {
    return unassignedWorkingList.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                            (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()));
      const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
      return matchesSearch && matchesCategory;
    });
  };

  const getFilteredAssigned = () => {
    return assignedWorkingList.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                            (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()));
      const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
      return matchesSearch && matchesCategory;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
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
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold text-white ${
            toast.type === 'error' ? 'bg-rose-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
          }`}>
            {toast.type === 'error' ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-[#D4A75F]" />
            <span>Collection Management</span>
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">
            Organize homepage showcases, display priority, and curate targeted customer features.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#D4A75F] text-[#111827] rounded-xl font-bold text-xs hover:bg-[#c39650] hover:scale-102 transition-all shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Collection</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Total Collections</span>
            <span className="text-xl sm:text-2xl font-black block mt-1">{stats.total}</span>
          </div>
          <div className="bg-[#D4A75F]/15 p-3 rounded-2xl text-[#D4A75F]">
            <FolderOpen className="h-6 w-6" />
          </div>
        </div>
        {/* Active */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Active Collections</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-450 block mt-1">{stats.active}</span>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-600 dark:text-emerald-455">
            <Eye className="h-6 w-6" />
          </div>
        </div>
        {/* Hidden */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Hidden Collections</span>
            <span className="text-xl sm:text-2xl font-black text-rose-500 block mt-1">{stats.hidden}</span>
          </div>
          <div className="bg-rose-500/10 p-3 rounded-2xl text-rose-500">
            <EyeOff className="h-6 w-6" />
          </div>
        </div>
        {/* Products Assigned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Products Assigned</span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 block mt-1">{stats.productsAssigned}</span>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
            <Layers className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="h-8 w-8 text-[#D4A75F] animate-spin" />
            <span className="text-xs text-slate-400">Fetching collections...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-500 font-bold text-xs">{error}</div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400">No collections found. Click "Add Collection" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {collections.map(col => (
              <div 
                key={col.id} 
                className="relative border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/20 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-300"
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="flex gap-4 mb-4">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex-shrink-0">
                      <img 
                        src={col.thumbnail_image || 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=200'} 
                        alt={col.name} 
                        className="h-full w-full object-cover" 
                      />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded ${
                          col.is_active 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-455' 
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455'
                        }`}>
                          {col.is_active ? 'ACTIVE' : 'HIDDEN'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">Order: {col.display_order}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate mt-1" title={col.name}>
                        {col.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono truncate block mt-0.5">/{col.slug}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem] mb-4">
                    {col.description || 'No description provided.'}
                  </p>

                  {/* Meta details */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800/80 p-3 rounded-xl text-xs space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Products Assigned:</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px]">
                        {col.products_count || 0} Products
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/50 pt-2">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Created:</span>
                      <span className="font-semibold">{formatDate(col.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Updated:</span>
                      <span className="font-semibold">{formatDate(col.updated_at || col.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Operations grid */}
                <div className="space-y-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-850/60">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEditModal(col)}
                      className="py-2 px-2.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Info</span>
                    </button>
                    <button
                      onClick={() => handleOpenManageProducts(col)}
                      className="py-2 px-2.5 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-455 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Layers className="h-3 w-3" />
                      <span>Manage Products</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleToggleVisibility(col)}
                      className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        col.is_active 
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}
                      title={col.is_active ? 'Hide Collection' : 'Show Collection'}
                    >
                      {col.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{col.is_active ? 'Hide' : 'Show'}</span>
                    </button>
                    <button
                      onClick={() => handleOpenPreview(col)}
                      className="py-2 px-1 text-[9px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-650 dark:text-purple-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => openDeleteModal(col)}
                      className="py-2 px-1 text-[9px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD COLLECTION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-850">
              <div className="flex items-center gap-2">
                <span className="text-base">📁</span>
                <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">Add New Collection</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleCreateCollection} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* ROW 1: Name & Slug */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Collection Name</label>
                    <input
                      type="text"
                      required
                      value={collectionForm.name}
                      onChange={(e) => handleNameChange(e, false)}
                      placeholder="e.g. Bridal Specials"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-855 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Slug (Auto-generated)</label>
                    <input
                      type="text"
                      required
                      value={collectionForm.slug}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                      placeholder="slug-url-path"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-slate-855 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* ROW 2: Status & Display Order */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={collectionForm.is_active ? "true" : "false"}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, is_active: e.target.value === "true" }))}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-855 dark:text-slate-100"
                    >
                      <option value="true">Active (Visible)</option>
                      <option value="false">Hidden (Draft)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Display Order</label>
                    <input
                      type="number"
                      required
                      value={collectionForm.display_order}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-855 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* ROW 3: Homepage Visibility */}
                <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <input
                    type="checkbox"
                    id="collection_show_on_homepage"
                    checked={collectionForm.show_on_homepage}
                    onChange={(e) => setCollectionForm({ ...collectionForm, show_on_homepage: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="collection_show_on_homepage" className="block text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                      Homepage Visibility
                    </label>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Show this collection on the homepage featured sections.
                    </span>
                  </div>
                </div>

                {/* ROW 4: Description */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    value={collectionForm.description}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter collection details or description..."
                    rows="2"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-855 dark:text-slate-100"
                  />
                </div>

                {/* ROW 5: Highlights & Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Highlights</label>
                      <span className="text-[9px] text-slate-400">One highlight per line</span>
                    </div>
                    <textarea
                      value={collectionForm.highlights}
                      onChange={(e) => setCollectionForm({ ...collectionForm, highlights: e.target.value })}
                      placeholder="Highlight 1&#10;Highlight 2"
                      rows="3"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-855 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Rules</label>
                      <span className="text-[9px] text-slate-400">One rule per line</span>
                    </div>
                    <textarea
                      value={collectionForm.rules}
                      onChange={(e) => setCollectionForm({ ...collectionForm, rules: e.target.value })}
                      placeholder="Rule 1&#10;Rule 2"
                      rows="3"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-855 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* ROW 6: Collapsible Images Section */}
                <div className="border border-slate-250 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-955/20">
                  <button
                    type="button"
                    onClick={() => setIsAddImagesOpen(!isAddImagesOpen)}
                    className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-250 dark:border-slate-800 font-bold hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all text-xs text-slate-800 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-emerald-500" />
                      <span>Manage Collection Images</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {isAddImagesOpen ? "Collapse ▴" : "Expand ▾"}
                    </span>
                  </button>
                  {isAddImagesOpen && (
                    <div className="p-4 bg-white dark:bg-slate-900">
                      <AdminImageManager 
                        imagesState={collectionImages} 
                        setImagesState={setCollectionImages} 
                        uploadEndpoint={`${API_BASE_URL}/collections/upload`}
                        label="Collection Banner, Thumbnail, and Banners"
                        maxSlots={5}
                        allowCustomSlots={false}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Bottom Action Bar */}
              <div className="flex gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-750 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl font-bold transition-all text-xs shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all text-xs shadow-sm"
                >
                  Save Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COLLECTION MODAL */}
      {isEditModalOpen && selectedCollection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-850">
              <div className="flex items-center gap-2">
                <span className="text-base">📁</span>
                <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">Edit Collection</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleUpdateCollection} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* ROW 1: Name & Slug */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Collection Name</label>
                    <input
                      type="text"
                      required
                      value={collectionForm.name}
                      onChange={(e) => handleNameChange(e, true)}
                      placeholder="e.g. Bridal Specials"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-855 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Slug</label>
                    <input
                      type="text"
                      required
                      value={collectionForm.slug}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                      placeholder="slug-url-path"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-slate-855 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* ROW 2: Status & Display Order */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={collectionForm.is_active ? "true" : "false"}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, is_active: e.target.value === "true" }))}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-855 dark:text-slate-100"
                    >
                      <option value="true">Active (Visible)</option>
                      <option value="false">Hidden (Draft)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Display Order</label>
                    <input
                      type="number"
                      required
                      value={collectionForm.display_order}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-slate-855 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* ROW 3: Homepage Visibility */}
                <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <input
                    type="checkbox"
                    id="edit_collection_show_on_homepage"
                    checked={collectionForm.show_on_homepage}
                    onChange={(e) => setCollectionForm({ ...collectionForm, show_on_homepage: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="edit_collection_show_on_homepage" className="block text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                      Homepage Visibility
                    </label>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Show this collection on the homepage featured sections.
                    </span>
                  </div>
                </div>

                {/* ROW 4: Description */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    value={collectionForm.description}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter collection details or description..."
                    rows="2"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-855 dark:text-slate-100"
                  />
                </div>

                {/* ROW 5: Highlights & Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Highlights</label>
                      <span className="text-[9px] text-slate-400">One highlight per line</span>
                    </div>
                    <textarea
                      value={collectionForm.highlights}
                      onChange={(e) => setCollectionForm({ ...collectionForm, highlights: e.target.value })}
                      placeholder="Highlight 1&#10;Highlight 2"
                      rows="3"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-855 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Rules</label>
                      <span className="text-[9px] text-slate-400">One rule per line</span>
                    </div>
                    <textarea
                      value={collectionForm.rules}
                      onChange={(e) => setCollectionForm({ ...collectionForm, rules: e.target.value })}
                      placeholder="Rule 1&#10;Rule 2"
                      rows="3"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-slate-855 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* ROW 6: Collapsible Images Section */}
                <div className="border border-slate-250 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-955/20">
                  <button
                    type="button"
                    onClick={() => setIsEditImagesOpen(!isEditImagesOpen)}
                    className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-250 dark:border-slate-800 font-bold hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all text-xs text-slate-800 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-emerald-500" />
                      <span>Manage Collection Images</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {isEditImagesOpen ? "Collapse ▴" : "Expand ▾"}
                    </span>
                  </button>
                  {isEditImagesOpen && (
                    <div className="p-4 bg-white dark:bg-slate-900">
                      <AdminImageManager 
                        imagesState={collectionImages} 
                        setImagesState={setCollectionImages} 
                        uploadEndpoint={`${API_BASE_URL}/collections/upload`}
                        label="Collection Banner, Thumbnail, and Banners"
                        maxSlots={5}
                        allowCustomSlots={false}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Bottom Action Bar */}
              <div className="flex gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-750 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl font-bold transition-all text-xs shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all text-xs shadow-sm"
                >
                  Save Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedCollection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100 mb-2 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              <span>Delete Collection?</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Are you sure you want to permanently delete the collection <strong>{selectedCollection.name}</strong>?
            </p>
            <div className="bg-rose-500/10 border border-rose-250/30 rounded-xl p-3 mb-6">
              <p className="text-[10px] text-rose-600 dark:text-rose-450 leading-relaxed font-semibold">
                WARNING: Deleting a collection deletes ONLY the collection record. Products linked to this collection will NOT be deleted from the store.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl font-bold transition-all text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCollection}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all text-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE PRODUCTS MODAL */}
      {isManageProductsOpen && selectedCollection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
            <button 
              onClick={() => setIsManageProductsOpen(false)} 
              className="absolute top-4 right-4 text-slate-455 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="mb-4">
              <h3 className="text-base font-extrabold text-[#D4A75F] flex items-center gap-2">
                <Layers className="h-5 w-5" />
                <span>Manage Collection Products</span>
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
                Collection: <strong>{selectedCollection.name}</strong>
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name or category..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-[#D4A75F] outline-none"
                />
              </div>
              <div className="sm:w-48 relative">
                <Filter className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-[#D4A75F] outline-none appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Split panel */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden min-h-[40vh] max-h-[50vh]">
              {/* Left Side: All Products */}
              <div className="flex flex-col border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/20">
                <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Available Products</span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-650 dark:text-slate-350 font-bold">
                    {getFilteredUnassigned().length} shown
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {getFilteredUnassigned().length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400">No products available.</div>
                  ) : (
                    getFilteredUnassigned().map(p => (
                      <div 
                        key={p.id || p._id} 
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850/80 p-2 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-800/80 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'} 
                            alt="" 
                            className="h-10 w-10 object-cover rounded-lg bg-slate-100 dark:bg-slate-950 flex-shrink-0" 
                          />
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">{p.category}</span>
                            <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">{p.name}</h5>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddProductToWorkingList(p)}
                          className="px-2.5 py-1 bg-emerald-550 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex-shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Products in Collection */}
              <div className="flex flex-col border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/20">
                <div className="bg-[#D4A75F]/10 px-4 py-2 border-b border-[#D4A75F]/20 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">Assigned to Collection</span>
                  <span className="text-[10px] bg-[#D4A75F]/25 px-2 py-0.5 rounded text-slate-750 dark:text-slate-250 font-bold">
                    {getFilteredAssigned().length} Products
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {getFilteredAssigned().length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400">No products assigned yet.</div>
                  ) : (
                    getFilteredAssigned().map(p => (
                      <div 
                        key={p.id || p._id} 
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850/80 p-2 rounded-xl flex items-center justify-between gap-3 hover:border-rose-300 dark:hover:border-rose-800/80 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'} 
                            alt="" 
                            className="h-10 w-10 object-cover rounded-lg bg-slate-100 dark:bg-slate-950 flex-shrink-0" 
                          />
                          <div className="min-w-0">
                            <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">{p.category}</span>
                            <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">{p.name}</h5>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveProductFromWorkingList(p)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setIsManageProductsOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl font-bold transition-all text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProductSync}
                className="flex-1 py-2.5 bg-[#D4A75F] text-[#111827] rounded-xl font-bold transition-all text-xs cursor-pointer hover:bg-[#c39650]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {isPreviewOpen && selectedCollection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 relative flex flex-col max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setIsPreviewOpen(false)} 
              className="absolute top-4 right-4 text-slate-455 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Banner */}
            <div className="h-44 w-full rounded-2xl overflow-hidden relative mb-4 border border-slate-200 dark:border-slate-800 bg-slate-900">
              <img 
                src={selectedCollection.banner_image || 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800'} 
                alt="" 
                className="h-full w-full object-cover opacity-60" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-5 flex flex-col justify-end">
                <span className="text-[10px] font-black text-[#D4A75F] uppercase tracking-wider block">Homepage Collection</span>
                <h3 className="text-lg font-black text-white mt-1">{selectedCollection.name}</h3>
                <span className="text-[11px] text-slate-300 font-mono mt-0.5">/{selectedCollection.slug}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                {selectedCollection.description || 'No description provided.'}
              </p>
            </div>

            {/* Assigned products grid preview */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Curated Products ({previewProducts.length})
              </h4>
              {previewProducts.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                  No products are currently assigned to this collection.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previewProducts.map(p => (
                    <div 
                      key={p.id || p._id} 
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-24 w-full rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-900 border border-slate-150 dark:border-slate-850 mb-2">
                          <img 
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'} 
                            alt="" 
                            className="h-full w-full object-cover" 
                          />
                        </div>
                        <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">{p.category}</span>
                        <h5 className="text-xs font-bold text-slate-850 dark:text-slate-100 truncate mt-0.5" title={p.name}>{p.name}</h5>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-850/50 flex justify-between items-baseline">
                        <span className="text-[9px] text-slate-400 font-medium">Price:</span>
                        <span className="text-xs font-extrabold text-[#D4A75F]">₹{p.price.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-xl font-bold transition-all text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default CollectionManagementTab;
