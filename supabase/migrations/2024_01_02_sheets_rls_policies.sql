CREATE POLICY "Users can view their own sheets." ON public.sheets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create sheets for themselves." ON public.sheets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sheets." ON public.sheets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sheets." ON public.sheets
  FOR DELETE USING (auth.uid() = user_id);