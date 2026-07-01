import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserFavorite = {
  id: string;
  user_id: string;
  team_id: number;
  team_name: string;
  team_flag: string;
  kit_primary: string;
  kit_accent: string;
  created_at: string;
};

export async function getFavorites(userId: string): Promise<UserFavorite[]> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addFavorite(
  userId: string,
  team: { id: number; name: string; flag: string; kitPrimary: string; kitAccent: string }
) {
  const { error } = await supabase.from('user_favorites').insert({
    user_id: userId,
    team_id: team.id,
    team_name: team.name,
    team_flag: team.flag,
    kit_primary: team.kitPrimary,
    kit_accent: team.kitAccent,
  });
  if (error) throw error;
}

export async function removeFavorite(userId: string, teamId: number) {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId);
  if (error) throw error;
}
