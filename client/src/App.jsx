import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, DollarSign, TrendingUp, RefreshCw, Search } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ⚠️ Твоє посилання на Render
  const API_URL = 'https://solder-warehouse.onrender.com'; 

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data);
    } catch (error) {
      console.error("Ошибка сервера:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('✅ Файл успішно завантажено!');
      fetchProducts();
    } catch (error) {
      alert('❌ Помилка завантаження');
    }
    setLoading(false);
  };

  // --- МАТЕМАТИКА ПРИБУТКУ ---
  const totalCost = products.reduce((acc, item) => acc + (item.quantity * item.buyingPrice), 0);
  const totalRevenue = products.reduce((acc, item) => acc + (item.quantity * item.sellingPrice), 0);
  const totalProfit = totalRevenue - totalCost;

  // Рахуємо частку 50/50 від чистого прибутку (або від обороту, як домовитесь)
  // Тут поки лишаю від обороту, як було
  const myShare = totalRevenue * 0.5;
  const fatherShare = totalRevenue * 0.5;

  const chartData = {
    labels: ['Мій капітал', 'Капітал батька'],
    datasets: [{
      data: [myShare, fatherShare],
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
        
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            📦 Solder Warehouse
          </h1>
          <button onClick={fetchProducts} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
            <RefreshCw size={24} />
          </button>
        </div>

        {/* --- СТАТИСТИКА (4 картки) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 1. Оборот */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><DollarSign size={28} /></div>
              <div>
                <p className="text-slate-400 text-sm">Оборот (Продаж)</p>
                <h3 className="text-xl font-bold">{totalRevenue.toLocaleString()} ₴</h3>
              </div>
            </div>
          </div>

          {/* 2. ЧИСТИЙ ПРИБУТОК (Найважливіше!) */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500 blur-2xl opacity-20"></div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/20 rounded-lg text-green-400"><TrendingUp size={28} /></div>
              <div>
                <p className="text-slate-400 text-sm">Чистий Прибуток</p>
                <h3 className="text-xl font-bold text-green-400">+{totalProfit.toLocaleString()} ₴</h3>
              </div>
            </div>
          </div>
          
          {/* 3. Кількість товарів */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400"><Package size={28} /></div>
              <div>
                <p className="text-slate-400 text-sm">Позицій</p>
                <h3 className="text-xl font-bold">{products.length} шт</h3>
              </div>
            </div>
          </div>

          {/* 4. Кнопка */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 transition relative">
             <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls" />
             <Upload size={24} className="text-slate-400 mb-1" />
             <span className="text-sm font-medium text-slate-300">{loading ? "Завантаження..." : "Оновити Excel"}</span>
          </div>
        </div>

        {/* ГРАФІК І ТАБЛИЦЯ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4">Баланс (50/50)</h3>
            <div className="w-56 h-56"><Doughnut data={chartData} /></div>
            <div className="mt-4 text-center space-y-1">
              <p className="text-blue-400 font-medium">Я: {myShare.toLocaleString()} ₴</p>
              <p className="text-red-400 font-medium">Батько: {fatherShare.toLocaleString()} ₴</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Склад</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={20}/>
                <input type="text" placeholder="Пошук..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500"/>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 text-sm">
                    <th className="p-3">Назва</th>
                    <th className="p-3">К-сть</th>
                    <th className="p-3">Закупка</th>
                    <th className="p-3">Продаж</th>
                    <th className="p-3">Прибуток (шт)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-sm">
                  {filteredProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-750">
                      <td className="p-3">{p.name}</td>
                      <td className="p-3 font-bold text-blue-400">{p.quantity}</td>
                      <td className="p-3 text-slate-400">{p.buyingPrice} ₴</td>
                      <td className="p-3 text-white">{p.sellingPrice} ₴</td>
                      {/* Рахуємо маржу */}
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