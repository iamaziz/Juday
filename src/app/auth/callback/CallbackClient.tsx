"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        // After attempting to exchange the code, check if a user session exists
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();

        if (user) {
          // User is successfully signed in (or was already signed in)
          toast.success("Successfully signed in!");
          router.replace("/");
        } else {
          // No user session after exchange attempt
          const errorMessage = exchangeError?.message || getUserError?.message || "Authentication failed.";
          toast.error(`Authentication error: ${errorMessage}`);
          router.replace("/?error=auth_failed");
        }
      } else {
        // If no code is present, it might be an invalid callback or direct access
        router.replace("/");
      }
    };
    handleAuthCallback();
  }, [code, router, supabase]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Signing in...</p>
    </div>
  );
}