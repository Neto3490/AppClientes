-- Permitir acesso de LEITURA (SELECT) para usuários não logados (anônimos)

CREATE POLICY "Permitir leitura anonima de produtos" ON public.produtos FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir leitura anonima de clientes" ON public.clientes FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir leitura anonima de vendas" ON public.vendas FOR SELECT TO anon USING (true);
CREATE POLICY "Permitir leitura anonima de itens_venda" ON public.itens_venda FOR SELECT TO anon USING (true);

-- IMPORTANTE: Se o app cliente também precisar GRAVAR as vendas sem estar logado, 
-- você precisará rodar as linhas abaixo também:
-- CREATE POLICY "Permitir insercao anonima de vendas" ON public.vendas FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "Permitir insercao anonima de itens_venda" ON public.itens_venda FOR INSERT TO anon WITH CHECK (true);
