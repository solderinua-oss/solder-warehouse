import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, TrendingUp, RefreshCw, Search, ShoppingCart, History, CheckCircle, User, Users } from 'lucide-react';

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

  const handleStockUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadFile(file, '/upload');
  };

  const handleSalesUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadFile(file, '/upload-sales');
  };

  const uploadFile = async (file, endpoint) => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('✅ Файл успішно оброблено!');
      fetchData(); 
    } catch (error) {
      alert('❌ Помилка завантаження');
    }
    setLoading(false);
  };

  // --- ЛОГІКА ПІДРАХУНКУ КАПІТАЛУ НА СКЛАДІ ---
  // Рахуємо суму закупівельних цін (собівартість складу)
  let myCapital = 0;
  let fatherCapital = 0;
  let totalStockCost = 0;

  products.forEach(p => {
    const cost = p.quantity * p.buyingPrice; // Ціна закупки * кількість
    totalStockCost += cost;

    // Перевіряємо власника
    if (p.owner && (p.owner.toLowerCase().includes('я') || p.owner.toLowerCase().includes('богдан'))) {
        myCapital += cost;
    } else if (p.owner && (p.owner.toLowerCase().includes('отец') || p.owner.toLowerCase().includes('папа'))) {
        fatherCapital += cost;
    } else {
        // Якщо "Спільне" або пусто -> ділимо навпіл
        myCapital += cost / 2;
        fatherCapital += cost / 2;
    }
  });

  // Рахуємо відсотки для красивого відображення
  const myPercent = totalStockCost > 0 ? ((myCapital / totalStockCost) * 100).toFixed(1) : 0;
  const fatherPercent = totalStockCost > 0 ? ((fatherCapital / totalStockCost) * 100).toFixed(1) : 0;

  // Дані для графіка
  const chartData = {
    labels: ['Мій капітал', 'Капітал батька'],
    datasets: [{
      data: [myCapital, fatherCapital], 
      backgroundColor: ['#3b82f6', '#ef4444'], // Синій (Ти), Червоний (Батько)
      borderColor: ['#1e293b', '#1e293b'],
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    cutout: '70%', // Робить бублик тоншим
    plugins: {
        legend: { display: false } // Ховаємо стандартну легенду, бо у нас своя крута знизу
    }
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

        {/* --- БЛОК 1: РЕАЛЬНИЙ ЗАРОБІТОК --- */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-slate-800 p-6 rounded-3xl border border-emerald-500/30 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-emerald-500 rounded-2xl text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <CheckCircle size={40} />
                </div>
                <div>
                    <p className="text-emerald-400 font-medium tracking-wide uppercase text-sm">Реальний чистий прибуток</p>
                    <h2 className="text-5xl font-extrabold text-white mt-1 tracking-tight">+{salesStats.profit.toLocaleString()} ₴</h2>
                    <p className="text-slate-400 text-sm mt-1">Тільки "Доставлені" ({salesStats.count} шт)</p>
                </div>
            </div>
            <div className="relative group">
                <input type="file" onChange={handleSalesUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx, .xls" />
                <button className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg group-hover:scale-105">
                    <ShoppingCart size={24} />
                    {loading ? "Рахую..." : "Завантажити Звіт Продажів"}
                </button>
            </div>
          </div>
        </div>

        {/* --- РОЗДІЛЕННЯ ПРИБУТКУ (Картки) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center space-x-5 hover:border-blue-500 transition duration-300">
                <div className="p-4 bg-blue-500/20 rounded-xl text-blue-400"><User size={32} /></div>
                <div>
                    <p className="text-slate-400 text-sm font-medium uppercase">Мій чистий навар</p>
                    <h3 className="text-3xl font-bold text-blue-400">+{salesStats.myShare.toLocaleString()} ₴</h3>
                </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center space-x-5 hover:border-red-500 transition duration-300">
                <div className="p-4 bg-red-500/20 rounded-xl text-red-400"><Users size={32} /></div>
                <div>
                    <p className="text-slate-400 text-sm font-medium uppercase">Навар Батька</p>
                    <h3 className="text-3xl font-bold text-red-400">+{salesStats.fatherShare.toLocaleString()} ₴</h3>
                </div>
            </div>
        </div>

        {/* --- СТАН СКЛАДУ --- */}
        <h3 className="text-xl font-bold text-slate-400 ml-2 mt-8">📊 Аналітика Складу (Залишки)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><Package size={28} /></div>
              <div>
                <p className="text-slate-400 text-sm">Вартість складу (Закупка)</p>
                <h3 className="text-xl font-bold">{totalStockCost.toLocaleString()} ₴</h3>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400"><TrendingUp size={28} /></div>
              <div>
                <p className="text-slate-400 text-sm">Потенційний прибуток</p>
                {/* Рахуємо потенційний прибуток як: (Продаж - Закупка) * Кількість */}
                <h3 className="text-xl font-bold text-indigo-400">
                    +{products.reduce((acc, item) => acc + (item.quantity * (item.sellingPrice - item.buyingPrice)), 0).toLocaleString()} ₴
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 transition relative">
             <input type="file" onChange={handleStockUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls" />
             <Upload size={24} className="text-slate-400 mb-1" />
             <span className="text-sm font-medium text-slate-300">Оновити Склад (Залишки)</span>
          </div>
        </div>

        {/* --- ГРАФІК І ТАБЛИЦЯ --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 🔥 НОВИЙ ГРАФІК: БАЛАНС АКТИВІВ */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center justify-between">
            <h3 className="text-xl font-bold mb-4 w-full text-left">Чиї гроші в товарі?</h3>
            
            <div className="w-48 h-48 relative">
                <Doughnut data={chartData} options={chartOptions} />
                {/* Загальна сума по центру */}
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-slate-500 text-xs">Всього</span>
                    <span className="font-bold text-white text-lg">{Math.round(totalStockCost / 1000)}k ₴</span>
                </div>
            </div>

            {/* Легенда з цифрами та відсотками */}
            <div className="w-full mt-6 space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm text-slate-300">Мій капітал</span>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-white">{myCapital.toLocaleString()} ₴</div>
                        <div className="text-xs text-blue-400 font-bold">{myPercent}%</div>
                    </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm text-slate-300">Капітал батька</span>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-white">{fatherCapital.toLocaleString()} ₴</div>
                        <div className="text-xs text-red-400 font-bold">{fatherPercent}%</div>
                    </div>
                </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Наявність на складі</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={20}/>
                <input type="text" placeholder="Пошук..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500"/>
              </div>
            </div>
            
            <div className="overflow-x-auto h-96 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-800 z-10">
                  <tr className="text-slate-400 border-b border-slate-700 text-sm">
                    <th className="p-3">Назва</th>
                    <th className="p-3">К-сть</th>
                    <th className="p-3">Закупка</th>
                    <th className="p-3">Продаж</th>
                    <th className="p-3">Доля</th>
                    <th className="p-3 text-right">Маржа</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-sm">
                  {filteredProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-750 transition-colors">
                      <td className="p-3">{p.name}</td>
                      <td className="p-3 font-bold text-blue-400">{p.quantity}</td>
                      <td className="p-3 text-slate-400">{p.buyingPrice} ₴</td>
                      <td className="p-3 text-white">{p.sellingPrice} ₴</td>
                      <td className="p-3 text-xs">
                        <span className={`px-2 py-1 rounded-md font-bold uppercase ${
                            p.owner?.includes('Я') || p.owner?.includes('Богдан') ? 'bg-blue-500/20 text-blue-400' :
                            p.owner?.includes('Отец') || p.owner?.includes('Папа') ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-700 text-slate-400'
                        }`}>
                            {p.owner || '50/50'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-green-400 font-bold">+{p.sellingPrice - p.buyingPrice} ₴</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* ІСТОРІЯ УГОД (знизу) */}
        {salesHistory.length > 0 && (
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mt-8">
             <div className="flex items-center space-x-3 mb-4">
                <History className="text-emerald-400" />
                <h3 className="text-xl font-bold text-white">Деталізація успішних угод</h3>
             </div>
             <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-700 rounded-lg custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400 text-sm z-10">
                    <tr>
                      <th className="p-3">Товар</th>
                      <th className="p-3">К-сть</th>
                      <th className="p-3">Ціна продажу</th>
                      <th className="p-3">Власник</th>
                      <th className="p-3">Статус</th>
                      <th className="p-3 text-right">Чистий навар</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-sm">
                    {salesHistory.map((sale, index) => (
                      <tr key={index} className="hover:bg-slate-750 transition-colors">
                        <td className="p-3 font-medium text-slate-200">{sale.productName}</td>
                        <td className="p-3 text-blue-300">{sale.quantity} шт</td>
                        <td className="p-3 text-slate-400">{sale.soldPrice} ₴</td>
                        <td className="p-3">
                            <span className={`text-xs font-bold uppercase ${
                                sale.owner?.includes('Я') || sale.owner?.includes('Богдан') ? 'text-blue-400' :
                                sale.owner?.includes('Отец') || sale.owner?.includes('Папа') ? 'text-red-400' :
                                'text-slate-500'
                            }`}>
                                {sale.owner || '—'}
                            </span>
                        </td>
                        <td className="p-3">
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold">
                                {sale.orderStatus}
                            </span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">+{sale.profit.toLocaleString()} ₴</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;