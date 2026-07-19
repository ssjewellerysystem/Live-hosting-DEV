import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { ShieldAlert } from 'lucide-react';

export const AuthContext = createContext();

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  return 'https://ssjewellery-main.onrender.com/api';
};

export const API_BASE_URL = getApiBaseUrl();
export const SERVER_BASE_URL = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const logoutRef = useRef(null);
  const [token, setToken] = useState(null);
  const [loginType, setLoginType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("The website is temporarily under maintenance. Please try again later.");
  const [showMaintenanceWarning, setShowMaintenanceWarning] = useState(false);

  const checkMaintenanceStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/maintenance/status`);
      setMaintenanceMode(res.data.maintenance_mode);
      setMaintenanceMessage(res.data.maintenance_message || "The website is temporarily under maintenance. Please try again later.");
    } catch (err) {
      console.error("Failed to check maintenance status", err);
    }
  }, []);

  useEffect(() => {
    checkMaintenanceStatus();
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, [checkMaintenanceStatus]);
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('bb_lang') || 'en';
  });

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('bb_lang', lang);
    axios.defaults.headers.common['Accept-Language'] = lang;
  };

  const savePreferredLanguage = async (lang) => {
    setLanguage(lang);
    localStorage.setItem('bb_lang', lang);
    axios.defaults.headers.common['Accept-Language'] = lang;

    const activeToken = localStorage.getItem('bb_token') || localStorage.getItem('token');
    if (activeToken) {
      try {
        const response = await axios.put(`${API_BASE_URL}/auth/preferred-language`, 
          { preferred_language: lang },
          { headers: { 'Authorization': `Bearer ${activeToken}` } }
        );
        const updatedUser = response.data.user || { ...user, preferred_language: lang, first_login: false };
        setUser(updatedUser);
        localStorage.setItem('bb_user', JSON.stringify(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (err) {
        console.error("Failed to save preferred language on backend:", err);
        throw err;
      }
    }
  };

  useEffect(() => {
    axios.defaults.headers.common['Accept-Language'] = language;
  }, [language]);

  // Sync with localStorage on load
  useEffect(() => {
    const savedToken = localStorage.getItem('bb_token') || localStorage.getItem('token');
    const savedUser = localStorage.getItem('bb_user') || localStorage.getItem('user');
    const savedLoginType = localStorage.getItem('bb_login_type') || localStorage.getItem('login_type');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (err) {
        console.error("Failed to parse saved user in AuthContext:", err);
      }
      setLoginType(savedLoginType);
      
      // Configure default axios Authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, []);

  // Globally intercept 401 Unauthorized errors to clean up stale sessions
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const hasToken = localStorage.getItem('bb_token') || localStorage.getItem('token');
          if (hasToken && logoutRef.current) {
            logoutRef.current();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const syncLanguageOnLogin = (userData) => {
    if (userData && userData.preferred_language) {
      localStorage.setItem('bb_lang', userData.preferred_language);
      setLanguage(userData.preferred_language);
      axios.defaults.headers.common['Accept-Language'] = userData.preferred_language;
    }
  };

  const userLogin = async (name, mobile) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/user-login`, { name, mobile });
      const { user: userData, token: userToken } = response.data;
      
      setUser(userData);
      setToken(userToken);
      syncLanguageOnLogin(userData);
      const determinedLoginType = userData.is_admin ? 'admin' : 'user';
      setLoginType(determinedLoginType);
      localStorage.setItem('bb_token', userToken);
      localStorage.setItem('token', userToken);
      localStorage.setItem('bb_user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('bb_login_type', determinedLoginType);
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      return true;
    } catch (err) {
      console.error("User login failed:", err.message);
      throw err;
    }
  };

  const microsoftLogin = async (accessToken) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/microsoft-login`, { accessToken });
      const { user: userData, token: userToken } = response.data;
      
      setUser(userData);
      setToken(userToken);
      syncLanguageOnLogin(userData);
      const determinedLoginType = userData.is_admin ? 'admin' : 'user';
      setLoginType(determinedLoginType);
      localStorage.setItem('bb_token', userToken);
      localStorage.setItem('token', userToken);
      localStorage.setItem('bb_user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('bb_login_type', determinedLoginType);
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      return true;
    } catch (err) {
      console.error("Microsoft login failed:", err.message);
      throw err;
    }
  };

  const oauthLogin = (userToken, userData) => {
    setUser(userData);
    setToken(userToken);
    syncLanguageOnLogin(userData);
    const determinedLoginType = userData.is_admin ? 'admin' : 'user';
    setLoginType(determinedLoginType);
    localStorage.setItem('bb_token', userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('bb_user', JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('bb_login_type', determinedLoginType);
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
  };

  const adminLogin = async (adminId, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, { admin_id: adminId, password });
      const { user: userData, token: userToken } = response.data;
      
      setUser(userData);
      setToken(userToken);
      setLoginType('admin');
      localStorage.setItem('bb_token', userToken);
      localStorage.setItem('token', userToken);
      localStorage.setItem('bb_user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('bb_login_type', 'admin');
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      return true;
    } catch (err) {
      console.error("Admin login failed:", err.message);
      return false;
    }
  };

  const login = async (email, password) => {
    // Keep login mapping to adminLogin for backward compatibility if needed
    return adminLogin(email, password);
  };

  const logout = useCallback(() => {
    if (user?.is_admin && (token || localStorage.getItem('token') || localStorage.getItem('bb_token'))) {
      const activeToken = token || localStorage.getItem('token') || localStorage.getItem('bb_token');
      axios.post(`${API_BASE_URL}/admin/logout`, {}, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      }).catch(err => console.error("Failed to log out admin session on server:", err));
    }
    setUser(null);
    setToken(null);
    setLoginType(null);
    localStorage.removeItem('bb_token');
    localStorage.removeItem('token');
    localStorage.removeItem('bb_user');
    localStorage.removeItem('user');
    localStorage.removeItem('bb_login_type');
    delete axios.defaults.headers.common['Authorization'];
  }, [user, token]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const checkoutLogin = async (shippingDetails) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/checkout-login`, {
        name: shippingDetails.name,
        phone: shippingDetails.phone,
        email: shippingDetails.email,
        address: {
          house_number: shippingDetails.house_number,
          building_name: shippingDetails.building_name,
          address: shippingDetails.address,
          street: shippingDetails.street,
          area: shippingDetails.area,
          landmark: shippingDetails.landmark,
          city: shippingDetails.city,
          state: shippingDetails.state,
          pincode: shippingDetails.pincode,
          address_type: shippingDetails.address_type || 'Home'
        }
      });
      const { user: userData, token: userToken } = response.data;
      
      setUser(userData);
      setToken(userToken);
      syncLanguageOnLogin(userData);
      const determinedLoginType = userData.is_admin ? 'admin' : 'user';
      setLoginType(determinedLoginType);
      localStorage.setItem('bb_token', userToken);
      localStorage.setItem('token', userToken);
      localStorage.setItem('bb_user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('bb_login_type', determinedLoginType);
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      return true;
    } catch (err) {
      console.error("Checkout auto-login failed:", err.message);
      return false;
    }
  };

  const updateUser = (updatedUserData) => {
    const freshUser = { ...user, ...updatedUserData };
    setUser(freshUser);
    localStorage.setItem('bb_user', JSON.stringify(freshUser));
    localStorage.setItem('user', JSON.stringify(freshUser));
  };

  const isAdmin = !!(user?.is_admin);
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, token, login, userLogin, microsoftLogin, oauthLogin, checkoutLogin, adminLogin, logout, updateUser, loading, isAdmin, isAuthenticated, language, changeLanguage, savePreferredLanguage, maintenanceMode, maintenanceMessage, checkMaintenanceStatus, showMaintenanceWarning, setShowMaintenanceWarning }}>
      {!loading && children}
      {showMaintenanceWarning && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transform scale-100 transition-all duration-300 text-center">
            <div className="flex flex-col items-center mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 mb-3">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Website Under Maintenance</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-semibold">
              {maintenanceMessage || "We are performing scheduled maintenance. Ordering is temporarily unavailable. Please try again shortly."}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowMaintenanceWarning(false);
                window.location.href = '/';
              }}
              className="w-full py-2.5 bg-[#D4A75F] hover:bg-[#c39650] text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-[0_4px_12px_rgba(212,167,95,0.25)]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
