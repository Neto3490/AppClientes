-- 1. Cria o bucket 'produtos' se ele não existir, definindo como público
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permite que QUALQUER pessoa visualize as imagens (SELECT)
CREATE POLICY "Imagens publicas" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'produtos');

-- 3. Permite que usuários LOGADOS façam upload (INSERT)
CREATE POLICY "Upload autenticado" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produtos');

-- 4. Permite que usuários LOGADOS atualizem/deletem imagens (UPDATE/DELETE)
CREATE POLICY "Update autenticado" ON storage.objects
FOR UPDATE TO authenticated WITH CHECK (bucket_id = 'produtos');

CREATE POLICY "Delete autenticado" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'produtos');
