-- ============================================================
-- ADMIN SECURITY: Row Level Security for Budget Tracker V2
-- ============================================================
-- Run these statements in order in your Supabase SQL Editor.
-- Dashboard: supabase.com → your project → SQL Editor
-- ============================================================


-- ── STEP 1: Enable RLS on both tables (if not already on) ──
-- RLS is "off" by default on new tables. When it's off,
-- ALL rows are readable/writable by anyone with your anon key.

ALTER TABLE projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;


-- ── STEP 2: Projects — users can only see their own rows ───

-- Drop old policies first to avoid "already exists" errors
DROP POLICY IF EXISTS "Users can view own projects"  ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);


-- ── STEP 3: Transactions — scoped to project owner ─────────
-- A transaction belongs to a project; the project has an owner_id.
-- We use a subquery so users can't read other people's transactions
-- even if they somehow know a project_id.

DROP POLICY IF EXISTS "Users can view own transactions"   ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);


-- ── STEP 4: Admin check — server-side email verification ───
-- This is the key security upgrade for your admin panel.
-- auth.jwt() reads the verified JWT on the server — it cannot
-- be spoofed from the client the way session.user.email can.
--
-- We create a helper function that returns TRUE only for your
-- admin email. All admin data access routes through this.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (auth.jwt() ->> 'email') = 'baseerurrehman1255@gmail.com';
$$;


-- ── STEP 5: (Optional) Admin can read ALL projects/transactions
-- Uncomment these if you want your admin panel to show real data.
-- Until then, the mock data in AdminDashboard.jsx is fine.

-- CREATE POLICY "Admin can view all projects"
--   ON projects FOR SELECT
--   USING (is_admin());

-- CREATE POLICY "Admin can view all transactions"
--   ON transactions FOR SELECT
--   USING (is_admin());


-- ── VERIFY: Check your policies were created ───────────────
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('projects', 'transactions')
ORDER BY tablename, cmd;
