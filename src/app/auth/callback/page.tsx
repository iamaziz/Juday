import { Suspense } from "react";
import CallbackClient from "./CallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p>Signing in...</p>
      </div>
    }>
      <CallbackClient />
    </Suspense>
  );
}