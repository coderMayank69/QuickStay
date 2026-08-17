import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import StarRating from "../components/StarRating";
import HotelCard from "../components/HotelCard";
import SkeletonCard from "../components/SkeletonCard";
import { useAppContext } from "../context/AppContext";
import { ROOM_TYPES, PRICE_RANGES, CATEGORIES, SORT_OPTIONS, matchesPrice } from "../constants/filters";
import toast from "react-hot-toast";

// ── Indian cities autocomplete ────────────────────────────
const CITIES = [
  "Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Jaipur",
  "Goa","Shimla","Manali","Udaipur","Agra","Varanasi","Kochi","Mysore",
  "Ooty","Coorg","Rishikesh","Mussoorie","Darjeeling","Gulmarg","Amritsar",
  "Jodhpur","Ahmedabad","Surat","Chandigarh","Bhopal","Indore","Lucknow",
];

const today = new Date().toISOString().split("T")[0];

const STAR_FILTERS = [5, 4, 3];

// ── Checkbox ─────────────────────────────────────────────
const CheckBox = ({ label, selected, onChange }) => (
  <motion.label
    className="flex items-center gap-2.5 cursor-pointer mt-1.5 text-sm"
    whileHover={{ x: 3 }}
    transition={{ duration: 0.15 }}
  >
    <motion.span
      className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors"
      style={{ background: selected ? "var(--color-primary)" : "transparent", borderColor: selected ? "var(--color-primary)" : "var(--color-border-strong)" }}
      animate={selected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      {selected && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
    </motion.span>
    <input type="checkbox" className="sr-only" checked={selected} onChange={e => onChange(e.target.checked, label)} />
    <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
  </motion.label>
);

// ── Radio ─────────────────────────────────────────────────
const RadioButton = ({ label, selected, onChange }) => (
  <motion.label
    className="flex items-center gap-2.5 cursor-pointer mt-1.5 text-sm"
    whileHover={{ x: 3 }}
    transition={{ duration: 0.15 }}
  >
    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors"
      style={{ borderColor: selected ? "var(--color-primary)" : "var(--color-border-strong)" }}>
      {selected && <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-primary)" }} />}
    </span>
    <input type="radio" className="sr-only" checked={selected} onChange={() => onChange(label)} />
    <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
  </motion.label>
);

// ── Filter Panel ─────────────────────────────────────────
const FilterPanel = ({ filters, setFilters, selectedSort, setSelectedSort, onClear }) => {
  const toggle = (key) => (checked, value) =>
    setFilters(p => ({ ...p, [key]: checked ? [...p[key], value] : p[key].filter(v => v !== value) }));

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-8 w-full lg:w-72 shrink-0"
      style={{ background: "var(--color-surface-2)", boxShadow: "var(--shadow-md)" }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>Filters</h2>
        <motion.button
          onClick={onClear}
          className="text-xs font-semibold"
          style={{ color: "var(--color-primary)" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >Clear all</motion.button>
      </div>

      {/* Star rating */}
      <div className="mb-6">
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-primary)" }}>Star Rating</p>
        {STAR_FILTERS.map(s => (
          <CheckBox key={s} label={`${"★".repeat(s)} & above`} selected={filters.stars.includes(s)} onChange={toggle("stars")} />
        ))}
      </div>

      {/* Category */}
      <div className="mb-5">
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-primary)" }}>Category</p>
        {CATEGORIES.map(cat => (
          <CheckBox key={cat} label={cat} selected={filters.category.includes(cat)} onChange={toggle("category")} />
        ))}
      </div>

      {/* Room type */}
      <div className="mb-5">
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-primary)" }}>Room Type</p>
        {ROOM_TYPES.map(r => (
          <CheckBox key={r} label={r} selected={filters.roomType.includes(r)} onChange={toggle("roomType")} />
        ))}
      </div>

      {/* Price range */}
      <div className="mb-5">
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-primary)" }}>Price Range</p>
        {PRICE_RANGES.map(range => (
          <CheckBox key={range} label={range} selected={filters.priceRange.includes(range)} onChange={toggle("priceRange")} />
        ))}
      </div>

      {/* Sort */}
      <div>
        <p className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-primary)" }}>Sort By</p>
        {SORT_OPTIONS.map(opt => (
          <RadioButton key={opt} label={opt} selected={selectedSort === opt} onChange={setSelectedSort} />
        ))}
      </div>
    </motion.div>
  );
};



