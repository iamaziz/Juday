"use client";

import DailyJournal from "@/components/DailyJournal";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <>
      <DailyJournal />
      <Toaster />
    </>
  );
}