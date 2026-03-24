import { useEffect, useRef, useCallback } from "react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const GOOGLE_CLIENT_ID = "829752059628-cb29j0ra1l8litg13a1pnl900brkki1q.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (el: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface LoginPageProps {
  onLogin: (credential: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function LoginPage({ onLogin, isLoading, error }: LoginPageProps) {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const handleCredentialResponse = useCallback(
    (response: any) => {
      if (response.credential) {
        onLogin(response.credential);
      }
    },
    [onLogin]
  );

  useEffect(() => {
    if (initializedRef.current) return;

    const loadGoogleScript = () => {
      if (document.getElementById("google-identity-script")) return;
      const script = document.createElement("script");
      script.id = "google-identity-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initializeGoogle();
      document.head.appendChild(script);
    };

    const initializeGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_black",
        size: "large",
        width: 300,
        text: "signin_with",
        shape: "rectangular",
      });
    };

    if (window.google) {
      initializeGoogle();
    } else {
      loadGoogleScript();
    }
  }, [handleCredentialResponse]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="w-full max-w-md px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-label="Self Apply logo"
            >
              <rect x="4" y="6" width="24" height="20" rx="3" stroke="hsl(174, 72%, 46%)" strokeWidth="2" />
              <path d="M4 12h24" stroke="hsl(174, 72%, 46%)" strokeWidth="2" />
              <circle cx="10" cy="9" r="1.5" fill="hsl(174, 72%, 46%)" />
              <circle cx="16" cy="9" r="1.5" fill="hsl(174, 72%, 46%)" />
              <path d="M10 17h8" stroke="hsl(174, 72%, 46%)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10 21h12" stroke="hsl(174, 72%, 46%)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2" data-testid="text-app-title">
            Self Apply
          </h1>
          <p className="text-sm text-muted-foreground">
            View and apply to C2C contract jobs found by your agents
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-card-border rounded-xl p-8">
          <h2 className="text-base font-medium text-foreground mb-6 text-center">
            Sign in to continue
          </h2>

          {error && (
            <div
              className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-4"
              data-testid="text-login-error"
            >
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Signing in...</span>
            </div>
          ) : (
            <div className="flex justify-center" ref={googleBtnRef} data-testid="button-google-signin" />
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Only authorized candidates can access their job listings.
        </p>
      </div>

      <div className="absolute bottom-4">
        <PerplexityAttribution />
      </div>
    </div>
  );
}
