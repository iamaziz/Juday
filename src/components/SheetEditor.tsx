"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface SheetEditorProps {
  sheetId: string;
  initialTitle: string;
  initialContent: string;
  onSaveSuccess: () => void;
}

export default function SheetEditor({ sheetId, initialTitle, initialContent, onSaveSuccess }: SheetEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
  }, [sheetId, initialTitle, initialContent]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("sheets")
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq("id", sheetId);

    if (error) {
      toast.error(`Failed to save sheet: ${error.message}`);
    } else {
      toast.success("Sheet saved successfully!");
      onSaveSuccess();
    }
    setIsSaving(false);
  }, [sheetId, title, content, supabase, onSaveSuccess]);

  return (
    <div className="flex flex-col h-full p-4">
      <Input
        type="text"
        placeholder="Sheet Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-4 text-2xl font-bold border-none focus-visible:ring-0"
      />
      <Textarea
        placeholder="Start writing your sheet content here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 resize-none border-none focus-visible:ring-0"
      />
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Sheet"}
        </Button>
      </div>
    </div>
  );
}