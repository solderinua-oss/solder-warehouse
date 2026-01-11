import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, TrendingUp, RefreshCw, Search, AlertTriangle, Star, DollarSign, Activity, Users, Calendar, Target } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [products, setProducts] = useState([]);
  const [salesStats, setSalesStats] = useState({ profit: 0, revenue: 0, count: 0, myShare: 0, fatherShare: 0 });
  const [salesHistory, setSalesHistory] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = 'https://solder-warehouse.onrender.com'; 

  const fetchData = async () => {
    try {
      const prodRes = await axios.get(`${API_URL}/products`);
      const salesRes = await axios.get(`${API_URL}/sales-stats`);
      const historyRes = await axios.get(`${API_URL}/sales-history`);
      setProducts(prodRes.data || []);
      setSalesStats(salesRes.data || { profit: 0, revenue: 0, count: 0, myShare: 0, fatherShare: 0 });
      setSalesHistory(historyRes.data || []);
    } catch (e) { console.error("Помилка завантаження даних:", e); }
  };

  useEffect(() => { fetchData(); }, []);

  const uploadFile = async (file, endpoint) => {
    if(!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await axios.post(`${API_URL}${endpoint}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('✅ Дані успішно завантажено!');
      fetchData(); 
    } catch (error) { alert('❌ Помилка завантаження'); }
    setLoading(false);
  };

  // --- 📊 ФІНАНСОВИЙ ЗВІТ ЗА МІСЯЦЬ ---
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthProfit = 0, myMonthShare = 0, fatherMonthShare = 0;

    salesHistory.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        const p = sale.profit || 0;
        monthProfit += p;
        if (sale.owner === 'Я') myMonthShare += p;
        else if (sale.owner === 'Отець' || sale.owner === 'Папа') fatherMonthShare += p;
        else { myMonthShare += p / 2; fatherMonthShare += p / 2; }
      }
    });

    return { monthProfit, myMonthShare, fatherMonthShare };
  }, [salesHistory]);

  // --- 🔥 MONEYBALL АНАЛІТИКА (PVS + ROP) ---
  const analyzed = useMemo(() => {
    if (!products.length) return { all: [], moneyball: [] };
    
    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9а-яіїєґ]/g, '').trim();

    const salesMap = {};
    salesHistory.forEach(s => {
      const key = normalize(s.productName);
      salesMap[key] = (salesMap[key] || 0) + (s.quantity || 0);
    });

    const items = products.map(p => {
      const nameKey = normalize(p.name);
      const artKey = normalize(p.article);
      let totalSold = salesMap[nameKey] || 0;
      
      if (totalSold === 0 && artKey) {
        Object.keys(salesMap).forEach(k => { if (k.includes(artKey) || artKey.includes(k)) totalSold += salesMap[k]; });
      }

      const velocity = totalSold / 90; 
      const profitPerUnit = (p.sellingPrice || 0) - (p.buyingPrice || 0);
      const roi = p.buyingPrice > 0 ? (profitPerUnit / p.buyingPrice) * 100 : 0;
      const pvs = p.buyingPrice > 0 ? (velocity * profitPerUnit) / p.buyingPrice : 0;

      const isTip = (p.name || '').toLowerCase().includes('жало') || (p.category || '').toLowerCase().includes('жала');
      const leadTime = 21;
      const safety = isTip ? 14 : 7;
      
      let rop = Math.ceil(velocity * (leadTime + safety));
      if (isTip && velocity > 0 && rop < 35) rop = 35; // 🔥 Твій поріг 35 для жал
      if (velocity > 0 && rop === 0) rop = 1;

      const orderDays = isTip ? 75 : (p.buyingPrice > 1500 ? 30 : 45);
      const orderQty = Math.ceil(velocity * orderDays) || (isTip ? 35 : 5);

      return { ...p, velocity, roi, pvs, rop, orderQty, isTip };
    });

    const sorted = items.sort((a, b) => b.velocity - a.velocity);
    return {
      all: sorted,
      moneyball: items.filter(i => i.pvs > 0.001).sort((a, b) => b.pvs - a.pvs).slice(0, 10)
    };
  }, [products, salesHistory]);

  const filteredProducts = analyzed.all.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.article || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <Target className="text-blue-500" size={32}/> SOLDER WAREHOUSE <span className="text-blue-500 text-sm">PRO</span>
            </h1>
            <div className="flex gap-4">
                <div className="relative overflow-hidden">
                    <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload-sales')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <button className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
                        <TrendingUp size={18}/> Завантажити Продажі
                    </button>
                </div>
                <div className="relative overflow-hidden">
                    <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <button className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center gap-2">
                        <Package size={18}/> Оновити Склад
                    </button>
                </div>
                <button onClick={fetchData} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 border border-slate-700"><RefreshCw size={22} /></button>
            </div>
        </div>

        {/* --- 💰 FINANCE BLOCK --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 p-8 rounded-3xl border border-blue-500/20 shadow-2xl relative overflow-hidden">
                <p className="text-blue-400 text-xs font-black uppercase tracking-widest">Прибуток за Січень 2026</p>
                <h2 className="text-5xl font-black text-white mt-2">+{currentMonthStats.monthProfit.toLocaleString()} ₴</h2>
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Я (Місяць)</p>
                        <p className="text-lg font-black text-blue-400">+{currentMonthStats.myMonthShare.toLocaleString()} ₴</p>
                    </div>
                    <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Отець (Місяць)</p>
                        <p className="text-lg font-black text-red-400">+{currentMonthStats.fatherMonthShare.toLocaleString()} ₴</p>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-6">
                    <h3 className="text-slate-400 font-black text-xs uppercase flex items-center gap-2">
                        <Users size={16} className="text-blue-500" /> Загальний розподіл часток
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-slate-950 rounded-2xl border-b-2 border-blue-500">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Всього Я</p>
                            <p className="text-2xl font-black text-white">{salesStats.myShare.toLocaleString()} ₴</p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-2xl border-b-2 border-red-500">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Всього Отець</p>
                            <p className="text-2xl font-black text-white">{salesStats.fatherShare.toLocaleString()} ₴</p>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-between items-center border-t border-slate-800">
                         <span className="text-[10px] text-slate-500 font-black uppercase">Глобальний чистий прибуток:</span>
                         <span className="text-2xl font-black text-emerald-500">+{salesStats.profit.toLocaleString()} ₴</span>
                    </div>
                </div>
                <div className="w-40 h-40">
                    <Doughnut data={{
                        labels: ['Я', 'Отець'],
                        datasets: [{
                            data: [salesStats.myShare || 1, salesStats.fatherShare || 1],
                            backgroundColor: ['#3b82f6', '#ef4444'],
                            borderWidth: 0, cutout: '85%'
                        }]
                    }} options={{ plugins: { legend: { display: false } } }} />
                </div>
            </div>
        </div>

        {/* --- ⭐ MONEYBALL LIST --- */}
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl">
            <h3 className="text-emerald-500 font-black flex items-center gap-2 mb-8 uppercase text-xs tracking-widest">
                <Star size={18} fill="currentColor"/> Moneyball Core (Efficiency Index)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {analyzed.moneyball.map(p => (
                    <div key={p._id} className="bg-slate-950 p-5 rounded-2xl border-l-2 border-emerald-500 hover:border-emerald-400 transition-all">
                        <p className="text-[9px] text-slate-500 font-black uppercase truncate">{p.name}</p>
                        <p className="text-2xl font-black text-white mt-1">{(p.pvs * 100).toFixed(1)}</p>
                        <p className="text-[8px] text-emerald-400 font-black uppercase mt-1">Score</p>
                    </div>
                ))}
            </div>
        </div>

        {/* --- 📊 WAREHOUSE TABLE --- */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <Activity size={20} className="text-blue-500" />
                    <h3 className="font-black uppercase text-xs tracking-widest text-white">Inventory control</h3>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-600" size={16} />
                    <input type="text" placeholder="Пошук (Назва/Артикул)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm outline-none w-72 focus:ring-1 focus:ring-blue-500"/>
                </div>
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
                            <th className="p-5 text-right">Дія</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {filteredProducts.map(p => (
                            <tr key={p._id} className={`hover:bg-slate-800/20 transition-all ${p.quantity <= p.rop && p.velocity > 0 ? 'bg-red-500/[0.04]' : ''}`}>
                                <td className="p-5">
                                    <div className="font-bold text-sm text-slate-200">{p.name}</div>
                                    <div className="text-[10px] text-slate-600 font-bold mt-1 uppercase">{p.article} • {p.owner}</div>
                                </td>
                                <td className="p-5 text-center">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded ${p.roi > 50 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                        {p.roi.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="p-5 text-center font-mono text-xs text-slate-400">{p.velocity.toFixed(2)}</td>
                                <td className="p-5 text-center font-bold text-slate-500">{p.rop}</td>
                                <td className="p-5 text-center">
                                    <span className={`text-xl font-black ${p.quantity <= p.rop && p.velocity > 0 ? 'text-red-500' : 'text-white'}`}>{p.quantity}</span>
                                </td>
                                <td className="p-5 text-right">
                                    {p.quantity <= p.rop && p.velocity > 0 ? (
                                        <div className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase inline-block">
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