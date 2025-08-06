"use client";

import React from "react";
import { format } from "date-fns";

export default function DateTimeDisplay() {
  const formattedDate = format(new Date(), "E, MMMM d");

  return (
    <span className="absolute text-xs font-mono top-0 left-full ml-1 text-muted-foreground whitespace-nowrap">
      {formattedDate}
    </span>
  );
}