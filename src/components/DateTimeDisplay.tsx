"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";

export default function DateTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = format(currentTime, "EEEE, MMMM d, yyyy");
  const formattedTime = format(currentTime, "hh:mm:ss a"); // Include seconds directly

  return (
    <span className="absolute text-xs font-mono top-0 left-full ml-1 text-muted-foreground whitespace-nowrap">
      {formattedDate} {formattedTime}
    </span>
  );
}