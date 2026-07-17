-- Sekar Inn: fresh schema + default data for the NEW Supabase project
-- (fcrcwouvwkfopvdzslft). Run this once in that project's SQL Editor.
--
-- Fixes two bugs found on the old database while building this:
--   1. rooms previously had `id` alone as the primary key, so a second
--      account's room-seeding silently collided with the first account's
--      rows. Fixed here with a surrogate key + UNIQUE(user_id, id).
--   2. futureBookings/percentage columns are typed correctly from the
--      start (jsonb / numeric) instead of missing or integer-only.

-- ── ROOMS ──────────────────────────────────────────────────────────
CREATE TABLE public.rooms (
  pk uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id text NOT NULL,
  user_id uuid,
  floor integer NOT NULL,
  "roomType" text NOT NULL,
  status text NOT NULL DEFAULT 'vacant',
  "isAC" boolean NOT NULL DEFAULT false,
  "basePrice" numeric(10,2) NOT NULL DEFAULT 0,
  "extraBedPrice" numeric(10,2) DEFAULT 500,
  "extraBedsCount" integer DEFAULT 0,
  "numberOfPeople" integer,
  "guestName" text DEFAULT '',
  "guestId" text DEFAULT '',
  "guestGst" text DEFAULT '',
  "checkInDate" text DEFAULT '',
  "checkOutDate" text DEFAULT '',
  "expectedTime" text DEFAULT '',
  "maintenanceIssue" text DEFAULT '',
  "maintenancePriority" text DEFAULT 'Low',
  "maintenanceNotes" text DEFAULT '',
  "amountDue" numeric(10,2) DEFAULT 0,
  "futureBookings" jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (user_id, id)
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select" ON public.rooms FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE
  USING (auth.uid() = user_id);

-- Default 13-room layout, unclaimed (user_id NULL) — the app auto-claims
-- these for whichever account logs in first, same as the old DB's
-- existing orphan-room-claiming logic.
INSERT INTO public.rooms (id, user_id, floor, "roomType", status, "isAC", "basePrice", "extraBedPrice", "extraBedsCount", "guestName", "guestId", "amountDue", "maintenancePriority", "maintenanceNotes") VALUES
  ('101', NULL, 1, 'Triple Room (AC)', 'vacant', true, 2500, 500, 0, '', '', 0, 'Low', ''),
  ('102', NULL, 1, 'Triple Room (AC)', 'vacant', true, 2500, 500, 0, '', '', 0, 'Low', ''),
  ('103', NULL, 1, 'Triple Room (AC)', 'vacant', true, 2500, 500, 0, '', '', 0, 'Low', ''),
  ('104', NULL, 1, 'Double Room (AC)', 'vacant', true, 2000, 500, 0, '', '', 0, 'Low', ''),
  ('105', NULL, 1, 'Triple Room (AC)', 'vacant', true, 2500, 500, 0, '', '', 0, 'Low', ''),
  ('106', NULL, 1, 'Double Room (AC)', 'vacant', true, 2000, 500, 0, '', '', 0, 'Low', ''),
  ('107', NULL, 1, 'Four Sharing (AC)', 'vacant', true, 3000, 500, 0, '', '', 0, 'Low', ''),
  ('108', NULL, 1, 'Triple Room (AC)', 'vacant', true, 2500, 500, 0, '', '', 0, 'Low', ''),
  ('109', NULL, 1, 'Queen Suite (5 sharing) (AC)', 'vacant', true, 3500, 500, 0, '', '', 0, 'Low', ''),
  ('110', NULL, 1, 'King Suite (6 sharing) (AC)', 'vacant', true, 4000, 500, 0, '', '', 0, 'Low', ''),
  ('201', NULL, 2, '10 Sharing (Non-AC)', 'vacant', false, 6000, 500, 0, '', '', 0, 'Low', ''),
  ('202', NULL, 2, 'Triple Room (Non-AC)', 'vacant', false, 1500, 500, 0, '', '', 0, 'Low', ''),
  ('203', NULL, 2, 'Driver Room (triple) (Non-AC)', 'vacant', false, 1500, 500, 0, '', '', 0, 'Low', '');

-- ── INVOICES ───────────────────────────────────────────────────────
-- Created empty per your call to skip migrating the old test invoices.
CREATE TABLE public.invoices (
  pk uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id text NOT NULL,
  user_id uuid,
  "customerName" text,
  "customerEmail" text DEFAULT '',
  "customerPhone" text DEFAULT '',
  "customerGst" text,
  "numberOfPeople" integer,
  "roomNumber" text,
  "roomType" text,
  "checkInDate" text,
  "checkOutDate" text,
  date text,
  "totalNights" integer,
  "lineItems" jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  subtotal numeric(10,2) DEFAULT 0,
  cgst numeric(10,2) DEFAULT 0,
  sgst numeric(10,2) DEFAULT 0,
  "grandTotal" numeric(10,2) DEFAULT 0,
  status text DEFAULT 'Draft',
  UNIQUE (user_id, id)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ── SETTINGS ───────────────────────────────────────────────────────
-- Single shared row (id='default'), matching the old DB's design —
-- the app looks this row up by id regardless of who's logged in.
CREATE TABLE public.settings (
  id text PRIMARY KEY,
  user_id uuid,
  address text DEFAULT '',
  phone text DEFAULT '',
  gstin text DEFAULT '',
  "cgstPercentage" numeric(5,2) DEFAULT 9,
  sgstpercentage numeric(5,2) DEFAULT 9,
  defaultcheckintime text DEFAULT '12:00',
  defaultcheckouttime text DEFAULT '11:00',
  "bedsheetSmallPrice" numeric(10,2) DEFAULT 150,
  "bedsheetLargePrice" numeric(10,2) DEFAULT 250,
  "extraBedPrice" numeric(10,2) DEFAULT 500,
  "towelPrice" numeric(10,2) DEFAULT 50,
  "pillowCoverPrice" numeric(10,2) DEFAULT 30
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON public.settings FOR SELECT
  USING (true);
CREATE POLICY "settings_insert" ON public.settings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "settings_update" ON public.settings FOR UPDATE
  USING (true) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.settings (id, user_id, address, phone, gstin, "cgstPercentage", sgstpercentage, defaultcheckintime, defaultcheckouttime, "bedsheetSmallPrice", "bedsheetLargePrice", "extraBedPrice", "towelPrice", "pillowCoverPrice")
VALUES (
  'default', NULL,
  'Flat No.: 3, LAKSHMIMANAGARAM MIDDLE STREET, Arumuganeri, Thoothukudi, Tamil Nadu - 628202',
  '+91 86670 92950',
  '33KKRPS8566Q1ZK',
  9, 9, '12:00', '11:00', 150, 250, 500, 50, 30
);

NOTIFY pgrst, 'reload schema';
