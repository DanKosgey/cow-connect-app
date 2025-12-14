-- Nuclear Option: Disable RLS Temporarily
-- To confirm RLS is the issue, temporarily disable it:
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_deductions DISABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_types DISABLE ROW LEVEL SECURITY;