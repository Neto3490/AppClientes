-- Copie e cole este script no SQL Editor do seu projeto Supabase para criar as tabelas.

-- Tabela Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    local TEXT,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    imagem TEXT,
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
    estoque INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela Vendas
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pendente', -- Pode ser 'Pago', 'Pendente', 'Parcial'
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela Itens da Venda
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configuração de Políticas de Segurança (RLS - Row Level Security)
-- Como é um app privado para uso do próprio usuário, ativamos o RLS mas liberamos tudo para usuários autenticados.

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;

-- Cria políticas permitindo acesso total para quem está logado (autenticado)
CREATE POLICY "Permitir tudo para usuários logados" ON public.clientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo para usuários logados" ON public.produtos FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo para usuários logados" ON public.vendas FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir tudo para usuários logados" ON public.itens_venda FOR ALL TO authenticated USING (true);

-- Lembre-se de criar um Storage Bucket no Supabase chamado 'produtos' e configurá-lo como "Public"
