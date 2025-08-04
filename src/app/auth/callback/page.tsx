"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const supabase = createClient();

  useEffect(() => {
    if (code) {
      const handleAuthCallback = async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace("/"); // Redirect to home page on successful sign-in
          toast.success("Successfully signed in!");
        } else {
          toast.error(`Authentication error: ${error.message}`);
          router.replace("/?error=auth_failed"); // Redirect with an error query param
        }
      };
      handleAuthCallback();
    } else {
      // If no code is present, it might be an invalid callback or direct access
      router.replace("/");
    }
  }, [code, router, supabase]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Signing in...</p>
    </div>
  );
}