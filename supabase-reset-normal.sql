-- Reset EVERY player's Normal-mode score to 0 (keeps Easy & Hard).
-- Run this ONCE in Supabase -> SQL Editor. Also clears the old inflated
-- overall 'highscore' so it can't leak back onto the Normal board.

update public.saves set hs_normal = 0;

-- keep the overall best consistent with the remaining per-difficulty bests
update public.saves set highscore = greatest(hs_easy, hs_normal, hs_hard);
