import React, { useState } from 'react';
import { assets, cities } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const HotelReg = () => {
  const { setShowHotelReg, axios, getToken, setIsOwner } = useAppContext();

  const [name,    setName]    = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [city,    setCity]    = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(
        '/api/hotels',
        { name, contact, address, city },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      if (data?.success) {
        toast.success(data.message || 'Hotel registered successfully');
        setIsOwner(true);
        setShowHotelReg(false);
      } else {
        toast.error(data?.message || 'Registration failed');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:ring-2';
  const inputStyle = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color:       'var(--color-text-primary)',
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowHotelReg(false)}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      >
        <motion.form
          onSubmit={onSubmitHandler}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex w-full max-w-3xl overflow-hidden rounded-2xl"
          style={{ background: 'var(--color-surface-2)', boxShadow: 'var(--shadow-xl)' }}
        >
          {/* Left image panel */}
          <div className="hidden md:block w-5/12 shrink-0 relative overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80&auto=format&fit=crop"
              alt="Register Hotel"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="font-display font-extrabold text-2xl text-white">Yo</span>
                <span className="font-display font-extrabold text-2xl px-2 py-0.5 rounded-lg" style={{ background: '#E8003D', color: 'white' }}>Yo</span>
              </div>
              <p className="text-white/80 text-sm">Join 5,000+ property owners across India earning with YoYo Rooms.</p>
            </div>
          </div>

          {/* Right form panel */}
          <div className="relative flex flex-col flex-1 p-7 md:p-8">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowHotelReg(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-secondary)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#E8003D' }}>Hotel Owner</p>
              <h2 className="font-display text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                Register Your Property
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                List your hotel and start accepting bookings today.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Hotel Name *
                </label>
                <input id="name" type="text" placeholder="e.g. The Grand Palace Udaipur"
                  value={name} onChange={(e) => setName(e.target.value)}
                  className={inputCls} style={inputStyle} required />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Phone / WhatsApp *
                </label>
                <input id="contact" type="tel" placeholder="+91 98765 43210"
                  value={contact} onChange={(e) => setContact(e.target.value)}
                  className={inputCls} style={inputStyle} required />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Full Address *
                </label>
                <input id="address" type="text" placeholder="Street, Area, Pincode"
                  value={address} onChange={(e) => setAddress(e.target.value)}
                  className={inputCls} style={inputStyle} required />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  City *
                </label>
                <select id="city" value={city} onChange={(e) => setCity(e.target.value)}
                  className={inputCls} style={inputStyle} required>
                  <option value="">Select City</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#E8003D 0%,#C0002E 100%)', boxShadow: '0 6px 20px rgba(232,0,61,0.40)' }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Registering…
                </>
              ) : 'Register Hotel →'}
            </button>

            <p className="text-center text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
              By registering, you agree to YoYo's Partner Terms &amp; Conditions
            </p>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
};

export default HotelReg;
