"use client";

import React, { useState, useEffect } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  loginAction, 
  registerAction, 
  forgotPasswordAction,
  verifyEmailOtpAndResetAction,
  socialAuthAction
} from "@/lib/actions/auth";
import { AnimatedLoader2 as Loader2 } from "@/components/ui/icons/AnimatedLoader2";
import { AnimatedAlertCircle as AlertCircle } from "@/components/ui/icons/AnimatedAlertCircle";
import { AnimatedCheckCircle2 as CheckCircle2 } from "@/components/ui/icons/AnimatedCheckCircle2";

// Dynamic SVG Icons for Social logins
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      <path fill="#ffffff" d="M16.671 16.657l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.568V6.474s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.67v2.52H7.078v3.47h3.047v8.385a12.09 12.09 0 003.796 0v-8.385h2.75z"/>
    </svg>
  );
}

interface CloudWatchFormProps {
  type?: "signin" | "signup" | "forgot";
  returnUrl?: string;
  onModeChange?: (mode: "signin" | "signup" | "forgot") => void;
}

function CloudWatchFormInner({ type = "signup", returnUrl = "/", onModeChange }: CloudWatchFormProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(type);
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (!resetEmail || resendCooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const fd = new FormData();
    fd.append("email", resetEmail);
    const result = await forgotPasswordAction(null, fd);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("A new 6-digit verification code has been sent to your email.");
      setResendCooldown(60);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const token = tokenResponse.access_token;
      const result = await socialAuthAction("google", token, returnUrl);
      
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setSuccess("Authenticated successfully with Google! Redirecting...");
        window.location.href = result.redirectUrl || "/";
      }
    },
    onError: () => {
      setError("Google login failed. Please try again.");
    }
  });

  const handleModeChange = (newMode: "signin" | "signup" | "forgot") => {
    setMode(newMode);
    setForgotStep("request");
    setError(null);
    setSuccess(null);
    onModeChange?.(newMode);
  };

  useEffect(() => {
    setMode(type);
    setForgotStep("request");
    setError(null);
    setSuccess(null);
  }, [type]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) {
        setError(decodeURIComponent(urlError));
      }
    }
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const offsetX = ((e.clientX / window.innerWidth) - 0.5) * 40;
      const offsetY = ((e.clientY / window.innerHeight) - 0.5) * 20;
      setEyePos({ x: offsetX, y: offsetY });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load Facebook SDK
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!fbAppId) return;

    (window as any).fbAsyncInit = function() {
      (window as any).FB.init({
        appId      : fbAppId,
        cookie     : true,
        xfbml      : true,
        version    : 'v16.0'
      });
    };

    if (!document.getElementById('facebook-jssdk')) {
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(js);
    }
  }, []);

  const handleSocialClick = async (provider: string) => {
    if (provider === "google") {
      googleLogin();
      return;
    }

    if (provider === "facebook") {
      const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!fbAppId) {
        setError("Facebook Login is not configured (missing App ID).");
        return;
      }
      
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const redirectUri = `${window.location.origin}/api/auth/callback/facebook`;
      const oauthUrl = `https://www.facebook.com/v16.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile&state=${encodeURIComponent(returnUrl || "/")}`;
      
      window.location.href = oauthUrl;
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    
    if (mode === "signup") {
      const result = await registerAction(null, formData);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        window.location.href = result.redirectUrl || "/";
      }
    } else if (mode === "signin") {
      const result = await loginAction(null, formData);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        window.location.href = result.redirectUrl || "/";
      }
    } else if (mode === "forgot") {
      if (forgotStep === "request") {
        const result = await forgotPasswordAction(null, formData);
        setLoading(false);
        if (result.error) {
          setError(result.error);
        } else {
          const emailInput = ((formData.get("email") as string) || "").trim().toLowerCase();
          setResetEmail(emailInput);
          setForgotStep("verify");
          setSuccess(typeof result.success === "string" ? result.success : "A 6-digit verification code has been sent to your email.");
          setResendCooldown(60);
        }
      } else {
        const result = await verifyEmailOtpAndResetAction(null, formData);
        setLoading(false);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccess("Password successfully set! Signing you in...");
          window.location.href = result.redirectUrl || returnUrl || "/account";
        }
      }
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center w-full max-w-md">
       
        {/* Cartoon Face */}
        <div className="relative w-64 h-32 mb-4">
          <Image
            src="https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/cloud.jpg"
            alt="Decorative cloud character"
            fill
            className="w-full h-full object-contain"
            sizes="256px"
          />

          {["left", "right"].map((side, idx) => (
            <div
              key={side}
              className="absolute flex justify-center items-end overflow-hidden"
              style={{
                top: "45%",
                left: idx === 0 ? "35%" : "55%",
                width: 24,
                height: isTyping
                  ? 3 // fully closed when typing password
                  : blink
                  ? 4 // temporary blink
                  : 28, // open eye
                borderRadius: isTyping || blink ? "1px" : "50%",
                backgroundColor: "white",
                transform: "translateX(-50%)",
                transition: "all 0.15s ease",
              }}
            >
              {!isTyping && (
                <div
                  className="bg-[#1a1a1a]"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    marginBottom: 2, 
                    transform: `translate(${eyePos.x * 0.4}px, ${eyePos.y * 0.2}px)`,
                    transition: "all 0.1s ease",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Short Note for Old / Existing Customers */}
        {mode === "signin" && (
          <div className="w-full mb-4 p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl text-left text-xs leading-relaxed text-neutral-800 shadow-sm">
            <div className="flex items-center gap-1.5 font-bold text-[var(--color-maroon)] text-[11px] uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] inline-block"></span>
              Existing PerfumeBooth Customer?
            </div>
            <p className="text-[11px] text-neutral-600">
              Your previous account &amp; order history are safely preserved! To access the new store, click{" "}
              <button 
                type="button" 
                onClick={() => handleModeChange("forgot")} 
                className="font-bold text-[var(--color-maroon)] underline hover:text-black transition-colors"
              >
                Forgot Password?
              </button>{" "}
              to receive an email code and set your password, or sign in directly with Google.
            </p>
          </div>
        )}

        {mode === "signup" && (
          <div className="w-full mb-4 p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-left text-xs leading-relaxed text-neutral-700 shadow-sm">
            <div className="flex items-center gap-1.5 font-bold text-[var(--color-gold)] text-[11px] uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] inline-block"></span>
              Shopped with us before?
            </div>
            <p className="text-[11px] text-neutral-600">
              No need to register a new account! Switch to{" "}
              <button 
                type="button" 
                onClick={() => handleModeChange("signin")} 
                className="font-bold text-[var(--color-maroon)] underline hover:text-black transition-colors"
              >
                Sign In
              </button>{" "}
              and use Forgot Password or Google to activate your existing profile.
            </p>
          </div>
        )}

        {mode === "forgot" && forgotStep === "request" && (
          <div className="w-full mb-4 p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl text-left text-xs leading-relaxed text-neutral-800 shadow-sm">
            <div className="flex items-center gap-1.5 font-bold text-[var(--color-maroon)] text-[11px] uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] inline-block"></span>
              Account Activation &amp; Password Reset
            </div>
            <p className="text-[11px] text-neutral-600">
              Enter your registered email below. We'll send an instant 6-digit verification code directly to your email inbox so you can quickly set your new password and sign in.
            </p>
          </div>
        )}

        {mode === "forgot" && forgotStep === "verify" && (
          <div className="w-full mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-left text-xs leading-relaxed text-neutral-700 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Verification code sent to</span>
              <span className="font-semibold text-neutral-900 text-xs">{resetEmail}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setForgotStep("request");
                setError(null);
                setSuccess(null);
              }}
              className="text-[11px] font-bold text-[var(--color-maroon)] hover:underline ml-2"
            >
              Change Email
            </button>
          </div>
        )}

        {error && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs">   
            <AlertCircle size={16} animateOn="view" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-600 text-xs">   
            <CheckCircle2 size={16} className="text-green-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Forms */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input type="hidden" name="returnUrl" value={returnUrl} />

          {mode === "forgot" && forgotStep === "verify" ? (
            <>
              <input type="hidden" name="email" value={resetEmail} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">
                  6-Digit Verification Code
                </Label>
                <Input 
                  name="otp" 
                  id="otp" 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required 
                  placeholder="123456" 
                  autoFocus
                  className="rounded-full px-5 h-11 text-center font-mono tracking-[0.4em] text-lg font-bold border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">
                  New Password
                </Label>
                <Input
                  name="password"
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="•••••••• (min 8 characters)"
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all"
                />
              </div>

              <Button 
                disabled={loading}
                className="mt-2 w-full h-11 rounded-full bg-[var(--color-maroon)] hover:bg-[var(--color-black)] text-white hover:text-white font-bold tracking-widest uppercase text-xs transition-all duration-300 shadow-lg shadow-maroon/20"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify Code & Set Password"}
              </Button>

              <div className="flex items-center justify-between mt-2 px-1 text-[11px]">
                <button 
                  type="button" 
                  onClick={() => handleModeChange("signin")}
                  className="text-neutral-400 hover:text-[var(--color-gold)] font-semibold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <div>
                  {resendCooldown > 0 ? (
                    <span className="text-neutral-400 font-medium">Resend code in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-[var(--color-maroon)] hover:underline font-bold"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">Full Name</Label>
                  <Input name="name" id="name" placeholder="John Doe" required className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all" />
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">Email Address</Label>
                <Input name="email" id="email" type="email" placeholder="john@example.com" required className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all" />
              </div>

              {mode !== "forgot" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-xs text-[var(--color-gold)] font-bold uppercase tracking-wider">Password</Label>
                    {mode === "signin" && (
                      <button 
                        type="button" 
                        onClick={() => handleModeChange("forgot")}
                        className="text-[10px] font-bold text-neutral-400 hover:text-[var(--color-gold)] uppercase tracking-widest transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <Input
                    name="password"
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                    className="rounded-full px-5 h-11 border-white/50 bg-white/50 focus:bg-[var(--color-surface)] transition-all"
                  />
                </div>
              )}

              <Button 
                disabled={loading}
                className="mt-2 w-full h-11 rounded-full bg-[var(--color-maroon)] hover:bg-[var(--color-black)] text-white hover:text-white font-bold tracking-widest uppercase text-xs transition-all duration-300 shadow-lg shadow-maroon/20"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  mode === "signup" ? "Sign Up" : mode === "signin" ? "Sign In" : "Send Verification Code"
                )}
              </Button>

              {mode === "forgot" && (
                <button 
                  type="button" 
                  onClick={() => handleModeChange("signin")}
                  className="mt-2 text-[10px] font-black text-center text-neutral-400 hover:text-[var(--color-gold)] uppercase tracking-widest transition-colors"
                >
                  Back to Sign In
                </button>
              )}
            </>
          )}
        </form>

        {/* Social Login Separator */}
        {mode !== "forgot" && (
          <div className="w-full flex flex-col items-center mt-8">
            <div className="flex items-center w-full mb-6">
              <div className="flex-1 h-[1px] bg-neutral-200" />
              <span className="px-4 text-[9px] uppercase tracking-[0.3em] text-neutral-400 font-bold">Or Connect With</span>
              <div className="flex-1 h-[1px] bg-neutral-200" />
            </div>

            {/* Premium Social Login Buttons */}
            <div className="flex items-center justify-between gap-3 w-full">
              <Button
                type="button"
                onClick={() => handleSocialClick("google")}
                disabled={loading}
                className="flex-1 h-12 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm flex items-center justify-center transition-all duration-300"
              >
                <GoogleIcon />
              </Button>
              <Button
                type="button"
                onClick={() => handleSocialClick("facebook")}
                disabled={loading}
                className="flex-1 h-12 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm flex items-center justify-center transition-all duration-300"
              >
                <FacebookIcon />
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Toggle Text */}
        <div className="mt-8 text-center">
          {mode === "signin" ? (
            <p className="text-xs text-neutral-500">
              Don't have an account?{" "}
              <button 
                type="button" 
                onClick={() => handleModeChange("signup")}
                className="font-bold text-[var(--color-maroon)] hover:text-black transition-colors"
              >
                Sign up                                                                                        
              </button>
            </p>
          ) : mode === "signup" ? (
            <p className="text-xs text-neutral-500">
              Already have an account?{" "}
              <button 
                type="button" 
                onClick={() => handleModeChange("signin")}
                className="font-bold text-[var(--color-maroon)] hover:text-black transition-colors"
              >
                Sign in
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CloudWatchForm(props: CloudWatchFormProps) {
  // Use the provided Client ID or a dummy one for UI testing if it's missing.
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-client-id";
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <CloudWatchFormInner {...props} />
    </GoogleOAuthProvider>
  );
}
