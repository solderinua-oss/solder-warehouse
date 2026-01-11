import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, TrendingUp, RefreshCw, Search, AlertTriangle, Star, ShoppingCart, DollarSign, List } from 'lucide-react';

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
      alert('✅ Дані успішно завантажено!');
      fetchData(); 
    } catch (error) { alert('❌ Помилка завантаження'); }
    setLoading(false);
  };

  // --- 🔥 ГЛИБОКА MONEYBALL АНАЛІТИКА (v3) ---
  const analyzedData = useMemo(() => {
    if (!products.length || !salesHistory.length) return { all: [], moneyball: [], alerts: [] };

    const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    // 1. Збираємо продажі за останні 90 днів
    const salesByArticul = {};
    const salesByName = {};
    const now = new Date();

    salesHistory.forEach(sale => {
      const diffDays = (now - new Date(sale.date)) / (1000 * 60 * 60 * 24);
      if (diffDays <= 90) {
        const nameKey = normalize(sale.productName);
        salesByName[nameKey] = (salesByName[nameKey] || 0) + sale.quantity;
      }
    });

    const all = products.map(p => {
      const nameKey = normalize(p.name);
      const articulKey = normalize(p.article);
      
      // Шукаємо продажі: по імені АБО якщо артикул входить в назву продажу
      let soldQty = salesByName[nameKey] || 0;
      if (soldQty === 0 && articulKey) {
          Object.keys(salesByName).forEach(key => {
              if (key.includes(articulKey) || articulKey.includes(key)) soldQty += salesByName[key];
          });
      }

      const velocity = soldQty / 90; // Продаж в день
      const roi = p.buyingPrice > 0 ? ((p.sellingPrice - p.buyingPrice) / p.buyingPrice) * 100 : 0;
      
      const isTip = p.name.toLowerCase().includes('жало') || p.category.toLowerCase().includes('жала');
      const isMoneyball = roi > 50 || isTip;
      const isExpensive = p.buyingPrice > 1500;

      // ПОРІГ (ROP)
      let rop = 0;
      if (velocity > 0) {
          const leadTime = 21;
          const safety = isMoneyball ? 14 : 7;
          rop = Math.ceil(velocity * (leadTime + safety));
          // Спеціальна умова для жал: мінімум 35, як просив Богдан
          if (isTip && rop < 35) rop = 35;
          // Для інших ходових товарів мінімум 1
          if (rop === 0) rop = 1;
      }

      // СКІЛЬКИ КУПУВАТИ (Order Qty)
      const daysToStock = isMoneyball ? 75 : (isExpensive ? 30 : 45);
      const recommendedOrder = Math.ceil(velocity * daysToStock) || (isMoneyball ? 20 : 5);

      let status = 'ok';
      if (velocity > 0 && p.quantity <= rop) status = 'reorder';
      if (velocity === 0 && p.quantity === 0) status = 'dead';

      return { ...p, velocity, roi, rop, recommendedOrder, status, isMoneyball };
    });

    const sortedAll = all.sort((a, b) => b.velocity - a.velocity);

    return {
      all: sortedAll,
      moneyball: sortedAll.filter(p => p.isMoneyball && p.velocity > 0).slice(0, 10),
      alerts: sortedAll.filter(p => p.status === 'reorder')
    };
  }, [products, salesHistory]);

  const filteredProducts = analyzedData.all.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.article.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER & UPLOAD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Package className="text-blue-500" size={40} /> 
              SOLDER <span className="text-blue-500">PRO</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-widest">Система управління капіталом складу</p>
          </div>
          <div className="flex gap-3">
            <div className="relative group">
                <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload-sales')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20">
                    <TrendingUp size={18} /> Звіт Продажів
                </button>
            </div>
            <div className="relative group">
                <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold transition-all border border-slate-700">
                    <Package size={18} /> Стан Складу
                </button>
            </div>
            <button onClick={fetchData} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 border border-slate-700"><RefreshCw size={22} /></button>
          </div>
        </div>

        {/* --- 💰 SECTION: ПРИБУТОК ТА СТАТИСТИКА --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500"><DollarSign size={80} /></div>
                <p className="text-slate-400 text-xs font-bold uppercase">Чистий прибуток</p>
                <h2 className="text-4xl font-black text-emerald-400 mt-1">+{salesStats.profit.toLocaleString()} ₴</h2>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center">
                <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Всього замовлень</p>
                    <h2 className="text-3xl font-black text-white mt-1">{salesStats.count}</h2>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><ShoppingCart size={24}/></div>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center">
                <div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Загальний оборот</p>
                    <h2 className="text-3xl font-black text-white mt-1">{salesStats.revenue.toLocaleString()} ₴</h2>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl"><TrendingUp size={24}/></div>
            </div>
        </div>

        {/* --- 🚨 ALERT: ТЕРМІНОВА ЗАКУПІВЛЯ --- */}
        {analyzedData.alerts.length > 0 && (
            <div className="bg-red-500/5 border-2 border-red-500/20 rounded-3xl p-6">
                <h3 className="text-red-500 font-black flex items-center gap-2 mb-6 uppercase tracking-wider">
                    <AlertTriangle size={20} /> Увага: Товар закінчується!
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analyzedData.alerts.map(p => (
                        <div key={p._id} className="bg-slate-900 border-l-4 border-red-500 p-4 rounded-xl flex justify-between items-center shadow-lg">
                            <div className="max-w-[180px]">
                                <h4 className="font-bold text-sm text-white truncate">{p.name}</h4>
                                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Залишок: {p.quantity} / Мін: {p.rop}</p>
                            </div>
                            <div className="bg-red-500/10 px-3 py-2 rounded-lg text-center">
                                <span className="text-[9px] text-red-400 font-black block uppercase">Купити</span>
                                <span className="text-lg font-black text-red-500">+{p.recommendedOrder}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- ⭐ MONEYBALL CORE LIST --- */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-emerald-500 font-black flex items-center gap-2 mb-6 uppercase tracking-wider">
                <Star size={20} fill="currentColor"/> Moneyball Core (Пріоритет закупівлі)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                {analyzedData.moneyball.map(p => (
                    <div key={p._id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <p className="text-slate-500 text-[9px] font-black uppercase truncate">{p.name}</p>
                        <div className="text-xl font-black text-white mt-1">{p.roi.toFixed(0)}%</div>
                        <p className="text-[9px] text-emerald-500 font-bold uppercase">ROI Ефективність</p>
                    </div>
                ))}
            </div>
        </div>

        {/* --- 📊 СКЛАД ТА ПОШУК --- */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                    <List size={18} className="text-blue-500" /> Повний список товарів
                </h3>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-600" size={16} />
                    <input type="text" placeholder="Пошук (Назва або Артикул)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none w-64 transition-all"/>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-800/30 text-[10px] uppercase font-black text-slate-500">
                        <tr>
                            <th className="p-5">Товар / Артикул</th>
                            <th className="p-5 text-center">ROI</th>
                            <th className="p-5 text-center">Швидкість (шт/день)</th>
                            <th className="p-5 text-center">Поріг (Замов при)</th>
                            <th className="p-5 text-center">На складі</th>
                            <th className="p-5 text-right">Статус</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {filteredProducts.map(p => (
                            <tr key={p._id} className={`hover:bg-slate-800/20 transition-colors ${p.status === 'reorder' ? 'bg-red-500/[0.03]' : ''}`}>
                                <td className="p-5">
                                    <div className="font-bold text-sm text-slate-200">{p.name}</div>
                                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">{p.article || '---'}</div>
                                </td>
                                <td className="p-5 text-center">
                                    <span className={`text-xs font-black px-2 py-1 rounded ${p.roi > 50 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                        {p.roi.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="p-5 text-center font-mono text-slate-400">{p.velocity > 0 ? p.velocity.toFixed(2) : '-'}</td>
                                <td className="p-5 text-center">
                                    <span className="text-slate-500 font-bold text-sm">{p.rop} шт</span>
                                </td>
                                <td className="p-5 text-center">
                                    <span className={`text-lg font-black ${p.quantity <= p.rop && p.velocity > 0 ? 'text-red-500' : 'text-white'}`}>
                                        {p.quantity}
                                    </span>
                                </td>
                                <td className="p-5 text-right">
                                    {p.status === 'reorder' ? (
                                        <div className="inline-flex flex-col items-end">
                                            <span className="text-red-500 font-black text-xs uppercase">Замовити: +{p.recommendedOrder}</span>
                                            <span className="text-[9px] text-slate-600 font-bold uppercase">Терміново</span>
                                        </div>
                                    ) : (
                                        <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-tighter">Ок</span>
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