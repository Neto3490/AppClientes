import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LogOut, TrendingUp, Users, Package, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { logout, user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    vendidoHoje: 0,
    vendidoMes: 0,
    pendente: 0,
    qtdClientes: 0,
    qtdProdutos: 0
  });
  
  const [ultimasVendas, setUltimasVendas] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      // Consultas paralelas para performance
      const [
        { data: vendasData },
        { count: countClientes },
        { count: countProdutos }
      ] = await Promise.all([
        supabase.from('vendas').select('id, total, data, status, clientes(nome)').gte('data', primeiroDiaMes.toISOString()),
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('produtos').select('*', { count: 'exact', head: true })
      ]);
      
      let vHoje = 0;
      let vMes = 0;
      let pendente = 0;
      
      // Agrupar dados pro gráfico
      const vendasPorDia = {};
      
      if (vendasData) {
        vendasData.forEach(v => {
          const valor = Number(v.total);
          const dataVenda = new Date(v.data);
          
          vMes += valor;
          if (v.status === 'Pendente' || v.status === 'Parcial') pendente += valor;
          if (dataVenda >= hoje) vHoje += valor;
          
          const dia = dataVenda.getDate().toString().padStart(2, '0');
          vendasPorDia[dia] = (vendasPorDia[dia] || 0) + valor;
        });
        
        // Formatar pro Recharts
        const chart = Object.keys(vendasPorDia).sort().map(dia => ({
          name: dia,
          valor: vendasPorDia[dia]
        }));
        setChartData(chart);
        
        // Últimas 5 vendas
        setUltimasVendas(vendasData.sort((a,b) => new Date(b.data) - new Date(a.data)).slice(0, 5));
      }

      setStats({
        vendidoHoje: vHoje,
        vendidoMes: vMes,
        pendente: pendente,
        qtdClientes: countClientes || 0,
        qtdProdutos: countProdutos || 0
      });
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px 0', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Olá! 👋</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Aqui está o seu resumo de vendas.</p>
        </div>
        <button onClick={logout} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px', borderRadius: 'var(--radius-md)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <LogOut size={18} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando dados...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #818CF8 100%)', color: 'white', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>Vendido Hoje</span>
                <TrendingUp size={16} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>R$ {stats.vendidoHoje.toFixed(2)}</div>
            </div>
            
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '12px' }}>Vendido no Mês</span>
                <TrendingUp size={16} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>R$ {stats.vendidoMes.toFixed(2)}</div>
            </div>
            
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '12px' }}>A Receber</span>
                <Clock size={16} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger)' }}>R$ {stats.pendente.toFixed(2)}</div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <Users size={14} /> Clientes
                </div>
                <strong style={{ fontSize: '14px' }}>{stats.qtdClientes}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <Package size={14} /> Produtos
                </div>
                <strong style={{ fontSize: '14px' }}>{stats.qtdProdutos}</strong>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-muted)' }}>Vendas do Mês (Por Dia)</h3>
            <div style={{ width: '100%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--background)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                    formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                  />
                  <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-muted)' }}>Últimas Vendas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ultimasVendas.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Nenhuma venda este mês.</div>
              ) : (
                ultimasVendas.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--background)' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>{v.clientes?.nome || 'Cliente'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(v.data).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)' }}>R$ {Number(v.total).toFixed(2)}</div>
                      <span className={`badge badge-${v.status.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{v.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
