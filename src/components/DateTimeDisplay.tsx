"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function DateTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSeconds, setShowSeconds] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setShowSeconds((prev) => !prev); // Toggle visibility every second for blinking effect
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = format(currentTime, "EEEE, MMMM d, yyyy");
  const formattedTimeWithoutSeconds = format(currentTime, "hh:mm");
  const seconds = format(currentTime, "ss");
  const ampm = format(currentTime, "a");

  return (
    <span className="absolute text-xs font-mono top-0 left-full ml-1 text-muted-foreground whitespace-nowrap">
      {formattedDate} {formattedTimeWithoutSeconds}
      <span className={cn(showSeconds ? "opacity-100" : "opacity-0")}>
        :{seconds}
      </span>
      {ampm}
    </span>
  );
}