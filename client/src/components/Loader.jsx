import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

// Loader is used as the Stripe success_url target: /loader/:nextUrl
// It verifies the payment, marks the booking as paid, then navigates to nextUrl.
const Loader = () => {
  const { nextUrl } = useParams();
  const { axios, getToken, navigate } = useAppContext();
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [message, setMessage] = useState("Verifying your payment…");

  useEffect(() => {
    const verify = async () => {
      const destination = `/${nextUrl || "my-bookings"}`;

      try {
        const token = await getToken();
        if (!token) {
          navigate(destination, { replace: true });
          return;
        }

        const { data: bookingsData } = await axios.get("/api/bookings/user", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!bookingsData.success) {
          navigate(destination, { replace: true });
          return;
        }

        const pendingBooking = bookingsData.bookings
          .filter((b) => !b.isPaid && b.status !== "cancelled")
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        if (pendingBooking) {
          setMessage("Confirming payment with Stripe…");
          const { data: verifyData } = await axios.post(
            "/api/bookings/verify-payment",
            { bookingId: pendingBooking._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (verifyData.success) {
            setStatus("success");
            setMessage("Payment confirmed!");
            toast.success("Payment successful! Your booking is confirmed.");
          } else {
            setStatus("error");
            setMessage("Could not verify payment. Redirecting…");
          }
        } else {
          setStatus("success");
          setMessage("All done!");
        }
      } catch {
        setStatus("error");
        setMessage("Redirecting…");
      }

      // Show success/error state briefly, then navigate
      setTimeout(() => navigate(destination, { replace: true }), 1800);
    };

    verify();
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6"
      style={{ background: "var(--color-surface)", zIndex: 9999 }}
    >
      {/* Brand mark */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <svg width="72" height="72" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="url(#brandGrad)" />
          <defs>
            <linearGradient id="brandGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E8003D" />
              <stop offset="1" stopColor="#C50030" />
            </linearGradient>
          </defs>
          <text x="32" y="44" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="40" fill="white">Y</text>
        </svg>
      </motion.div>

      {/* Spinner OR green tick */}
      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div
            key="spinner"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative w-14 h-14"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-[3px] border-transparent"
              style={{ borderTopColor: "var(--color-primary)", borderRightColor: "var(--color-primary)" }}
            />
            <div
              className="absolute inset-1 rounded-full"
              style={{ background: "var(--color-surface)" }}
            />
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="tick"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "rgba(52, 199, 89, 0.15)", border: "3px solid #34C759" }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-12 h-12"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                stroke="#34C759"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              />
            </motion.svg>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 14, stiffness: 200 }}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(232, 0, 61, 0.12)", border: "2px solid var(--color-primary)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
              <path d="M18 6L6 18M6 6l12 12" stroke="#E8003D" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status message */}
      <motion.p
        key={message}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-semibold text-center"
        style={{
          color: status === "success"
            ? "#34C759"
            : status === "error"
            ? "var(--color-primary)"
            : "var(--color-primary)",
        }}
      >
        {message}
      </motion.p>
    </div>
  );
};

export default Loader;
