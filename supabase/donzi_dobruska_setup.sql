-- Barbershop Donzi Dobruška — stejná Supabase DB jako Studio Elegance
-- Spusť v Supabase → SQL Editor (celý skript).
-- Po spuštění nastav v .env / Vercelu: VITE_BARBERSHOP_ID=<id z dotazu níže>

INSERT INTO public.showcase_barbershops (name, slug, email, sms_price, credit_balance)
VALUES ('Barbershop Donzi', 'donzi-dobruska', 'info@donzi.cz', 1.30, 500.00)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;

INSERT INTO public.showcase_services (barbershop_id, name, price, duration_minutes)
SELECT b.id, v.name, v.price, v.duration_minutes
FROM public.showcase_barbershops b
CROSS JOIN (
  VALUES
    ('Klasický střih', 400::numeric, 35),
    ('Moderní pánský střih (Fade, Taper, atd.)', 450::numeric, 45),
    ('Úprava vousů (Břitva, napaření ručníkem)', 350::numeric, 30),
    ('Komplet (Střih + Vousy + Napaření ručníkem)', 700::numeric, 60),
    ('DONZI KOMPLET (Prémiová péče + Černá maska + Masáž hlavy)', 900::numeric, 75),
    ('VIP PÉČE (Kompletní péče, maska, masáž, úprava chloupků + káva)', 1300::numeric, 90),
    ('Dětský střih (od 6 do 10 let)', 300::numeric, 25),
    ('Moderní dětský střih (od 6 do 10 let)', 350::numeric, 30),
    ('Senior střih (nad 65 let)', 300::numeric, 30),
    ('Full Head Shave (holení hlavy břitvou)', 350::numeric, 30),
    ('Full Head & Beard Shave', 500::numeric, 40),
    ('Holení vousů břitvou', 350::numeric, 20),
    ('Úprava vousů strojkem', 250::numeric, 25),
    ('Umytí vlasů + Styling', 100::numeric, 10),
    ('Úprava kontur + styling', 100::numeric, 15),
    ('Odstranění chloupků (nos, obočí nebo uši)', 100::numeric, 10),
    ('Masáž hlavy, rukou a šíje', 150::numeric, 10)
) AS v(name, price, duration_minutes)
WHERE b.slug = 'donzi-dobruska'
ON CONFLICT (barbershop_id, name) DO UPDATE SET
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes,
  is_active = TRUE;

-- Zkontroluj ID pro VITE_BARBERSHOP_ID:
SELECT id, slug, name FROM public.showcase_barbershops WHERE slug = 'donzi-dobruska';
