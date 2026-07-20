import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Mail,
  ArrowRight,
} from "lucide-react";

const BASE_URL = (
  import.meta.env.VITE_IDENTITY_API_URL || "http://localhost:5098"
).replace(/\/$/, "");

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState("");

  // Extract userId and token from search params.
  // Supports various parameter formats (userId, id, token, code) to be extremely resilient.
  const userId =
    searchParams.get("userId") ||
    searchParams.get("id") ||
    searchParams.get("userId");
  const token =
    searchParams.get("token") ||
    searchParams.get("code") ||
    searchParams.get("token");

  const handleVerify = async () => {
    if (!userId || !token) {
      setStatus("error");
      setErrorMessage(
        "Verification parameters are missing. Please ensure you clicked the full link from your email.",
      );
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // Make a POST request to verify the email.
      const response = await fetch(`${BASE_URL}/api/User/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          token: token,
        }),
      });

      const data = await response.json().catch(() => null);

      if (
        response.ok &&
        (data?.Success ||
          data?.success ||
          data?.Succeeded ||
          data?.succeeded ||
          data === true)
      ) {
        setStatus("success");
      } else {
        // Retrieve error message from response payload if available
        const errorText =
          data?.Message ||
          data?.message ||
          data?.Errors?.[0] ||
          data?.errors?.[0] ||
          "Email verification failed. The link may have expired or is invalid.";
        throw new Error(errorText);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setStatus("error");
      setErrorMessage(
        err.message ||
          "Failed to connect to the verification server. Please try again later.",
      );
    }
  };

  // State-specific layout assets and styling parameters
  const themeStyles = {
    idle: {
      glowColor: "bg-[#6942FF]/10",
      accentBorder: "border-[#6942FF]/20",
      iconColor: "text-[#6942FF]",
      title: "Activate Your Account",
      subtitle: "FitTech Authentication Portal",
      badge: "Pending Verification",
      badgeStyle: "bg-[#6942FF]/10 text-[#a38cff]",
    },
    loading: {
      glowColor: "bg-[#6942FF]/15 animate-pulse",
      accentBorder: "border-[#6942FF]/30",
      iconColor: "text-[#6942FF]",
      title: "Securing Connection",
      subtitle: "Validating token with FitTech security services...",
      badge: "Verifying...",
      badgeStyle: "bg-secondary-800 text-secondary-400 animate-pulse",
    },
    success: {
      glowColor: "bg-emerald-500/15 shadow-[0_0_100px_rgba(16,185,129,0.1)]",
      accentBorder: "border-emerald-500/40",
      iconColor: "text-emerald-400",
      title: "Access Authorized!",
      subtitle: "Verification Successful",
      badge: "✓ Access Granted",
      badgeStyle:
        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    },
    error: {
      glowColor: "bg-rose-500/15 shadow-[0_0_100px_rgba(244,63,94,0.1)]",
      accentBorder: "border-rose-500/40",
      iconColor: "text-rose-400",
      title: "Verification Failed",
      subtitle: "Invalid or Expired Link",
      badge: "✕ Access Denied",
      badgeStyle: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    },
  }[status];

  return (
    <div className="min-h-screen w-full bg-[#07070a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Styling Override to ensure it is always dark and responsive */}
      <style>{`
        body { background-color: #07070a !important; color: #f3f4f6 !important; }
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(15px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(15px) rotate(-360deg); }
        }
        .orbiting-glow {
          animation: orbit 6s linear infinite;
        }
      `}</style>

      {/* Floating Glowing Ambient Circles */}
      <div
        className={`absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-[140px] transition-all duration-1000 ${themeStyles.glowColor} orbiting-glow`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[160px] transition-all duration-1000 ${themeStyles.glowColor} opacity-75`}
      />

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-[420px] z-10 animate-fade-in">
        <div
          className={`backdrop-blur-xl bg-[#0f0f16]/80 border ${themeStyles.accentBorder} rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 flex flex-col items-center`}
        >
          {/* Header Brand */}
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck
              size={20}
              className="text-[#6942FF] drop-shadow-[0_0_8px_rgba(105,66,255,0.4)]"
            />
            <span className="text-white font-extrabold tracking-wider text-[13px] uppercase">
              FITTECH SYSTEM
            </span>
          </div>

          {/* Status Badge */}
          <span
            className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6 transition-all duration-300 ${themeStyles.badgeStyle}`}
          >
            {themeStyles.badge}
          </span>

          {/* Dynamic Graphic/Icon Display */}
          <div className="h-28 flex items-center justify-center mb-6 relative">
            {status === "idle" && (
              <div className="relative group">
                <div className="absolute inset-0 bg-[#6942FF]/30 rounded-full blur-xl group-hover:bg-[#6942FF]/40 transition-all duration-300" />
                <div className="w-20 h-20 rounded-full border border-secondary-800 bg-[#161622] flex items-center justify-center text-white relative z-10 transition-transform duration-300 group-hover:scale-105">
                  <Mail
                    size={32}
                    className="text-[#6942FF] group-hover:text-white transition-colors"
                  />
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="relative">
                <div className="absolute inset-0 bg-[#6942FF]/20 rounded-full blur-lg" />
                <Loader2
                  size={60}
                  className="text-[#6942FF] animate-spin relative z-10"
                />
              </div>
            )}

            {status === "success" && (
              <div className="relative animate-scale-up">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
                <div className="w-20 h-20 rounded-full border border-emerald-500/30 bg-[#0f1b13] flex items-center justify-center text-white relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 size={44} className="text-emerald-400" />
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="relative animate-scale-up">
                <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl" />
                <div className="w-20 h-20 rounded-full border border-rose-500/30 bg-[#221215] flex items-center justify-center text-white relative z-10 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                  <XCircle size={44} className="text-rose-400" />
                </div>
              </div>
            )}
          </div>

          {/* Heading Text */}
          <h2 className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-2 text-center transition-all duration-300">
            {themeStyles.title}
          </h2>
          <p className="text-secondary-400 text-xs sm:text-sm mb-6 text-center leading-relaxed max-w-[280px]">
            {themeStyles.subtitle}
          </p>

          {/* Content Description Box */}
          <div className="w-full bg-[#14141f]/60 border border-secondary-800/50 rounded-2xl p-4 mb-6 text-left">
            {status === "idle" && (
              <p className="text-secondary-300 text-[12px] sm:text-[13px] leading-relaxed">
                Welcome to FitTech! Click below to confirm your email. Once
                verified, your credentials will be active and you will be
                authorized to access the FitTech Coach & Member Mobile
                Application.
              </p>
            )}

            {status === "loading" && (
              <div className="flex flex-col gap-2">
                <p className="text-secondary-300 text-[12px] sm:text-[13px] leading-relaxed text-center">
                  Executing authentication handshake...
                </p>
                <div className="w-full bg-secondary-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-[#6942FF] h-full rounded-full animate-[loading_1.5s_infinite_linear]"
                    style={{ width: "40%" }}
                  />
                  <style>{`
                    @keyframes loading {
                      0% { transform: translateX(-100%); }
                      50% { transform: translateX(100%); }
                      100% { transform: translateX(250%); }
                    }
                  `}</style>
                </div>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col gap-2">
                <p className="text-emerald-300/90 text-[12px] sm:text-[13px] leading-relaxed font-semibold">
                  ✓ Credentials Activated Successfully.
                </p>
                <p className="text-secondary-300 text-[12px] sm:text-[13px] leading-relaxed">
                  Your device access is now authorized! You can safely launch
                  the FitTech Mobile Application and sign in to access your
                  custom programs and client management features.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col gap-2">
                <p className="text-rose-300/90 text-[12px] sm:text-[13px] leading-relaxed font-semibold">
                  Error Details:
                </p>
                <p className="text-secondary-300 text-[12px] sm:text-[13px] leading-relaxed">
                  {errorMessage ||
                    "The link contains an invalid token or has expired. Please check your link or contact your administrator."}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            {status === "idle" && (
              <button
                onClick={handleVerify}
                className="w-full bg-[#6942FF] hover:bg-[#5837D6] active:bg-[#472CAD] text-white text-[14px] font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[#6942FF]/20 flex items-center justify-center gap-2 group"
              >
                Verify Email
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </button>
            )}

            {status === "loading" && (
              <button
                disabled
                className="w-full bg-[#6942FF]/30 text-white/50 text-[14px] font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Loader2 size={16} className="animate-spin" />
                Processing Verification...
              </button>
            )}

            {status === "success" && (
              <div className="flex flex-col gap-2.5 w-full">
                <a
                  href="fitech://open"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[14px] font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-emerald-500/20 text-center block"
                >
                  Open Mobile App
                </a>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full border border-secondary-800 hover:bg-secondary-900 text-secondary-300 text-[13px] font-medium py-2 rounded-xl transition-all cursor-pointer"
                >
                  Go to Web Portal Login
                </button>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={handleVerify}
                  className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-[14px] font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-rose-500/20"
                >
                  Retry Verification
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full border border-secondary-800 hover:bg-secondary-900 text-secondary-300 text-[13px] font-medium py-2 rounded-xl transition-all cursor-pointer"
                >
                  Back to Portal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Brand Label */}
        <p className="text-center text-secondary-500 text-[11px] mt-6">
          © {new Date().getFullYear()} FitTech Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
