import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, TrendingUp, RefreshCw, Search, ShoppingCart, History, CheckCircle } from 'lucide-react';

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
      setProducts(prodRes.data);

      const salesRes = await axios.get(`${API_URL}/sales-stats`);
      setSalesStats(salesRes.data);

      const historyRes = await axios.get(`${API_URL}/sales-history`);
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

  // --- ЛОГІКА ДЛЯ ГРАФІКА КАПІТАЛУ ---
  let myCapital = 0;
  let fatherCapital = 0;
  let totalStockCost = 0;

  products.forEach(p => {
    const cost = p.quantity * p.buyingPrice;
    totalStockCost += cost;
    if (p.owner === 'Я') {
        myCapital += cost;
    } else if (p.owner === 'Отець') {
        fatherCapital += cost;
    } else {
        myCapital += cost / 2;
        fatherCapital += cost / 2;
    }
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ЗАГОЛОВОК */}
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            📦 Solder Warehouse
          </h1>
          <button onClick={fetchData} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
            <RefreshCw size={24} />
          </button>
        </div>

        {/* --- ГОЛОВНИЙ ПРИБУТОК --- */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-slate-800 p-8 rounded-3xl border border-emerald-500/30 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
                <div className="p-5 bg-emerald-500 rounded-2xl text-slate-900 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    <CheckCircle size={48} />
                </div>
                <div>
                    <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs">Загальний чистий прибуток</p>
                    <h2 className="text-6xl font-black text-white mt-1 tracking-tight">
                        +{salesStats.profit.toLocaleString()} ₴
                    </h2>
                    <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
                        <ShoppingCart size={16}/> Виконано замовлень: <b>{salesStats.count}</b>
                    </p>
                </div>
            </div>
            <div className="relative group">
                <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload-sales')} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx, .xls" />
                <button className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-5 rounded-2xl font-black transition-all shadow-lg group-hover:scale-105 active:scale-95">
                    <Upload size={24} />
                    {loading ? "Обробка..." : "ЗАВАНТАЖИТИ ЗВІТ ПРОДАЖІВ"}
                </button>
            </div>
          </div>
        </div>

        {/* --- ІСТОРІЯ УГОД --- */}
        {salesHistory.length > 0 && (
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
             <div className="flex items-center space-x-3 mb-6">
                <History className="text-emerald-400" />
                <h3 className="text-xl font-bold text-white tracking-tight">Історія успішних угод</h3>
             </div>
             <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-700 rounded-xl custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400 text-xs z-10 uppercase">
                    <tr>
                      <th className="p-4">Товар</th>
                      <th className="p-4">К-сть</th>
                      <th className="p-4">Ціна</th>
                      <th className="p-4">Статус</th>
                      <th className="p-4 text-right">Навар</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {salesHistory.map((sale, index) => (
                      <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                        <td className="p-4 font-medium text-slate-200">{sale.productName}</td>
                        <td className="p-4 text-blue-300 font-bold">{sale.quantity} шт</td>
                        <td className="p-4 text-slate-400">{sale.soldPrice.toLocaleString()} ₴</td>
                        <td className="p-4">
                            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-emerald-500/20">
                                {sale.orderStatus}
                            </span>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-400">+{sale.profit.toLocaleString()} ₴</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- СТАТИСТИКА СКЛАДУ --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Package size={28} /></div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Склад (Закупка)</p>
                <h3 className="text-2xl font-black">{totalStockCost.toLocaleString()} ₴</h3>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><TrendingUp size={28} /></div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Очікуваний прибуток</p>
                <h3 className="text-2xl font-black text-indigo-400">
                    +{products.reduce((acc, item) => acc + (item.quantity * (item.sellingPrice - item.buyingPrice)), 0).toLocaleString()} ₴
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 transition relative group">
             <input type="file" onChange={(e) => uploadFile(e.target.files[0], '/upload')} className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls" />
             <Upload size={24} className="text-slate-500 group-hover:text-blue-400 transition" />
             <span className="text-xs font-bold text-slate-400 mt-2 uppercase">Оновити Залишки Складу</span>
          </div>
        </div>

        {/* --- ГРАФІК ТА ТАБЛИЦЯ СКЛАДУ --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 flex flex-col items-center">
            <h3 className="text-lg font-bold mb-6 w-full text-slate-300 uppercase tracking-wider text-center">Баланс активів</h3>
            <div className="w-52 h-52 relative">
                <Doughnut data={chartData} options={{ cutout: '75%', plugins: { legend: { display: false } } }} />
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-slate-500 text-[10px] font-bold uppercase">Всього</span>
                    <span className="font-black text-white text-xl">{Math.round(totalStockCost / 1000)}k ₴</span>
                </div>
            </div>
            
            {/* 🔥 ОБНОВЛЕННАЯ ЛЕГЕНДА С ГРИВНАМИ */}
            <div className="w-full mt-8 space-y-4">
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                            <span className="text-xs text-slate-400 font-bold uppercase">Мій капітал</span>
                        </div>
                        <span className="text-xs font-black text-blue-400">{myPercent}%</span>
                    </div>
                    <div className="text-xl font-black text-white">
                        {myCapital.toLocaleString()} <span className="text-sm font-normal text-slate-500">₴</span>
                    </div>
                </div>

                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                            <span className="text-xs text-slate-400 font-bold uppercase">Капітал батька</span>
                        </div>
                        <span className="text-xs font-black text-red-400">{fatherPercent}%</span>
                    </div>
                    <div className="text-xl font-black text-white">
                        {fatherCapital.toLocaleString()} <span className="text-sm font-normal text-slate-500">₴</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h3 className="text-xl font-bold tracking-tight">Наявність на складі</h3>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={18}/>
                <input type="text" placeholder="Швидкий пошук..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition"/>
              </div>
            </div>
            
            <div className="overflow-x-auto h-[480px] overflow-y-auto custom-scrollbar border border-slate-700/50 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-800 z-10 text-[10px] uppercase text-slate-500 font-black">
                  <tr className="border-b border-slate-700">
                    <th className="p-4">Назва</th>
                    <th className="p-4">К-сть</th>
                    <th className="p-4">Закупка</th>
                    <th className="p-4">Доля</th>
                    <th className="p-4 text-right">Маржа</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {filteredProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 text-slate-300 font-medium">{p.name}</td>
                      <td className="p-4 font-bold text-blue-400">{p.quantity}</td>
                      <td className="p-4 text-slate-500">{p.buyingPrice.toLocaleString()} ₴</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-black uppercase ${p.owner === 'Я' ? 'text-blue-400' : 'text-red-400'}`}>
                            {p.owner}
                        </span>
                      </td>
                      <td className="p-4 text-right text-emerald-400 font-bold">+{ (p.sellingPrice - p.buyingPrice).toLocaleString() } ₴</td>
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