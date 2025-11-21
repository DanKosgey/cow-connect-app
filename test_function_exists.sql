-- Test if the function exists
SELECT proname FROM pg_proc WHERE proname = 'get_all_collectors_summary';

-- Test if the collector_performance table exists
SELECT tablename FROM pg_tables WHERE tablename = 'collector_performance';

-- Test if the collector_daily_summaries table exists
SELECT tablename FROM pg_tables WHERE tablename = 'collector_daily_summaries';