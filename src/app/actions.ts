'use server';

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

interface ExportResult {
  success?: boolean;
  filename?: string;
  content?: string;
  error?: string;
}

export async function exportAllData(): Promise<ExportResult> {
  const supabase = createClient();

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