import React, { useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import Logo from "../components/Logo";
import GoogleIcon from "../components/GoogleIcon";
import { sanitize } from "../utils/helpers";

const PASSWORD_RULES = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

// Shared auth background (same as Login)
const AuthBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div
      className="absolute top-1/4 -right-32 w-96 h-96 rounded-full blur-3xl"
      style={{ background: "radial-gradient(circle, #E8003D 0%, transparent 70%)", opacity: 0.10 }}
    />
    <div
      className="absolute bottom-1/4 -left-32 w-80 h-80 rounded-full blur-3xl"
      style={{ background: "radial-gradient(circle, #6C3BD5 0%, transparent 70%)", opacity: 0.08 }}
    />
  </div>
);

const Spinner = () => (
  <span
    className="w-4 h-4 border-2 rounded-full animate-spin"
    style={{ borderColor: "rgba(255,255,255,0.30)", borderTopColor: "#fff" }}
    aria-hidden="true"
  />
);

const FIELDS = [
  { name: "username", type: "text",     label: "Full Name",        placeholder: "Mayank Kumar",           autoComplete: "name",         maxLength: 60  },
  { name: "email",    type: "email",    label: "Email Address",    placeholder: "you@example.com",        autoComplete: "email",        maxLength: 254 },
  { name: "password", type: "password", label: "Password",         placeholder: "8+ chars, 1 uppercase",  autoComplete: "new-password", maxLength: 128 },
  { name: "confirm",  type: "password", label: "Confirm Password", placeholder: "••••••••",               autoComplete: "new-password", maxLength: 128 },
];

const Register = () => {
  const { register, googleLogin, navigate, axios, user, darkMode } = useAppContext();
  const location = useLocation();
  // Prevent redirect loops — if 'from' is an auth page, go home instead
  const rawFrom = location.state?.from || "/";
  const AUTH_PATHS = ["/login", "/register"];
  const from = AUTH_PATHS.includes(rawFrom) ? "/" : rawFrom;

  const [form,    setForm]    = useState({ username: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [gLoading,setGLoading]= useState(false);

  // Redirect already-logged-in users — Navigate renders synchronously (no blank flash)
  if (user) return <Navigate to={from} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm)      return toast.error("Passwords do not match");
    if (!PASSWORD_RULES.test(form.password)) return toast.error("Password needs 8+ chars, 1 uppercase, 1 number");
    setLoading(true);
    try {
      await register(sanitize(form.username), sanitize(form.email), form.password);
      toast.success("Account created! Welcome to YoYo 🎉");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || "Registration failed");
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
          toast.error(data.message || "Google sign-up failed");
        }
      } catch {
        toast.error("Google sign-up failed. Try again.");
      } finally {
        setGLoading(false);
      }
    },
    onError: () => toast.error("Google sign-up cancelled"),
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
            Create your account
          </h1>
          <p
            className="text-center text-sm mb-8"
            style={{ color: "var(--color-text-muted)" }}
          >
            Join YoYo — book smarter, stay better
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 mb-6"
            style={{
              background: "var(--color-surface-3)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-primary)",
            }}
          >
            {gLoading ? <Spinner /> : <GoogleIcon />}
            {gLoading ? "Connecting…" : "Sign up with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>or fill in your details</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label
                  htmlFor={f.name}
                  className="block text-xs font-bold uppercase tracking-wide mb-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {f.label}
                </label>
                <input
                  id={f.name}
                  name={f.name}
                  type={f.type}
                  required
                  value={form[f.name]}
                  onChange={handleChange}
                  placeholder={f.placeholder}
                  autoComplete={f.autoComplete}
                  maxLength={f.maxLength}
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all"
                  style={{
                    background: "var(--color-surface-3)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "var(--shadow-glow)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "var(--color-border)";  e.target.style.boxShadow = "none"; }}
                />
              </div>
            ))}

            {/* Password strength hint */}
            {form.password && (
              <p
                className="text-xs"
                style={{ color: PASSWORD_RULES.test(form.password) ? "var(--color-success)" : "var(--color-text-muted)" }}
              >
                {PASSWORD_RULES.test(form.password) ? "✓ Strong password" : "→ Add uppercase letter and number"}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 text-sm rounded-xl disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Creating account…
                </span>
              ) : "Create Account"}
            </button>
          </form>

          <p
            className="text-center text-sm mt-8"
            style={{ color: "var(--color-text-muted)" }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              state={{ from }}
              className="font-bold transition hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              Sign in
            </Link>
          </p>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-6 mt-6" aria-hidden="true">
            {[
              { label: "Encrypted", icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg> },
              { label: "Secure",    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
              { label: "Private",   icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg> },
            ].map((b) => (
              <span key={b.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
