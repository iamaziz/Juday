'use server';

import { createClient } from '@/lib/supabase/server';
import { format, isValid, parse } from 'date-fns';

interface ExportResult {
  success?: boolean;
  filename?: string;
  content?: string;
  error?: string;
}

interface ImportResult {
  success?: boolean;
  error?: string;
  importedCount?: number;
  skippedCount?: number;
}

export async function exportAllData(): Promise<ExportResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to export data.' };
  }

  const { data: sheets, error } = await supabase
    .from('sheets')
    .select('title, content')
    .eq('user_id', user.id)
    .order('title', { ascending: false }); // Sort descending (newest to oldest)

  if (error) {
    console.error('Error fetching sheets for export:', error);
    return { error: `Failed to fetch your data: ${error.message}` };
  }

  if (!sheets || sheets.length === 0) {
    return { error: 'No data found to export.' };
  }

  // Add a newline after the separator and join with three newlines for better readability
  const formattedContent = sheets
    .map(sheet => `---${sheet.title}\n\n${sheet.content || ''}`)
    .join('\n\n\n');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  const filename = `juday-data-${timestamp}.md`;

  return {
    success: true,
    filename,
    content: formattedContent,
  };
}

export async function importAllData(fileContent: string): Promise<ImportResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to import data.' };
  }

  if (!fileContent || typeof fileContent !== 'string') {
    return { error: 'Invalid or empty file content provided.' };
  }

  // 1. Fetch all existing sheet titles for the user for quick lookup
  const { data: existingSheets, error: fetchError } = await supabase
    .from('sheets')
    .select('title')
    .eq('user_id', user.id);

  if (fetchError) {
    console.error('Error fetching existing sheets:', fetchError);
    return { error: `Failed to check for existing data: ${fetchError.message}` };
  }

  const existingTitles = new Set(existingSheets.map(sheet => sheet.title));

  // 2. Parse the file content
  const entriesToInsert: { user_id: string; title: string; content: string }[] = [];
  let skippedCount = 0;

  // Split by the separator '---' and filter out any empty strings from the start/end
  const chunks = fileContent.split('---').filter(chunk => chunk.trim() !== '');

  for (const chunk of chunks) {
    const lines = chunk.trim().split('\n');
    const title = lines.shift()?.trim(); // The date should be the first line
    const content = lines.join('\n').trim(); // The rest is the content

    if (!title) continue;

    // 3. Validate the date format (YYYY-MM-DD)
    const parsedDate = parse(title, 'yyyy-MM-dd', new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(title) || !isValid(parsedDate)) {
      console.warn(`Skipping entry with invalid title format: ${title}`);
      continue; // Skip entries with malformed titles
    }

    // 4. Check for conflicts and prepare for insertion
    if (existingTitles.has(title)) {
      skippedCount++;
    } else {
      entriesToInsert.push({
        user_id: user.id,
        title: title,
        content: content,
      });
      // Add to set to avoid duplicate inserts from the same file
      existingTitles.add(title);
    }
  }

  // 5. Batch insert the new entries
  if (entriesToInsert.length > 0) {
    const { error: insertError } = await supabase.from('sheets').insert(entriesToInsert);

    if (insertError) {
      console.error('Error inserting new sheets:', insertError);
      return { error: `Failed to import data: ${insertError.message}` };
    }
  }

  return {
    success: true,
    importedCount: entriesToInsert.length,
    skippedCount: skippedCount,
  };
}

export async function getChatSessions(): Promise<{ id: string; title: string | null; created_at: string }[] | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching chat sessions:', error);
    return { error: error.message };
  }

  return data;
}

export async function getChatMessages(sessionId: string): Promise<{ role: string; content: string; id: string }[] | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // First, verify the user owns this session
  const { data: sessionData, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !sessionData) {
    return { error: 'Session not found or access denied.' };
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    return { error: error.message };
  }

  return data;
}

export async function deleteChatSession(sessionId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !sessionData) {
    return { error: 'Session not found or access denied.' };
  }

  const { error: deleteError } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (deleteError) {
    console.error('Error deleting chat session:', deleteError);
    return { error: deleteError.message };
  }

  return { success: true };
}

export async function clearAllChatHistory(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error: deleteError } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error clearing all chat history:', deleteError);
    return { error: deleteError.message };
  }

  return { success: true };
}