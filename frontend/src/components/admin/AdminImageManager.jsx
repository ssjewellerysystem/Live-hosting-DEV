import React, { useState } from 'react';
import axios from 'axios';
import { Upload, X, Package, Plus } from 'lucide-react';
import { API_BASE_URL, SERVER_BASE_URL } from '../../context/AuthContext';

export const AdminImageManager = ({ 
  imagesState, 
  setImagesState, 
  uploadEndpoint = `${API_BASE_URL}/products/upload`,
  label = "Collection Images",
  maxSlots = 5,
  allowCustomSlots = false
}) => {
  const [uploadingSlots, setUploadingSlots] = useState({});
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const addAdditionalSlot = () => {
    if (imagesState.length >= maxSlots) {
      alert(`Maximum ${maxSlots} images allowed.`);
      return;
    }
    const additionalCount = imagesState.filter(s => s.slot.startsWith('Additional')).length + 1;
    setImagesState([
      ...imagesState,
      {
        slot: `Additional Image ${additionalCount}`,
        url: '',
        required: false,
        key: `additional_${Date.now()}_${additionalCount}`
      }
    ]);
  };

  const removeSlot = (index) => {
    // If it's a fixed slot (first 5 for products/collections), just clear the URL, don't remove the slot
    const isFixed = index < 5 && !allowCustomSlots;
    if (isFixed) {
      setImagesState(prev => {
        const next = [...prev];
        next[index] = { ...next[index], url: '' };
        return next;
      });
    } else {
      setImagesState(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSlotUrl = (index, url) => {
    setImagesState(prev => {
      const next = [...prev];
      next[index] = { ...next[index], url };
      return next;
    });
  };

  const swapSlots = (index1, index2) => {
    // Prevent swapping the first slot if required (identical to the original logic)
    if (index1 === 0 || index2 === 0) return;
    setImagesState(prev => {
      const next = [...prev];
      const tempUrl = next[index1].url;
      next[index1].url = next[index2].url;
      next[index2].url = tempUrl;
      return next;
    });
  };

  const performUpload = async (file, index) => {
    if (!file) return;
    setUploadingSlots(prev => ({ ...prev, [index]: true }));
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const res = await axios.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      let finalUrl = res.data.url;
      if (finalUrl.startsWith('/static/')) {
        finalUrl = `${SERVER_BASE_URL}${finalUrl}`;
      }

      setImagesState(prev => {
        const next = [...prev];
        next[index] = { ...next[index], url: finalUrl };
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("Failed to upload image. Check server upload folder permissions or Cloudinary credentials.");
    } finally {
      setUploadingSlots(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSlotImageUpload = async (e, index) => {
    const file = e.target.files[0];
    await performUpload(file, index);
  };

  const handleDrop = async (e, index) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await performUpload(file, index);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-1">
        <label className="block text-xs font-semibold text-slate-400">{label}</label>
        {allowCustomSlots && imagesState.length < maxSlots && (
          <button
            type="button"
            onClick={addAdditionalSlot}
            className="text-[10px] font-black text-emerald-500 hover:text-emerald-600 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add Additional Image</span>
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {imagesState.map((slotItem, index) => {
          const hasUrl = slotItem.url !== '';
          const isUploading = uploadingSlots[index];
          const isDragOver = dragOverIndex === index;
          
          return (
            <div 
              key={slotItem.key || index} 
              className={`p-2.5 border rounded-xl flex items-center justify-between gap-3 text-xs transition-all ${
                isDragOver 
                  ? 'border-[#D4A75F] bg-[#D4A75F]/5 scale-[1.01]' 
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="flex items-center gap-2.5 flex-grow min-w-0">
                {/* Image Preview Card */}
                <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden relative group">
                  {hasUrl ? (
                    <>
                      <img src={slotItem.url} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold uppercase">Ready</span>
                      </div>
                    </>
                  ) : (
                    <Package className="h-4 w-4 text-slate-350" />
                  )}
                </div>

                <div className="flex-grow min-w-0 space-y-1">
                  <span className="font-bold text-[10px] text-slate-455 dark:text-slate-400 block truncate">{slotItem.slot}</span>
                  <input
                    type="text"
                    placeholder="Image URL or upload/drop file"
                    value={slotItem.url}
                    onChange={(e) => updateSlotUrl(index, e.target.value)}
                    className="w-full px-2.5 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg focus:outline-none text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-[#D4A75F]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <label className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-lg cursor-pointer flex items-center justify-center shadow-sm border border-slate-200/50 dark:border-slate-700 transition-colors">
                  {isUploading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border border-t-transparent border-slate-500" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSlotImageUpload(e, index)}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>

                {hasUrl && (
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 bg-transparent rounded-lg border border-transparent hover:border-slate-200/40 transition-colors"
                    title="Remove Image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {index > 0 && allowCustomSlots && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => swapSlots(index, index - 1)}
                      disabled={index === 1}
                      className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 text-[10px]`}
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => swapSlots(index, index + 1)}
                      disabled={index === imagesState.length - 1}
                      className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 text-[10px]`}
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminImageManager;
