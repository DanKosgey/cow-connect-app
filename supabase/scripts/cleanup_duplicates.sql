-- cleanup_duplicates.sql
-- Use this script to find potential duplicate profiles and user_roles entries.
-- Review results before deleting or merging. Run on a dev copy first.

-- Duplicate profiles by email
SELECT email, count(*) AS cnt, array_agg(id) as ids
FROM public.profiles
GROUP BY email
HAVING count(*) > 1
ORDER BY cnt DESC;

-- Duplicate user_roles by user_id
SELECT user_id, count(*) AS cnt, array_agg(role) as roles, array_agg(id) as ids
FROM public.user_roles
GROUP BY user_id
HAVING count(*) > 1
ORDER BY cnt DESC;

-- If you want to keep the earliest row per user_id and delete others, here's a sample (uncomment and adapt carefully):
-- WITH keep AS (
--   SELECT DISTINCT ON (user_id) id FROM public.user_roles ORDER BY user_id, created_at ASC
-- )
-- DELETE FROM public.user_roles WHERE id NOT IN (SELECT id FROM keep);

-- For profiles, merging is more involved — consider manually reconciling data or using psql/join queries to compare rows.
