
-- Fix 1: contact_submissions INSERT - restrict to anon role only, not all roles
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "anon_can_submit_contact_form" ON public.contact_submissions
  FOR INSERT TO anon
  WITH CHECK (true);

-- Fix 2: Revoke SELECT on contact_submissions from anon
-- (no anon SELECT policy exists, but revoke grant-level access)
DROP POLICY IF EXISTS "Authenticated users can read contact submissions" ON public.contact_submissions;
-- Only service_role (via PHP API) should read submissions
REVOKE SELECT ON public.contact_submissions FROM anon;
REVOKE SELECT ON public.contact_submissions FROM authenticated;

-- Fix 3: blog_posts - already restricted to published=true, but role is {public}
-- Replace with explicit anon-only policy to remove from authenticated GraphQL schema
DROP POLICY IF EXISTS "Anyone can read published blog posts" ON public.blog_posts;
CREATE POLICY "anon_can_read_published_blog_posts" ON public.blog_posts
  FOR SELECT TO anon
  USING (published = true);
REVOKE SELECT ON public.blog_posts FROM authenticated;

-- Fix 4: testimonials - replace public policy with anon-only
DROP POLICY IF EXISTS "Anyone can read testimonials" ON public.testimonials;
CREATE POLICY "anon_can_read_testimonials" ON public.testimonials
  FOR SELECT TO anon
  USING (true);
REVOKE SELECT ON public.testimonials FROM authenticated;
