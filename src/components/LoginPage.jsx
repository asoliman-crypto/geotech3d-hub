import { useState } from "react";
import { CheckCircle2, LockKeyhole, Mail, Radar, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase.js";
import geotechLogo from "../assets/brand/geotech3d-logo-full.svg";

const heroChips = ["Project Control", "Tasks", "Teams", "Deliverables"];
const securityChips = ["Secure Access", "Role Based", "Live Tracking"];

// Clean sign-in: email/username + password only. No quick-login shortcuts and
// no pre-filled credentials — every person signs in with their own account.
export function LoginPage({ onLogin, rememberedIdentifier }) {
  const [identifier, setIdentifier] = useState(rememberedIdentifier || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedIdentifier));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await onLogin(identifier, password, rememberMe);
      if (!result?.ok) {
        setError(result?.message || "Invalid account or password.");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page geotech-login">
      <ContourBackground />
      <BrandHero />
      <LoginCard
        identifier={identifier}
        password={password}
        rememberMe={rememberMe}
        error={error}
        onIdentifierChange={setIdentifier}
        onPasswordChange={setPassword}
        onRememberChange={setRememberMe}
        onSubmit={submitLogin}
        submitting={submitting}
      />
    </main>
  );
}

function ContourBackground() {
  return (
    <div className="contour-background" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function BrandHero() {
  return (
    <section className="login-hero geotech-hero">
      <div className="brand-lockup">
        <img src={geotechLogo} alt="GEOTECH 3D - Geospatial Hub" className="geotech-logo" />
      </div>

      <h1>GEOTECH 3D Project Control Hub</h1>
      <p>
        A secure geospatial project management platform for tracking projects, tasks, teams,
        drawings, deliverables, and operational progress in one connected workspace.
      </p>

      <div className="hero-chip-row">
        {heroChips.map((chip) => (
          <span key={chip}>{chip}</span>
        ))}
      </div>

      <div className="geo-status-card">
        <div>
          <Radar size={20} aria-hidden="true" />
          <strong>Operational Visibility</strong>
          <span>BIM, GIS, survey, CAD, and project delivery teams.</span>
        </div>
        <div className="geo-metric">
          <small>Workspace</small>
          <strong>Online</strong>
        </div>
      </div>
    </section>
  );
}

function LoginCard({
  identifier,
  password,
  rememberMe,
  error,
  onIdentifierChange,
  onPasswordChange,
  onRememberChange,
  onSubmit,
  submitting,
}) {
  return (
    <section className="login-card geotech-login-card" aria-label="Login form">
      <div className="login-card-header">
        <span className="login-card-kicker">
          <ShieldCheck size={15} aria-hidden="true" />
          Authorized access
        </span>
        <h2>Sign in to GEOSPATIAL HUB</h2>
        <p>Welcome back — sign in with your GEOTECH 3D team account.</p>
      </div>

      <form className="login-form" onSubmit={onSubmit}>
        <label className="auth-field">
          <span>Email or username</span>
          <div className="auth-input-icon">
            <Mail size={17} aria-hidden="true" />
            <input
              type="text"
              value={identifier}
              onChange={(event) => onIdentifierChange(event.target.value)}
              placeholder="your.name@geotech3d.local or username"
              autoComplete="username"
              required
            />
          </div>
        </label>

        <label className="auth-field">
          <span>Password</span>
          <div className="auth-input-icon">
            <LockKeyhole size={17} aria-hidden="true" />
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>
        </label>

        <div className="login-options-row">
          <label className="remember-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => onRememberChange(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <span>{isSupabaseConfigured ? "Secure cloud login" : "Local MVP auth"}</span>
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        <button
          className="primary-button login-button geotech-login-button"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Login"}
        </button>
      </form>

      <div className="security-chip-row">
        {securityChips.map((chip) => (
          <span key={chip}>
            <CheckCircle2 size={14} aria-hidden="true" />
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}
