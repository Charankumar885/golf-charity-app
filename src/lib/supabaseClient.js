import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qufsbxvmlqvooxfhrxjt.supabase.co";
const supabaseKey = "sb_publishable_6z_ipzx0Su-dECohRGPhGA_IJHJhPpv";

export const supabase = createClient(supabaseUrl, supabaseKey);