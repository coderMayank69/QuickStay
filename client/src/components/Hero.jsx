import { motion } from "framer-motion";
import { useAppContext } from "../context/AppContext";

const CLOUD           = "dgqgzmzed";
const HERO_VIDEO      = "https://res.cloudinary.com/dgqgzmzed/video/upload/v1782728427/hero_video_main_teqgjw.mp4";
const HERO_VIDEO_ALT  = "https://res.cloudinary.com/dgqgzmzed/video/upload/v1782646953/hero_video_alt_bjksts.mp4";
const FALLBACK_POSTER = `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_1920,h_1080,c_fill,g_auto/yoyo/assets/hero_image`;

const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.2 } },
};
const wordVariants = {
  hidden:  { opacity: 0, y: 36, rotateX: -20 },
  visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

// Smooth-scroll helper � works even if target is on same page
const scrollToDeals = () => {
  const el = document.getElementById("flash-deals");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const Hero = () => {
  const { navigate } = useAppContext();

  return (
    <section className="relative w-full h-screen min-h-[640px] overflow-hidden -mt-[56px]">

      {/* -- Background ----------------------------------- */}
      <div
        className="md:hidden absolute inset-0 w-full h-full"
        style={{ background: `url(${FALLBACK_POSTER}) center/cover no-repeat` }}
      />
      <video
        className="hidden md:block absolute inset-0 w-full h-full object-cover scale-105"
        autoPlay muted loop playsInline
        poster={FALLBACK_POSTER}
      >
        <source src={HERO_VIDEO}     type="video/mp4" />
        <source src={HERO_VIDEO_ALT} type="video/mp4" />
      </video>

      {/* -- Cinematic overlays --------------------------- */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8 }}
        style={{ background: "rgba(4,4,14,0.50)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(4,4,14,0.25) 0%, rgba(4,4,14,0.35) 45%, rgba(4,4,14,0.80) 80%, rgba(4,4,14,0.96) 100%)",
        }}
      />
      {/* Top vignette so navbar reads cleanly */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 22%)" }}
      />
      {/* Animated red glow � atmospheric bottom-left */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.18, 0.30, 0.18] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(ellipse 70% 55% at 15% 115%, rgba(232,0,61,0.24) 0%, transparent 68%)",
        }}
      />

      {/* -- Content -------------------------------------- */}
      <div
        className="relative z-10 h-full flex flex-col items-center justify-center px-5 text-center"
        style={{ perspective: "900px", paddingBottom: "5vh" }}
      >
        {/* -- Headline � word-by-word stagger ----------- */}
        <motion.h1
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="font-display font-extrabold text-white leading-[1.06] mb-5 max-w-5xl"
          style={{
            fontSize: "clamp(2.6rem, 7.5vw, 5.6rem)",
            letterSpacing: "-0.038em",
            textShadow: "0 2px 48px rgba(0,0,0,0.65)",
          }}
        >
          {["Your", "Perfect"].map((w, i) => (
            <motion.span key={i} variants={wordVariants} className="inline-block mr-[0.22em]">{w}</motion.span>
          ))}
          <motion.span variants={wordVariants} className="inline-block mr-[0.22em]" style={{ color: "#FF3B6B" }}>Stay</motion.span>
          <br />
          {["is One", "Search"].map((w, i) => (
            <motion.span key={i} variants={wordVariants} className="inline-block mr-[0.22em]">{w}</motion.span>
          ))}
          <motion.span variants={wordVariants} className="inline-block" style={{ color: "#FF3B6B" }}>Away.</motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="text-lg max-w-lg mb-11 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.68)", textShadow: "0 1px 14px rgba(0,0,0,0.55)" }}
        >
          Budget to luxury · 10,000+ verified hotels across India.
          Use the search bar above to find your ideal stay.
        </motion.p>

        {/* -- CTAs --------------------------------------- */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.78 }}
        >
          <motion.button
            onClick={() => navigate("/rooms")}
            whileHover={{ scale: 1.05, boxShadow: "0 16px 40px rgba(232,0,61,0.65)" }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 font-bold text-sm text-white"
            style={{
              background: "linear-gradient(135deg,#E8003D 0%,#B5002E 100%)",
              boxShadow: "0 8px 28px rgba(232,0,61,0.50)",
              padding: "14px 30px",
              borderRadius: "100px",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Explore Hotels
          </motion.button>

          <motion.button
            onClick={scrollToDeals}
            whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.16)" }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 font-semibold text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.28)",
              backdropFilter: "blur(12px)",
              padding: "14px 28px",
              borderRadius: "100px",
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            View Deals
          </motion.button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 flex flex-col items-center gap-1.5"
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.32)" }}
          >
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.9, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" className="w-5 h-5">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
