import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Upload, Package, DollarSign, RefreshCw, Search } from 'lucide-react';

// Реєструємо графіки
ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Завантаження товарів з сервера
  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/products');
      setProducts(res.data);
    } catch (error) {
      console.error("Сервер не відповідає:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Завантаження файлу
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('✅ Файл успішно завантажено!');
      fetchProducts(); // Оновити список
    } catch (error) {
      alert('❌ Помилка завантаження');
    }
    setLoading(false);
  };

  // Розрахунки для графіків
  const totalValue = products.reduce((acc, item) => acc + (item.quantity * item.sellingPrice), 0);
  const myShare = totalValue * 0.5; // 50%
  const fatherShare = totalValue * 0.5; // 50%

  const chartData = {
    labels: ['Мій капітал', 'Капітал батька'],
    datasets: [
      {
        data: [myShare, fatherShare],
        backgroundColor: ['#3b82f6', '#ef4444'], // Синій і Червоний
        borderColor: ['#1e293b', '#1e293b'],
        borderWidth: 2,
      },
    ],
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Заголовок */}
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            📦 Solder Warehouse
          </h1>
          <button onClick={fetchProducts} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
            <RefreshCw size={24} />
          </button>
        </div>

        {/* Картки статистики */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                <DollarSign size={32} />
              </div>
              <div>
                <p className="text-slate-400">Загальна вартість</p>
                <h3 className="text-2xl font-bold">{totalValue.toLocaleString()} ₴</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
                <Package size={32} />
              </div>
              <div>
                <p className="text-slate-400">Всього товарів</p>
                <h3 className="text-2xl font-bold">{products.length} шт</h3>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 transition relative">
             <input 
                type="file" 
                onChange={handleFileUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".xlsx, .xls"
             />
             <Upload size={32} className="text-slate-400 mb-2" />
             <span className="text-sm font-medium text-slate-300">
               {loading ? "Завантаження..." : "Завантажити Excel"}
             </span>
          </div>
        </div>

        {/* Графік і Таблиця */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Графік (Зліва) */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4">Розподіл частки (50/50)</h3>
            <div className="w-64 h-64">
              <Doughnut data={chartData} />
            </div>
            <div className="mt-4 text-center space-y-1">
              <p className="text-blue-400 font-medium">Я: {myShare.toLocaleString()} ₴</p>
              <p className="text-red-400 font-medium">Батько: {fatherShare.toLocaleString()} ₴</p>
            </div>
          </div>

          {/* Таблиця (Справа) */}
          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Склад</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={20}/>
                <input 
                  type="text" 
                  placeholder="Пошук..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="p-3">Назва</th>
                    <th className="p-3">К-сть</th>
                    <th className="p-3">Закупка</th>
                    <th className="p-3">Продаж</th>
                    <th className="p-3">Категорія</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-slate-750">
                      <td className="p-3 font-medium">{product.name}</td>
                      <td className="p-3 text-blue-400 font-bold">{product.quantity}</td>
                      <td className="p-3">{product.buyingPrice} ₴</td>
                      <td className="p-3 text-green-400">{product.sellingPrice} ₴</td>
                      <td className="p-3 text-sm text-slate-500">{product.category}</td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500">
                        Склад порожній або нічого не знайдено
                      </td>
                    </tr>
                  )}
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