// ── Main Page ─────────────────────────────────────────────
const AllRooms = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { rooms, roomsLoaded, axios } = useAppContext();
  const navigate = useNavigate();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("");
  const [filters, setFilters] = useState({ roomType: [], priceRange: [], category: [], stars: [] });

  // URL-driven search params
  const [cityInput,     setCityInput]     = useState(searchParams.get("destination") || "");
  const [checkInDate,   setCheckInDate]   = useState(searchParams.get("checkIn")     || "");
  const [checkOutDate,  setCheckOutDate]  = useState(searchParams.get("checkOut")    || "");
  const [guestCount,    setGuestCount]    = useState(Number(searchParams.get("guests")) || 1);

  // NLP search state
  const [nlpQuery,   setNlpQuery]   = useState("");
  const [nlpLoading, setNlpLoading] = useState(false);

  // ── AI NLP parse-search ──────────────────────────────────────
  const parseNLP = async () => {
    if (!nlpQuery.trim()) return;
    setNlpLoading(true);
    try {
      const { data } = await axios.post(`/api/ai/parse-search`, { query: nlpQuery });
      if (data.success && data.filters) {
        const f = data.filters;
        if (f.city) { setCityInput(f.city); handleSearch(f.city); }
        setFilters(prev => ({
          ...prev,
          roomType:   f.roomType   ? [f.roomType]   : prev.roomType,
          category:   f.category   ? [f.category]   : prev.category,
          priceRange: f.maxPrice   ? [`Under ₹${f.maxPrice}`] : prev.priceRange,
        }));
        toast.success('✨ Filters applied from AI search!');
      } else {
        toast.error(data.message || 'AI search could not parse your query');
      }
    } catch (err) {
      toast.error('AI search failed — try again or use manual filters');
      console.error('[AI Search]', err.message);
    }
    finally { setNlpLoading(false); }
  };

  const destination = searchParams.get("destination") || "";

  const handleSearch = (city) => {
    const dest = typeof city === "string" ? city : cityInput;
    const params = {};
    if (dest)         params.destination = dest;
    if (checkInDate)  params.checkIn     = checkInDate;
    if (checkOutDate) params.checkOut    = checkOutDate;
    if (guestCount > 1) params.guests   = guestCount;
    setSearchParams(params);
  };

  const filteredRooms = useMemo(() => {
    return rooms
      .filter(room => {
        const matchType     = !filters.roomType.length   || filters.roomType.includes(room.roomType);
        const matchPrice    = matchesPrice(room, filters.priceRange);
        const matchCategory = !filters.category.length  || filters.category.includes(room.category);
        const matchDest     = !destination               || room.hotel?.city?.toLowerCase().includes(destination.toLowerCase());
        const avgRating     = room.avgRating ?? 4;
        const matchStars    = !filters.stars.length      || filters.stars.some(s => avgRating >= s);
        return matchType && matchPrice && matchCategory && matchDest && matchStars;
      })
      .sort((a, b) => {
        if (selectedSort === "Price: Low to High")  return a.pricePerNight - b.pricePerNight;
        if (selectedSort === "Price: High to Low")  return b.pricePerNight - a.pricePerNight;
        if (selectedSort === "Top Rated")           return (b.avgRating ?? 4) - (a.avgRating ?? 4);
        if (selectedSort === "Newest First")        return new Date(b.createdAt) - new Date(a.createdAt);
        return 0;
      });
  }, [rooms, filters, selectedSort, destination]);

  const clearFilters = () => {
    setFilters({ roomType: [], priceRange: [], category: [], stars: [] });
    setSelectedSort("");
    setSearchParams({});
    setCityInput("");
    setCheckInDate("");
    setCheckOutDate("");
    setGuestCount(1);
  };

  // roomsLoaded: true once the API call finishes (even if rooms array is empty)
  // Using roomsLoaded prevents showing skeleton cards when filters return 0 results
  const isLoading = !roomsLoaded;
  const activeFilterCount = filters.roomType.length + filters.priceRange.length + filters.category.length + filters.stars.length;

  return (
    <main
      id="main-content"
      className="min-h-screen pt-28 md:pt-36 pb-24 px-4 md:px-16 lg:px-24 xl:px-32"
      style={{ background: "var(--color-surface)" }}
    >
      <Helmet>
        <title>{destination ? `Hotels in ${destination}` : "Browse All Hotels"} — YoYo Rooms</title>
        <meta name="description" content={`Find and book the best hotels${destination ? ` in ${destination}` : ""} at affordable prices on YoYo Rooms.`} />
      </Helmet>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-primary)" }}>
          {destination ? `Results for "${destination}"` : "All Hotels"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
          {destination ? `Hotels in ${destination}` : "Browse All Hotels"}
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {isLoading ? "Loading…" : `${filteredRooms.length} propert${filteredRooms.length === 1 ? "y" : "ies"} found`}
        </p>
      </motion.div>

      {/* ── AI NLP Smart Search ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-4 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center"
        style={{ background: "linear-gradient(135deg, rgba(232,0,61,0.06) 0%, rgba(124,58,237,0.06) 100%)", border: "1px solid rgba(232,0,61,0.15)" }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🤖</span>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>AI Search</span>
        </div>
        <input
          value={nlpQuery}
          onChange={e => setNlpQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && parseNLP()}
          placeholder='Try: "pet-friendly hotel in Goa under ₹4000 with pool"'
          className="flex-1 rounded-xl px-4 py-2.5 text-sm border outline-none w-full"
          style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
        />
        <button
          onClick={parseNLP}
          disabled={nlpLoading || !nlpQuery.trim()}
          className="btn-primary px-5 py-2.5 text-sm shrink-0 disabled:opacity-50 flex items-center gap-2"
        >
          {nlpLoading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Parsing…</>
          ) : "✨ Smart Filter"}
        </button>
      </motion.div>


      {/* Mobile filter toggle */}
      <div className="flex items-center gap-3 mb-5 lg:hidden">
        <button onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors duration-200"
          style={{
            borderColor: "var(--color-primary)", color: "var(--color-primary)",
            background: mobileFilterOpen ? "var(--color-primary-light)" : "transparent",
          }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs text-white" style={{ background: "var(--color-primary)" }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        {selectedSort && (
          <span className="text-xs px-3 py-1 rounded-full"
            style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
            {selectedSort}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* Desktop filter */}
        <div className="lg:sticky lg:top-28 hidden lg:block">
          <FilterPanel filters={filters} setFilters={setFilters} selectedSort={selectedSort} setSelectedSort={setSelectedSort} onClear={clearFilters} />
        </div>

        {/* Mobile filter */}
        <AnimatePresence>
          {mobileFilterOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="w-full overflow-hidden lg:hidden">
              <FilterPanel filters={filters} setFilters={setFilters} selectedSort={selectedSort} setSelectedSort={setSelectedSort} onClear={clearFilters} mobileOpen />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        <div className="flex-1 w-full">
          {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredRooms.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 flex flex-col items-center gap-4">
              <span className="text-5xl">🔍</span>
              <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>No properties found</p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Try a different city or adjust your filters</p>
              <button onClick={clearFilters} className="btn-primary mt-2">Clear All Filters</button>
            </motion.div>
          ) : (
            <motion.div initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-7">
              {filteredRooms.map((room, i) => <HotelCard key={room._id} room={room} index={i} />)}
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
};

export default AllRooms;
