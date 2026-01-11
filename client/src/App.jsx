import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, TrendingUp, RefreshCw, Search, ShoppingCart, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';

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
    } catch (error) {
      console.error("Помилка:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uploadFile = async (file, endpoint) => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('✅ Успішно оновлено!');
      fetchData(); 
    } catch (error) {
      alert('❌ Помилка завантаження');
    }
    setLoading(false);
  };

  // --- 🔥 MONEYBALL АНАЛІТИКА ---
  const analyzedProducts = useMemo(() => {
    if (!products.length || !salesHistory.length) return [];

    // 1. Рахуємо продажі по кожному товару за останні 90 днів
    const salesMap = {};
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 90);

    salesHistory.forEach(sale => {
      if (new Date(sale.date) >= cutoffDate) {
        salesMap[sale.productName] = (salesMap[sale.productName] || 0) + sale.quantity;
      }
    });

    return products.map(p => {
        const soldLast90Days = salesMap[p.name] || 0;
        const velocity = soldLast90Days / 90; // Продаж в день
        
        // 2. Розрахунок ROI
        let roi = 0;
        if (p.buyingPrice > 0) {
            roi = ((p.sellingPrice - p.buyingPrice) / p.buyingPrice) * 100;
        }

        // 3. ROP (Точка перезамовлення)
        // Логіка: (Швидкість * 21 день доставки) + (Швидкість * 7 днів запасу)
        const leadTime = 21;
        const safetyStockDays = 7;
        const rop = Math.ceil(velocity * (leadTime + safetyStockDays));

        // 4. Рекомендоване замовлення
        // Якщо ROI > 30% (Манібол) -> Запас на 60 днів
        // Якщо ROI < 30% (Дорогі) -> Запас на 30 днів
        const daysToStock = roi > 30 ? 60 : 30;
        const recommendedOrder = Math.ceil(velocity * daysToStock);

        // Статус
        let status = 'ok';
        if (p.quantity <= rop && velocity > 0) status = 'reorder';
        if (velocity === 0 && p.quantity > 0) status = 'dead';

        return { ...p, velocity, roi, rop, recommendedOrder, status };
    }).sort((a, b) => {
        // Сортуємо: спочатку ті, що треба замовити, потім по швидкості продажів
        if (a.status === 'reorder' && b.status !== 'reorder') return -1;
        if (a.status !== 'reorder' && b.status === 'reorder') return 1;
        return b.velocity - a.velocity;
    });
  }, [products, salesHistory]);


  // --- ГРАФІК КАПІТАЛУ ---
  let myCapital = 0, fatherCapital = 0, totalStockCost = 0;
  products.forEach(p => {
    const cost = p.quantity * p.buyingPrice;
    totalStockCost += cost;
    if (p.owner === 'Я') myCapital += cost;
    else if (p.owner === 'Отець') fatherCapital += cost;
    else { myCapital += cost / 2; fatherCapital += cost / 2; }
  });
  const myPercent = totalStockCost > 0 ? ((myCapital / totalStockCost) * 100).toFixed(1) : 0;
  const fatherPercent = totalStockCost > 0 ? ((fatherCapital / totalStockCost) * 100).toFixed(1) : 0;

  const chartData = {
    labels: ['Мій капітал', 'Капітал батька'],
    datasets: [{
      data: [myCapital || 1, fatherCapital || 1], 
      backgroundColor: ['#3b82f6', '#ef4444'],
      borderColor: ['#1e293b', '#1e293b'],
      borderWidth: 2,
    }],
  };

  const filteredProducts = analyzedProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            📦 Solder Moneyball
          </h1>
          <button onClick={fetchData} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
            <RefreshCw size={24} />
          </button>
        </div>

        {/* --- ALERT BLOCK: ЩО ТРЕБА КУПИТИ --- */}
        {analyzedProducts.some(p => p.status === 'reorder') && (
            <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl animate-pulse-slow">
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-red-500" size={28} />
                    <h2 className="text-2xl font-black text-red-500 uppercase tracking-wide">Термінова закупівля!</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analyzedProducts.filter(p => p.status === 'reorder').map(p => (
                        <div key={p._id} className="bg-slate-900 p-4 rounded-xl border-l-4 border-red-500 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-sm text-slate-200 truncate w-40 md:w-56">{p.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    На складі: <b className="text-white">{p.quantity}</b> шт. 
                                    (Поріг: {p.rop})
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Купити</span>
                                <div className="text-xl font-black text-white">+{p.recommendedOrder}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- MAIN STATS --- */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-3xl border border-slate-700 shadow-xl flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Чистий прибуток (за весь час)</p>
                <h2 className="text-5xl md:text-6xl font-black text-emerald-400 mt-2">
                    +{salesStats.profit.toLocaleString()} ₴
                </h2>
                <div className="mt-4 flex gap-4">
                     <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 text-xs">
                        <span className="text-slate-500 block">Замовлень</span>
                        <b className="text-white text-lg">{salesStats.count}</b>
                     </div>
                     <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 text-xs">
                        <span className="text-slate-500 block">Оборот</span>
                        <b className="text-white text-lg">{salesStats.revenue.toLocaleString()} ₴</b>
                     </div>
                </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
                <div className="relative group w-full">
                    <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload-sales')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <button className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg">
                        <Upload size={20} /> Завантажити Звіт
                    </button>
                </div>
                <div className="relative group w-full">
                    <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <button className="w-full flex justify-center items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-3 rounded-xl font-bold transition-all">
                        <Package size={20} /> Оновити Склад
                    </button>
                </div>
            </div>
        </div>

        {/* --- GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* BALANCE CHART */}
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 flex flex-col items-center">
            <h3 className="text-lg font-bold mb-6 w-full text-slate-300 uppercase tracking-wider text-center">Капітал в товарі</h3>
            <div className="w-48 h-48 relative">
                <Doughnut data={chartData} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-slate-500 text-[10px] font-bold uppercase">Всього</span>
                    <span className="font-black text-white text-lg">{Math.round(totalStockCost / 1000)}k ₴</span>
                </div>
            </div>
            <div className="w-full mt-8 space-y-4">
                <div className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Мій</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-black text-white">{myCapital.toLocaleString()} ₴</div>
                        <div className="text-[10px] text-blue-400">{myPercent}%</div>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-xs text-slate-400 font-bold uppercase">Батька</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-black text-white">{fatherCapital.toLocaleString()} ₴</div>
                        <div className="text-[10px] text-red-400">{fatherPercent}%</div>
                    </div>
                </div>
            </div>
          </div>

          {/* MONEYBALL TABLE */}
          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-400"/>
                Ефективність Складу
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16}/>
                <input type="text" placeholder="Пошук..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1 custom-scrollbar rounded-xl border border-slate-700/50">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900 z-10 text-[10px] uppercase text-slate-500 font-black">
                  <tr>
                    <th className="p-4">Товар</th>
                    <th className="p-4 text-center">ROI %</th>
                    <th className="p-4 text-center">Продаж/День</th>
                    <th className="p-4 text-center">Залишок</th>
                    <th className="p-4 text-right">Дія</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {filteredProducts.map((p) => (
                    <tr key={p._id} className={`hover:bg-slate-700/30 transition-colors ${p.status === 'reorder' ? 'bg-red-500/5' : ''}`}>
                      <td className="p-4 font-medium text-slate-200">
                        {p.name}
                        {p.owner !== 'Спільне' && (
                            <span className="ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{p.owner}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-black ${
                            p.roi > 100 ? 'bg-emerald-500/20 text-emerald-400' : 
                            p.roi > 30 ? 'bg-blue-500/20 text-blue-400' : 
                            'bg-slate-700 text-slate-400'
                        }`}>
                            {p.roi.toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-4 text-center text-slate-400">
                        {p.velocity > 0 ? p.velocity.toFixed(2) : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <div className={`font-bold ${p.quantity <= p.rop ? 'text-red-500' : 'text-white'}`}>
                            {p.quantity}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase">Мін: {p.rop}</div>
                      </td>
                      <td className="p-4 text-right">
                         {p.status === 'reorder' ? (
                            <div className="flex items-center justify-end gap-2 text-red-400 font-bold text-xs">
                                <span>ЗАМОВИТИ {p.recommendedOrder}</span>
                                <AlertTriangle size={14} />
                            </div>
                         ) : (
                            <span className="text-emerald-500 text-xs font-bold flex items-center justify-end gap-1">
                                OK <Package size={14}/>
                            </span>
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
    </div>
  );
}

export default App;