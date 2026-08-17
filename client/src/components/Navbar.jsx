import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";
import ThemePillToggle from "./ThemePillToggle";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// -------------------------------------------------------------
// Avatar dropdown
// -------------------------------------------------------------
const AvatarMenu = ({ user, logout, navigate, isOwner, setShowHotelReg }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = user?.username?.[0]?.toUpperCase() || "?";

  const items = [
    {
      label: "My Bookings",
      onClick: () => { navigate("/my-bookings"); setOpen(false); },
      icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 opacity-60"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M7 2v4M13 2v4M3 10h14"/></svg>,
    },
    {
      label: isOwner ? "Owner Dashboard" : "List My Property",
      onClick: () => { setOpen(false); isOwner ? navigate("/owner") : setShowHotelReg(true); },
      icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 opacity-60"><path d="M10 2l8 7H2l8-7zM4 9v8h12V9"/><rect x="7" y="13" width="6" height="4"/></svg>,
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <motion.button
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.92 }}
        className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden font-bold text-[11px] text-white flex-shrink-0"
        style={{
          background: "linear-gradient(135deg,#E8003D,#9B001F)",
          boxShadow: open ? "0 0 0 2px rgba(232,0,61,0.55)" : "0 0 0 2px rgba(232,0,61,0)",
          transition: "box-shadow 0.2s",
        }}
      >
        {user.image
          ? <img src={user.image} alt={user.username} className="w-9 h-9 object-cover" referrerPolicy="no-referrer" />
          : initial}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.94 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-11 w-56 rounded-xl z-50 overflow-hidden"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{user.username}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>{user.email}</p>
            </div>
            <div className="py-1.5">
              {items.map((item, i) => (
                <motion.button key={item.label} role="menuitem" onClick={item.onClick}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.06 }}
                  whileHover={{ x: 3, backgroundColor: "var(--color-surface-3)" }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5"
                  style={{ color: "var(--color-text-secondary)", fontFamily: "inherit" }}
                >
                  {item.icon}{item.label}
                </motion.button>
              ))}
              <div className="mx-3 my-1.5" style={{ height: "1px", background: "var(--color-border)" }} />
              <motion.button role="menuitem" onClick={() => { logout(); setOpen(false); }}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.16 }}
                whileHover={{ x: 3 }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5"
                style={{ color: "#F87171", fontFamily: "inherit" }}
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 opacity-70">
                  <path d="M13 3h4v14h-4M8 14l-4-4 4-4M4 10h9"/>
                </svg>
                Sign Out
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// -------------------------------------------------------------
// AI Search dropdown � sends query to /api/ai/parse-search
// then navigates to /rooms with resulting filters
// -------------------------------------------------------------
const AISearchDropdown = ({ onClose, navigate, axios }) => {
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const ref      = useRef(null);

  // auto-focus
  useEffect(() => { inputRef.current?.focus(); }, []);

  // close on outside click
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  // close on Escape
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const run = async () => {
    if (!query.trim()) { navigate("/rooms"); onClose(); return; }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/ai/parse-search", { query });
      if (data.success && data.filters) {
        const p = new URLSearchParams();
        if (data.filters.city)     p.set("destination", data.filters.city);
        if (data.filters.checkIn)  p.set("checkIn",     data.filters.checkIn);
        if (data.filters.checkOut) p.set("checkOut",    data.filters.checkOut);
        if (data.filters.guests)   p.set("guests",      data.filters.guests);
        if (data.filters.maxPrice) p.set("maxPrice",    data.filters.maxPrice);
        navigate("/rooms?" + p.toString());
      } else {
        navigate("/rooms?q=" + encodeURIComponent(query));
      }
    } catch {
      navigate("/rooms?q=" + encodeURIComponent(query));
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const onKey = e => { if (e.key === "Enter") run(); };

  // shadcn-style suggestions
  const chips = [
    "Pet-friendly in Goa under ?4000",
    "Luxury hotel in Mumbai with pool",
    "Budget stay near Delhi airport",
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-1/2 z-[60] w-full"
      style={{
        top: "58px",
        maxWidth: "560px",
        transform: "translateX(-50%)",
        borderRadius: "16px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-strong)",
        boxShadow: "var(--shadow-xl)",
        overflow: "hidden",
      }}
    >
      {/* Search row */}
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
        {/* AI sparkle icon */}
        <motion.span
          animate={{ rotate: [0, 15, -10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-base flex-shrink-0"
          style={{ color: "var(--color-primary)" }}
        >
          ?
        </motion.span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder='Try "pet-friendly hotel in Goa under ?4000 with pool"'
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--color-text-primary)", caretColor: "var(--color-primary)" }}
        />
        {loading ? (
          <span className="w-4 h-4 border-2 rounded-full animate-spin flex-shrink-0"
            style={{ borderColor: "var(--color-border-strong)", borderTopColor: "var(--color-primary)" }} />
        ) : query ? (
          <motion.button onClick={run} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            className="flex items-center justify-center w-7 h-7 rounded-full text-white flex-shrink-0"
            style={{ background: "var(--color-primary)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </motion.button>
        ) : (
          <kbd className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
            style={{ background: "var(--color-surface-3)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
            Esc
          </kbd>
        )}
      </div>

      {/* Filter: All label like shadcn */}
      <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>AI Search</span>
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: "rgba(232,0,61,0.10)", color: "var(--color-primary)", border: "1px solid rgba(232,0,61,0.20)" }}>
          ? Maya
        </span>
      </div>

      {/* Suggestion chips */}
      <div className="px-4 py-3 flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-muted)" }}>
          Try asking
        </p>
        {chips.map((chip, i) => (
          <motion.button key={i} onClick={() => { setQuery(chip); inputRef.current?.focus(); }}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 + 0.05 }}
            whileHover={{ x: 4, backgroundColor: "var(--color-surface-3)" }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            style={{ color: "var(--color-text-secondary)", fontFamily: "inherit" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0 opacity-40">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {chip}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

// -------------------------------------------------------------
// Theme toggle icons (sun + moon separately, like shadcn)
// -------------------------------------------------------------
const ThemeIcons = ({ darkMode, toggleDarkMode }) => (
  <motion.button
    onClick={toggleDarkMode}
    aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    whileHover={{ scale: 1.12 }}
    whileTap={{ scale: 0.88 }}
    className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
    style={{ color: "var(--color-text-secondary)" }}
  >
    <AnimatePresence mode="wait" initial={false}>
      {darkMode ? (
        <motion.svg key="sun" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.18 }}>
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </motion.svg>
      ) : (
        <motion.svg key="moon" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"
          initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
          transition={{ duration: 0.18 }}>
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </motion.svg>
      )}
    </AnimatePresence>
  </motion.button>
);

// thin vertical rule
const Sep = () => (
  <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--color-border-strong)" }} />
);

// Nav link
const NavLink = ({ to, children, active }) => (
  <Link
    to={to}
    aria-current={active ? "page" : undefined}
    className="relative text-sm px-1 py-1 transition-colors duration-150 navbar-nav-link"
    style={{
      color: active ? "#ffffff" : "rgba(255,255,255,0.72)",
      fontFamily: "inherit",
      fontWeight: 550,
      letterSpacing: "0",
    }}
  >
    {children}
    {active && (
      <motion.span layoutId="nav-underline"
        className="absolute -bottom-px left-0 right-0 h-px"
        style={{ background: "#ffffff" }}
        transition={{ type: "spring", stiffness: 500, damping: 38 }}
      />
    )}
  </Link>
);

// Mobile bottom nav
const mobileLinks = [
  { name: "Home",     path: "/",           icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { name: "Hotels",   path: "/rooms",      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg> },
  { name: "Bookings", path: "/my-bookings",icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg> },
];

// -------------------------------------------------------------
// NAVBAR
// -------------------------------------------------------------
const Navbar = () => {
  const location = useLocation();
  const {
    user, darkMode, toggleDarkMode, logout, navigate,
    isOwner, setShowHotelReg, axios,
  } = useAppContext();

  const [scrolled,   setScrolled]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const progressRef  = useRef(null);

  const isActive = p => p === "/" ? location.pathname === "/" : location.pathname.startsWith(p);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Close search on route change
  useEffect(() => { setSearchOpen(false); }, [location.pathname]);

  // Scroll detection
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Ctrl/Cmd + K
  useEffect(() => {
    const fn = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  // GSAP scroll progress bar
  useEffect(() => {
    if (!progressRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(progressRef.current, {
        scaleX: 1, ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top", end: "bottom bottom",
          scrub: 0.3,
        },
      });
    });
    return () => ctx.revert();
  }, []);

  const links = [
    { name: "Home",        path: "/" },
    { name: "Hotels",      path: "/rooms" },
    { name: "My Bookings", path: "/my-bookings" },
  ];

  return (
    <>
      {/* GSAP scroll progress — starts at 0, grows to 100% on scroll */}
      <div className="fixed top-0 left-0 right-0 z-[70] h-[2px] pointer-events-none" aria-hidden>
        <div ref={progressRef} className="h-full origin-left"
          style={{ background: "linear-gradient(90deg,var(--color-primary),var(--color-accent))", transform: "scaleX(0)", willChange: "transform" }} />
      </div>

      {/* -- Desktop navbar -------------------------------- */}
      <motion.header
        aria-label="Main navigation"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`hidden sm:flex fixed top-0 left-0 right-0 z-50 h-[68px] items-center transition-all duration-300 ${
          scrolled ? "navbar-glass-scrolled" : "navbar-glass"
        }`}
      >
        {/* -- Inner row � max width centred ------------ */}
        <div className="flex items-center w-full h-full px-5 lg:px-8 gap-4"
          style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>

          {/* Logo */}
          <a href="/" aria-label="YoYo home" className="flex-shrink-0 mr-2">
            <Logo size="md" darkMode={darkMode} />
          </a>

          {/* Nav links � minimal text, no pill */}
          <nav className="flex items-center gap-5">
            {links.map(l => (
              <NavLink key={l.path} to={l.path} active={isActive(l.path)}>
                {l.name}
              </NavLink>
            ))}
          </nav>

          {/* Flexible space */}
          <div className="flex-1" />

          {/* -- Search pill � shadcn style ------------ */}
          <motion.button
            onClick={() => setSearchOpen(o => !o)}
            aria-label="Open AI search"
            aria-expanded={searchOpen}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm h-9"
            style={{
              background: "var(--color-surface-3)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-muted)",
              fontFamily: "inherit",
              minWidth: "220px",
              transition: "border-color 0.15s, box-shadow 0.15s",
              boxShadow: searchOpen ? "0 0 0 2px rgba(232,0,61,0.22)" : "none",
              borderColor: searchOpen ? "var(--color-primary)" : "var(--color-border-strong)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="flex-1 text-left text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Search hotels...</span>
          </motion.button>

          {/* -- Right cluster ----------------------- */}
          <div className="flex items-center gap-3 ml-2">
            {/* Pill theme toggle */}
            <ThemePillToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

            {/* Sign-in circle or avatar */}
            {user ? (
              <AvatarMenu user={user} logout={logout} navigate={navigate}
                isOwner={isOwner} setShowHotelReg={setShowHotelReg} />
            ) : (
              <motion.div whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}>
                <Link to="/login" state={{ from: location.pathname }} aria-label="Sign in"
                  className="flex items-center justify-center w-9 h-9 rounded-full text-white flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#E8003D,#9B001F)",
                    boxShadow: "0 4px 14px rgba(232,0,61,0.35)",
                  }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </motion.header>

      {/* -- AI Search Dropdown -------------------------- */}
      <AnimatePresence>
        {searchOpen && (
          <AISearchDropdown
            onClose={closeSearch}
            navigate={navigate}
            axios={axios}
          />
        )}
      </AnimatePresence>

      {/* Backdrop blur when search open */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[55]"
            style={{ backdropFilter: "blur(3px)", background: "rgba(0,0,0,0.25)" }}
            onClick={closeSearch}
          />
        )}
      </AnimatePresence>

      {/* -- Mobile bottom nav --------------------------- */}
      <nav aria-label="Mobile navigation" className="sm:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-safe">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-around py-3 px-6 mx-auto rounded-2xl mb-3"
          style={{
            background: "rgba(9,9,11,0.96)",
            backdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.60)",
            paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
          }}
        >
          {mobileLinks.map(l => {
            const active = isActive(l.path);
            return (
              <Link key={l.path} to={l.path}
                aria-current={active ? "page" : undefined}
                aria-label={l.name}
                className="flex flex-col items-center gap-1 min-w-[44px]"
                style={{ color: active ? "#E8003D" : "rgba(255,255,255,0.45)" }}
              >
                <motion.span whileTap={{ scale: 0.82 }}
                  animate={active ? { scale: [1, 1.22, 1] } : {}}
                  transition={{ duration: 0.3 }} className="block">
                  {l.icon}
                </motion.span>
                <span className="text-[10px] font-semibold" style={{ fontFamily: "inherit" }}>{l.name}</span>
                {active && (
                  <motion.div layoutId="mobile-dot" className="w-1 h-1 rounded-full"
                    style={{ background: "#E8003D" }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                )}
              </Link>
            );
          })}
        </motion.div>
      </nav>

    </>
  );
};

export default Navbar;




