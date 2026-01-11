import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, TrendingUp, RefreshCw, Search, AlertTriangle, Star, DollarSign, Activity } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [products, setProducts] = useState([]);
  const [salesStats, setSalesStats] = useState({ profit: 0, revenue: 0, count: 0 });
  const [salesHistory, setSalesHistory] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = 'https://solder-warehouse.onrender.com'; 

  const fetchData = async () => {
    try {
      const prodRes = await axios.get(`${API_URL}/products`);
      const salesRes = await axios.get(`${API_URL}/sales-stats`);
      const historyRes = await axios.get(`${API_URL}/sales-history`);
      setProducts(prodRes.data);
      setSalesStats(salesRes.data);
      setSalesHistory(historyRes.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const uploadFile = async (file, endpoint) => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await axios.post(`${API_URL}${endpoint}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('✅ Дані завантажено!');
      fetchData(); 
    } catch (e) { alert('❌ Помилка'); }
    setLoading(false);
  };

  const analyzed = useMemo(() => {
    if (!products.length || !salesHistory.length) return { all: [], moneyball: [] };

    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9а-яіїєґ]/g, '').trim();

    // Розрахунок швидкості та волатильності
    const salesData = {};
    salesHistory.forEach(s => {
      const key = normalize(s.productName);
      if (!salesData[key]) salesData[key] = [];
      salesData[key].push(s.quantity);
    });

    const items = products.map(p => {
      const key = normalize(p.name);
      const artKey = normalize(p.article);
      let totalSold = 0;
      
      // Співставлення
      Object.keys(salesData).forEach(k => {
        if (k === key || (artKey && k.includes(artKey))) {
          totalSold += salesData[k].reduce((a, b) => a + b, 0);
        }
      });

      const velocity = totalSold / 90; // за 3 місяці
      const profitPerUnit = p.sellingPrice - p.buyingPrice;
      const roi = p.buyingPrice > 0 ? (profitPerUnit / p.buyingPrice) * 100 : 0;
      
      // Moneyball Formula: Product Value Score
      const pvs = p.buyingPrice > 0 ? (velocity * profitPerUnit) / p.buyingPrice : 0;

      // Точка замовлення (ROP) за формулою Safety Stock
      const isTip = p.name.toLowerCase().includes('жало');
      const leadTime = 21;
      const safetyBuffer = isTip ? 14 : 7;
      
      let rop = Math.ceil(velocity * (leadTime + safetyBuffer));
      if (isTip && rop < 35) rop = 35; // Твоя умова для жал
      if (velocity > 0 && rop === 0) rop = 1;

      // Скільки купувати
      const orderDays = isTip ? 75 : (p.buyingPrice > 1500 ? 30 : 45);
      const orderQty = Math.ceil(velocity * orderDays) || (isTip ? 30 : 5);

      return { ...p, velocity, roi, pvs, rop, orderQty, isTip };
    });

    return {
      all: items.sort((a, b) => b.velocity - a.velocity),
      moneyball: items.filter(i => i.pvs > 0.05).sort((a, b) => b.pvs - a.pvs).slice(0, 10)
    };
  }, [products, salesHistory]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* STATS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Прибуток</p>
                <h2 className="text-3xl font-black text-white">+{salesStats.profit.toLocaleString()} ₴</h2>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Оборот</p>
                <h2 className="text-3xl font-black text-white">{salesStats.revenue.toLocaleString()} ₴</h2>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl col-span-2 flex justify-end gap-4">
                <div className="relative overflow-hidden group">
                    <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload-sales')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <button className="h-full px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center gap-2">
                        <TrendingUp size={18}/> Звіт Продажів
                    </button>
                </div>
                <div className="relative overflow-hidden group">
                    <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <button className="h-full px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2">
                        <Package size={18}/> Склад
                    </button>
                </div>
            </div>
        </div>

        {/* MONEYBALL CORE */}
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
            <h3 className="text-emerald-500 font-black flex items-center gap-2 mb-8 uppercase text-sm tracking-widest">
                <Star size={18} fill="currentColor"/> Moneyball Core (Найвищий PVS)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {analyzed.moneyball.map(p => (
                    <div key={p._id} className="bg-slate-950 p-4 rounded-xl border-l-2 border-emerald-500">
                        <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{p.name}</p>
                        <p className="text-xl font-black text-white mt-1">{(p.pvs * 100).toFixed(1)}</p>
                        <p className="text-[8px] text-emerald-400 font-black uppercase mt-1">Efficiency Score</p>
                    </div>
                ))}
            </div>
        </div>

        {/* FULL TABLE */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Activity size={20} className="text-blue-500" />
                    <h3 className="font-black uppercase text-xs tracking-tighter">Inventory Control</h3>
                </div>
                <input type="text" placeholder="Пошук..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm outline-none w-64 focus:ring-1 focus:ring-blue-500"/>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-800/40 text-[9px] font-black uppercase text-slate-500">
                        <tr>
                            <th className="p-5">Товар</th>
                            <th className="p-5 text-center">ROI %</th>
                            <th className="p-5 text-center">Продаж/День</th>
                            <th className="p-5 text-center">Поріг (Min)</th>
                            <th className="p-5 text-center">На складі</th>
                            <th className="p-5 text-right">Закупка</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {analyzed.all.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                            <tr key={p._id} className={`hover:bg-slate-800/20 transition-all ${p.quantity <= p.rop && p.velocity > 0 ? 'bg-red-500/[0.03]' : ''}`}>
                                <td className="p-5">
                                    <div className="font-bold text-sm text-slate-200">{p.name}</div>
                                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">{p.article}</div>
                                </td>
                                <td className="p-5 text-center">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded ${p.roi > 50 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                        {p.roi.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="p-5 text-center font-mono text-xs">{p.velocity.toFixed(2)}</td>
                                <td className="p-5 text-center font-bold text-sm text-slate-500">{p.rop}</td>
                                <td className="p-5 text-center">
                                    <span className={`text-xl font-black ${p.quantity <= p.rop && p.velocity > 0 ? 'text-red-500' : 'text-white'}`}>
                                        {p.quantity}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    {p.quantity <= p.rop && p.velocity > 0 ? (
                                        <div className="inline-block bg-red-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase">
                                            Купити +{p.orderQty}
                                        </div>
                                    ) : (
                                        <span className="text-emerald-600 font-bold text-[10px] uppercase">Ок</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;