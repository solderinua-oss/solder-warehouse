import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, TrendingUp, RefreshCw, Search, AlertTriangle, Target, Star, ChevronRight } from 'lucide-react';

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
    } catch (error) { console.error("Помилка:", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const uploadFile = async (file, endpoint) => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await axios.post(`${API_URL}${endpoint}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('✅ Дані оновлено!');
      fetchData(); 
    } catch (error) { alert('❌ Помилка'); }
    setLoading(false);
  };

  // --- 🔥 РОЗШИРЕНА MONEYBALL АНАЛІТИКА ---
  const analyzedData = useMemo(() => {
    if (!products.length || !salesHistory.length) return { all: [], moneyball: [], others: [] };

    const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9а-яіїєґ]/g, '').trim();

    const salesMap = {};
    const now = new Date();
    salesHistory.forEach(sale => {
      const diffDays = Math.ceil(Math.abs(now - new Date(sale.date)) / (1000 * 60 * 60 * 24));
      if (diffDays <= 90) { // Аналіз за останні 3 місяці
        const key = normalize(sale.productName);
        salesMap[key] = (salesMap[key] || 0) + sale.quantity;
      }
    });

    const all = products.map(p => {
      const cleanName = normalize(p.name);
      let soldQty = salesMap[cleanName] || 0;
      if (soldQty === 0) {
        Object.keys(salesMap).forEach(key => { if (cleanName.includes(key) || key.includes(cleanName)) soldQty += salesMap[key]; });
      }

      const velocity = soldQty / 90;
      const roi = p.buyingPrice > 0 ? ((p.sellingPrice - p.buyingPrice) / p.buyingPrice) * 100 : 0;
      
      // ІНДИВІДУАЛЬНА ЛОГІКА ДЛЯ КОЖНОЇ ПОЗИЦІЇ
      const isMoneyball = roi > 50;
      const isExpensive = p.buyingPrice > 1500;

      // Точка замовлення (ROP)
      const leadTime = 21; 
      const safetyDays = isMoneyball ? 14 : 7; // Для Moneyball тримаємо більший запас
      let rop = Math.ceil(velocity * (leadTime + safetyDays));
      if (velocity > 0 && rop === 0) rop = 1; // Захист від "Мін 0"

      // Скільки купувати
      const stockDays = isMoneyball ? 75 : (isExpensive ? 30 : 45);
      const recommendedOrder = Math.ceil(velocity * stockDays);

      let status = 'ok';
      if (velocity > 0.02 && p.quantity <= rop) status = 'reorder';

      return { ...p, velocity, roi, rop, recommendedOrder, status, isMoneyball };
    });

    return {
      all: all.sort((a, b) => b.velocity - a.velocity),
      moneyball: all.filter(p => p.isMoneyball).sort((a, b) => b.roi - a.roi),
      others: all.filter(p => !p.isMoneyball).sort((a, b) => b.velocity - a.velocity)
    };
  }, [products, salesHistory]);

  const filteredProducts = analyzedData.all.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <Target className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">SOLDER ANALYTICS <span className="text-blue-500">v2.0</span></h1>
          </div>
          <button onClick={fetchData} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition"><RefreshCw size={24} /></button>
        </div>

        {/* --- 🏆 SECTION 1: MONEYBALL CORE (Гравці, що роблять касу) --- */}
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                <Star size={24} fill="currentColor" /> MONEYBALL CORE (ROI > 50%)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analyzedData.moneyball.slice(0, 8).map(p => (
                    <div key={p._id} className="bg-slate-900 border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">ROI {p.roi.toFixed(0)}%</div>
                        <h4 className="font-bold text-sm truncate pr-10">{p.name}</h4>
                        <div className="mt-4 flex justify-between items-end">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">На складі</p>
                                <p className={`text-2xl font-black ${p.quantity <= p.rop ? 'text-red-500' : 'text-white'}`}>{p.quantity}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Мін. поріг</p>
                                <p className="text-lg font-bold text-slate-400">{p.rop}</p>
                            </div>
                        </div>
                        {p.status === 'reorder' && (
                            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-red-500 animate-pulse">
                                <span className="text-xs font-black">ТРЕБА: +{p.recommendedOrder}</span>
                                <AlertTriangle size={16} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* --- 📦 SECTION 2: ПОВНА ТАБЛИЦЯ --- */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-black uppercase tracking-widest text-slate-400">Повний Склад</h3>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-3 text-slate-600" size={18} />
                    <input type="text" placeholder="Пошук по складу..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-600 outline-none transition-all"/>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-800/50 text-[10px] font-black uppercase text-slate-500">
                        <tr>
                            <th className="p-5">Назва товару</th>
                            <th className="p-5 text-center">ROI</th>
                            <th className="p-5 text-center">Продаж/День</th>
                            <th className="p-5 text-center">Поріг (Min)</th>
                            <th className="p-5 text-center">Залишок</th>
                            <th className="p-5 text-right">Статус закупівлі</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredProducts.map(p => (
                            <tr key={p._id} className={`hover:bg-slate-800/30 transition-all ${p.status === 'reorder' ? 'bg-red-500/5' : ''}`}>
                                <td className="p-5">
                                    <div className="font-bold text-sm text-slate-200">{p.name}</div>
                                    <div className="text-[10px] text-slate-600 mt-1 uppercase">{p.category} • {p.owner}</div>
                                </td>
                                <td className="p-5 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-black ${p.isMoneyball ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                        {p.roi.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="p-5 text-center font-mono text-slate-400">{p.velocity.toFixed(2)}</td>
                                <td className="p-5 text-center font-bold text-slate-500">{p.rop}</td>
                                <td className="p-5 text-center">
                                    <span className={`text-lg font-black ${p.quantity <= p.rop ? 'text-red-500' : 'text-white'}`}>{p.quantity}</span>
                                </td>
                                <td className="p-5 text-right">
                                    {p.status === 'reorder' ? (
                                        <div className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-black text-xs">
                                            КУПИТИ +{p.recommendedOrder} <ChevronRight size={14}/>
                                        </div>
                                    ) : (
                                        <span className="text-emerald-500 font-bold text-xs uppercase tracking-widest">В наявності</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- 📤 UPLOAD SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 flex justify-between items-center group cursor-pointer relative overflow-hidden">
                <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload-sales')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div>
                    <h4 className="text-lg font-bold">Завантажити Звіт</h4>
                    <p className="text-sm text-slate-500">Оновити статистику продажів</p>
                </div>
                <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <TrendingUp size={24} />
                </div>
            </div>
            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 flex justify-between items-center group cursor-pointer relative overflow-hidden">
                <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div>
                    <h4 className="text-lg font-bold">Оновити Склад</h4>
                    <p className="text-sm text-slate-500">Завантажити поточні залишки</p>
                </div>
                <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <Package size={24} />
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default App;