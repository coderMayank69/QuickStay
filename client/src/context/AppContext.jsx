import axios from "axios";
import { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const AppContext = createContext();

const TOKEN_KEY      = 'yoyo_token';
const USER_KEY       = 'yoyo_user';
// Stores Unix timestamp (ms) of when the session was issued.
// Used for the 6-hour hard-logout timer — independent of JWT expiry.
const SESSION_TS_KEY = 'yoyo_session_ts';

// Session hard-expires after 6 hours regardless of token/cookie state.
const SESSION_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

// Auth-failure messages from the protect middleware — used by the interceptor
const AUTH_ERRORS = new Set([
  'Not authenticated',
  'User not found',
  'Invalid or expired token',
  'Token expired',
]);

export const AppProvider = ({ children }) => {
  const currency = import.meta.env.VITE_CURRENCY || "₹";
  const navigate  = useNavigate();

  // ── Auth state ──────────────────────────────────────────────
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);

  // Derived from user.role — no separate state needed
  const isOwner = user?.role === 'hotelOwner';
  const isAdmin = user?.role === 'admin';

  const [showHotelReg,   setShowHotelReg]  = useState(false);
  const [searchedCities, setSearchedCities] = useState([]);
  const [rooms,          setRooms]         = useState([]);
  const [roomsLoaded,    setRoomsLoaded]   = useState(false);
  const [wishlist,       setWishlist]      = useState([]);

  // ── Reusable session-clear helper ──────────────────────────
  const clearSession = useCallback((showToast = false) => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_TS_KEY);
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    if (showToast) {
      toast('Your session has expired. Please sign in again.', {
        icon: '🔒',
        duration: 4000,
        style: { fontWeight: '500' },
      });
    }
  }, []);

  // ── 6-hour hard-logout timer ─────────────────────────────────
  // Checks on mount AND whenever `token` changes.
  // If the session is already older than 6h on load, clears immediately.
  // Otherwise schedules a timeout for the remaining time.
  const sessionTimerRef = useRef(null);

  useEffect(() => {
    // Clear any previous timer
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);

    if (!token) return; // No session — nothing to do

    const issuedAt = parseInt(localStorage.getItem(SESSION_TS_KEY) || '0', 10);
    if (!issuedAt) {
      // Legacy session with no timestamp — treat as expired
      clearSession(true);
      navigate('/login', { replace: true });
      return;
    }

    const elapsed   = Date.now() - issuedAt;
    const remaining = SESSION_DURATION_MS - elapsed;

    if (remaining <= 0) {
      // Already expired — clear immediately
      clearSession(true);
      navigate('/login', { replace: true });
      return;
    }

    // Schedule hard logout at the exact remaining time
    sessionTimerRef.current = setTimeout(() => {
      clearSession(true);
      navigate('/login', { replace: true });
    }, remaining);

    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    };
  }, [token, clearSession, navigate]);

  // ── Axios auth header ───────────────────────────────────────
  useEffect(() => {
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else delete axios.defaults.headers.common['Authorization'];
  }, [token]);

  // ── Global interceptor — auto-clear stale sessions ──────────
  // Clears the session when any authenticated request returns an auth-failure.
  // Skips responses where the request was already aborted (signal.aborted=true)
  // so that stale sync requests can't wipe a freshly-set session.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => {
        const d = response.data;
        const hadAuth   = !!response.config?.headers?.Authorization;
        const wasAborted = response.config?.signal?.aborted === true;
        if (hadAuth && !wasAborted && d && d.success === false && AUTH_ERRORS.has(d.message)) {
          console.warn('[Auth] Interceptor: stale session detected —', d.message);
          clearSession(true);
          navigate('/login', { replace: true });
        }
        return response;
      },
      (error) => Promise.reject(error)
    );
    return () => axios.interceptors.response.eject(id);
  }, [clearSession, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dark mode ───────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("yoyo-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) { root.classList.add("dark");    localStorage.setItem("yoyo-theme", "dark"); }
    else          { root.classList.remove("dark"); localStorage.setItem("yoyo-theme", "light"); }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);

  // ── Auth helpers ─────────────────────────────────────────────
  const saveSession = useCallback((newToken, newUser) => {
    const issuedAt = Date.now();
    localStorage.setItem(TOKEN_KEY,      newToken);
    localStorage.setItem(USER_KEY,       JSON.stringify(newUser));
    localStorage.setItem(SESSION_TS_KEY, String(issuedAt));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const getToken = useCallback(async () => token, [token]);

  const register = async (username, email, password) => {
    const { data } = await axios.post('/api/auth/register', { username, email, password });
    if (data.success) { saveSession(data.token, data.user); return data; }
    throw new Error(data.message);
  };

  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    if (data.success) { saveSession(data.token, data.user); return data; }
    throw new Error(data.message);
  };

  const googleLogin = async (credential, prefetchedData = null) => {
    if (prefetchedData) { saveSession(prefetchedData.token, prefetchedData.user); return prefetchedData; }
    const { data } = await axios.post('/api/auth/google', { credential });
    if (data.success) { saveSession(data.token, data.user); return data; }
    throw new Error(data.message);
  };

  const logout = useCallback(() => {
    // Also call the server logout so the refresh cookie is cleared
    axios.post('/api/auth/logout').catch(() => {}); // fire-and-forget, don't block
    clearSession();
    setWishlist([]);
    navigate('/');
    toast.success('Signed out successfully');
  }, [clearSession, navigate]);

  // ── Update user in memory (after profile edit) ───────────────
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Sync user data from server ───────────────────────────────
  // Uses AbortController to cancel stale requests when token changes.
  // signal.aborted is checked BEFORE clearSession() is called because
  // on localhost the server responds in ~5 ms — faster than React's
  // cleanup cycle — so the abort fires AFTER the response arrives.
  // Reading signal.aborted at that point is still true, so we discard it.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    (async () => {
      try {
        const { data } = await axios.get('/api/user', { signal: controller.signal });

        // If abort was requested (even after the response arrived), this is a
        // stale response for a superseded token — ignore it completely.
        if (controller.signal.aborted) {
          console.log('[Auth] syncUser: ignoring late response for aborted (stale) request');
          return;
        }

        if (data.success) {
          console.log('[Auth] syncUser: success, role=', data.role, '_id=', data._id);
          setSearchedCities(data.recentSearchedCities || []);
          setWishlist(data.wishlist?.map(id => id.toString()) || []);
          // Build a complete user object from the server response.
          // If prev is null (e.g. USER_KEY was cleared but TOKEN_KEY survived),
          // reconstruct from server data instead of silently keeping null.
          setUser(prev => {
            const updated = {
              ...(prev || {}),
              _id:      data._id,
              username: data.username,
              email:    data.email,
              image:    data.image,
              role:     data.role,
            };
            localStorage.setItem(USER_KEY, JSON.stringify(updated));
            return updated;
          });
        } else {
          const isAuthFailure = AUTH_ERRORS.has(data.message);
          console.warn('[Auth] syncUser:', data.message,
            isAuthFailure ? '→ clearing session' : '→ keeping session (not an auth error)');
          if (isAuthFailure) clearSession(true);
        }
      } catch (err) {
        if (axios.isCancel(err)) return; // Cleanly aborted — ignore
        console.warn('[Auth] syncUser: network error, keeping session —', err.message);
      }
    })();

    return () => controller.abort();
  }, [token, clearSession]);

  // ── Wishlist toggle ──────────────────────────────────────────
  const toggleWishlist = useCallback(async (roomId) => {
    if (!token) { toast.error('Please login to save rooms'); navigate('/login', { state: { from: window.location.pathname } }); return; }
    try {
      const { data } = await axios.post(`/api/user/wishlist/${roomId}`);
      if (data.success) {
        setWishlist(data.wishlist.map(id => id.toString()));
        toast.success(data.added ? '❤️ Saved to wishlist' : 'Removed from wishlist');
      }
    } catch { toast.error('Failed to update wishlist'); }
  }, [token, navigate]);

  // ── Rooms ───────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/rooms');
      if (data.success) setRooms(data.rooms);
      else toast.error(data.message);
    } catch (err) { toast.error(err.message); }
    finally { setRoomsLoaded(true); }
  }, []);

  useEffect(() => { fetchRooms(); }, []);

  const value = {
    currency, navigate,
    user, token, getToken, axios,
    isOwner, isAdmin,
    login, logout, register, googleLogin,
    saveSession, updateUser, clearSession,
    showHotelReg, setShowHotelReg,
    searchedCities, setSearchedCities,
    rooms, setRooms, fetchRooms, roomsLoaded,
    wishlist, toggleWishlist,
    darkMode, toggleDarkMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);