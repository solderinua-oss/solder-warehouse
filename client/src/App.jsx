import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, DollarSign, TrendingUp, RefreshCw, Search, ShoppingCart } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [products, setProducts] = useState([]);
  const [salesStats, setSalesStats] = useState({ profit: 0, revenue: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = 'https://solder-warehouse.onrender.com'; 

  // Завантаження даних
  const fetchData = async () => {
    try {
      const prodRes = await axios.get(`${API_URL}/products`);
      setProducts(prodRes.data);

      const salesRes = await axios.get(`${API_URL}/sales-stats`);
      setSalesStats(salesRes.data);
    } catch (error) {
      console.error("Помилка:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Завантаження складу (Товари)
  const handleStockUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadFile(file, '/upload');
  };

  // Завантаження ПРОДАЖІВ (Замовлення)
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
      fetchData(); // Оновити всі цифри
    } catch (error) {
      alert('❌ Помилка завантаження');
    }
    setLoading(false);
  };

  // --- МАТЕМАТИКА СКЛАДУ (Потенціал) ---
  const totalStockRevenue = products.reduce((acc, item) => acc + (item.quantity * item.sellingPrice), 0);
  const potentialProfit = products.reduce((acc, item) => acc + (item.quantity * (item.sellingPrice - item.buyingPrice)), 0);

  // --- ГРАФІК ---
  const chartData = {
    labels: ['Мій капітал', 'Капітал батька'],
    datasets: [{
      data: [totalStockRevenue * 0.5, totalStockRevenue * 0.5],
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

        {/* --- БЛОК 1: РЕАЛЬНИЙ ЗАРОБІТОК (Найважливіше) --- */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-slate-800 p-6 rounded-3xl border border-emerald-500/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Ліва частина: Цифри */}
            <div className="flex items-center gap-6">
                <div className="p-4 bg-emerald-500 rounded-2xl text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <DollarSign size={40} />
                </div>
                <div>
                    <p className="text-emerald-400 font-medium tracking-wide uppercase text-sm">Реальний чистий прибуток</p>
                    <h2 className="text-4xl font-bold text-white mt-1">+{salesStats.profit.toLocaleString()} ₴</h2>
                    <p className="text-slate-400 text-sm mt-1">З проданих товарів ({salesStats.count} шт)</p>
                </div>
            </div>

            {/* Права частина: Кнопка завантаження продажів */}
            <div className="relative group">
                <input type="file" onChange={handleSalesUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx, .xls" />
                <button className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-xl font-bold transition shadow-lg group-hover:scale-105">
                    <ShoppingCart size={24} />
                    {loading ? "Рахую гроші..." : "Завантажити Звіт Продажів"}
                </button>
            </div>
          </div>
        </div>

        {/* --- БЛОК 2: СТАН СКЛАДУ (Потенціал) --- */}
        <h3 className="text-xl font-bold text-slate-400 ml-2">📊 Аналітика Складу</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Картка 1: Загальна вартість */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><Package size={28} /></div>
              <div>
                <p className="text-slate-400 text-sm">Вартість товару (Оборот)</p>
                <h3 className="text-xl font-bold">{totalStockRevenue.toLocaleString()} ₴</h3>
              </div>
            </div>
          </div>

          {/* Картка 2: Потенційний прибуток */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400"><TrendingUp size={28} /></div>
              <div>
                <p className="text-slate-400 text-sm">Потенційний прибуток (В товарі)</p>
                <h3 className="text-xl font-bold text-indigo-400">+{potentialProfit.toLocaleString()} ₴</h3>
              </div>
            </div>
          </div>

          {/* Картка 3: Кнопка оновлення складу */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 transition relative">
             <input type="file" onChange={handleStockUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls" />
             <Upload size={24} className="text-slate-400 mb-1" />
             <span className="text-sm font-medium text-slate-300">Оновити Склад (Залишки)</span>
          </div>
        </div>

        {/* ГРАФІК І ТАБЛИЦЯ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4">Баланс активів</h3>
            <div className="w-56 h-56"><Doughnut data={chartData} /></div>
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
            
            <div className="overflow-x-auto h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="text-slate-400 border-b border-slate-700 text-sm">
                    <th className="p-3">Назва</th>
                    <th className="p-3">К-сть</th>
                    <th className="p-3">Закупка</th>
                    <th className="p-3">Продаж</th>
                    <th className="p-3">Маржа</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-sm">
                  {filteredProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-750">
                      <td className="p-3">{p.name}</td>
                      <td className="p-3 font-bold text-blue-400">{p.quantity}</td>
                      <td className="p-3 text-slate-400">{p.buyingPrice} ₴</td>
                      <td className="p-3 text-white">{p.sellingPrice} ₴</td>
                      <td className="p-3 text-green-400">+{p.sellingPrice - p.buyingPrice} ₴</td>
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