import React, { useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import Logo from "../components/Logo";
import GoogleIcon from "../components/GoogleIcon";
import { sanitize } from "../utils/helpers";

// ── Auth background (shared with Register) ────────────────────
const AuthBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <motion.div
      className="absolute top-1/4 -right-32 w-96 h-96 rounded-full blur-3xl"
      style={{ background: "radial-gradient(circle, #E8003D 0%, transparent 70%)", opacity: 0.10 }}
      animate={{ scale: [1, 1.18, 0.92, 1], rotate: [0, 8, -4, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-1/4 -left-32 w-80 h-80 rounded-full blur-3xl"
      style={{ background: "radial-gradient(circle, #6C3BD5 0%, transparent 70%)", opacity: 0.08 }}
      animate={{ scale: [1, 0.88, 1.14, 1], rotate: [0, -10, 5, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    />
    <motion.div
      className="absolute top-2/4 right-1/4 w-64 h-64 rounded-full blur-3xl"
      style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)", opacity: 0.05 }}
      animate={{ scale: [1, 1.22, 0.95, 1], rotate: [0, 12, -6, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
    />
  </div>
);

// ── Spinner ───────────────────────────────────────────────────
const Spinner = () => (
  <span
    className="w-4 h-4 border-2 rounded-full animate-spin"
    style={{ borderColor: "rgba(255,255,255,0.30)", borderTopColor: "#fff" }}
    aria-hidden="true"
  />
);

const Login = () => {
  const { login, googleLogin, navigate, axios, user, darkMode } = useAppContext();
  const location = useLocation();
  // Prevent redirect loops — never send back to an auth page
  const rawFrom = location.state?.from || "/";
  const AUTH_PATHS = ["/login", "/register"];
  const from = AUTH_PATHS.includes(rawFrom) ? "/" : rawFrom;

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [gLoading,setGLoading]= useState(false);

  // Redirect already-logged-in users — Navigate renders synchronously (no blank flash)
  if (user) return <Navigate to={from} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(sanitize(form.email), form.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGLoading(true);
      try {
        const { data: gUser } = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );
        const { data } = await axios.post(
          `/api/auth/google/access`,
          { googleId: gUser.sub, email: gUser.email, name: gUser.name, picture: gUser.picture }
        );
        if (data.success) {
          await googleLogin(null, data);
          toast.success(`Welcome, ${gUser.name}!`);
          navigate(from, { replace: true });
        } else {
          toast.error(data.message || "Google login failed");
        }
      } catch {
        toast.error("Google login failed. Try again.");
      } finally {
        setGLoading(false);
      }
    },
    onError: () => toast.error("Google login cancelled"),
    flow: "implicit",
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: "var(--color-surface)" }}
    >
      <AuthBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div
          className="rounded-3xl p-10 shadow-2xl"
          style={{
            background: "var(--color-surface-2)",
            boxShadow: "var(--shadow-xl)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link to="/" aria-label="YoYo home">
              <Logo size="lg" darkMode={darkMode} />
            </Link>
          </div>

          <h1
            className="text-2xl font-bold text-center mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Welcome back
          </h1>
          <p
            className="text-center text-sm mb-8"
            style={{ color: "var(--color-text-muted)" }}
          >
            Sign in to access your bookings and saved stays
          </p>

          {/* Google */}
          <motion.button
            onClick={handleGoogle}
            disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 mb-6"
            style={{
              background: "var(--color-surface-3)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-primary)",
            }}
            whileHover={{ scale: 1.02, boxShadow: "var(--shadow-md)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {gLoading ? (
                <motion.span key="gspinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Spinner />
                </motion.span>
              ) : (
                <motion.span key="gicon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GoogleIcon />
                </motion.span>
              )}
            </AnimatePresence>
            {gLoading ? "Connecting…" : "Continue with Google"}
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>or sign in with email</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wide mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                className="input-field w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{
                  background: "var(--color-surface-3)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wide mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                maxLength={128}
                className="input-field w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{
                  background: "var(--color-surface-3)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 text-sm rounded-xl disabled:opacity-60 mt-2"
              whileHover={!loading ? { scale: 1.02, boxShadow: "0 12px 28px rgba(232,0,61,0.45)" } : {}}
              whileTap={!loading ? { scale: 0.97 } : {}}
              transition={{ duration: 0.15 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.span
                    key="loading"
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <Spinner /> Signing in…
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Sign In
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <p
            className="text-center text-sm mt-8"
            style={{ color: "var(--color-text-muted)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              state={{ from }}
              className="font-bold transition hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              Create one free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
