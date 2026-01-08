require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🔥 Успіх! База MongoDB підключена.'))
    .catch(err => console.error('Помилка підключення:', err));

// --- МОДЕЛІ ---
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    article: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    buyingPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    category: { type: String, default: 'Склад' },
    owner: { type: String, default: 'Спільне' } // 👈 Нове поле: Власник
});
const Product = mongoose.model('Product', ProductSchema);

const SaleSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    orderStatus: String,
    productName: String,
    quantity: Number,
    soldPrice: Number,
    buyingPriceAtSale: Number,
    profit: Number,
    owner: { type: String, default: 'Спільне' } // 👈 Зберігаємо власника угоди
});
const Sale = mongoose.model('Sale', SaleSchema);

// --- МАРШРУТИ ---

app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// 🔥 ОНОВЛЕНА СТАТИСТИКА З РОЗПОДІЛОМ ПРИБУТКУ
app.get('/sales-stats', async (req, res) => {
    try {
        const sales = await Sale.find();
        
        let totalProfit = 0;
        let totalRevenue = 0;
        let totalSalesCount = 0;

        // Скарбнички для часток
        let myShare = 0;
        let fatherShare = 0;

        sales.forEach(sale => {
            const profit = sale.profit || 0;
            totalProfit += profit;
            totalRevenue += (sale.soldPrice * sale.quantity);
            totalSalesCount += sale.quantity;

            // 💰 ГОЛОВНА ЛОГІКА РОЗПОДІЛУ
            if (sale.owner && (sale.owner.toLowerCase().includes('я') || sale.owner.toLowerCase().includes('богдан'))) {
                myShare += profit; 
            } 
            else if (sale.owner && (sale.owner.toLowerCase().includes('отец') || sale.owner.toLowerCase().includes('папа') || sale.owner.toLowerCase().includes('батько'))) {
                fatherShare += profit;
            } 
            else {
                myShare += profit / 2;
                fatherShare += profit / 2;
            }
        });

        res.json({ 
            profit: totalProfit, 
            revenue: totalRevenue, 
            count: totalSalesCount,
            myShare: myShare,      
            fatherShare: fatherShare 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка статистики' });
    }
});

app.get('/sales-history', async (req, res) => {
    try {
        const sales = await Sale.find().sort({ date: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Помилка отримання історії' });
    }
});

// 🔥 ОНОВЛЕНЕ ЗАВАНТАЖЕННЯ СКЛАДУ (З ДІАГНОСТИКОЮ)
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        console.log('🔍 ПОЧИНАЮ АНАЛІЗ ФАЙЛУ СКЛАДУ...');
        
        // 1. ПОКАЗУЄМО ПЕРШИЙ РЯДОК (Щоб побачити назви колонок)
        if (data.length > 0) {
            console.log('📋 ПРИКЛАД ДАНИХ (Перший товар):');
            console.log(JSON.stringify(data[0], null, 2));
        }

        let updatedCount = 0;
        for (const item of data) {
            const name = item['Название'] || item['Название(RU)'] || item['name'] || item['Name'];
            const article = item['Артикул'] || item['Article'] || item['sku'] || '';
            const quantity = item['В наличии'] || item['Количество'] || item['quantity'] || 0;
            const buyingPrice = item['Цена закупки'] || item['BuyingPrice'] || item['Закупка'] || 0;
            const sellingPrice = item['Цена продажи'] || item['SellingPrice'] || item['Продажа'] || buyingPrice;
            const category = item['Категория'] || item['Category'] || 'Склад';
            
            // 👇 ТУТ МИ ШУКАЄМО ВЛАСНИКА (Перевіряємо всі варіанти)
            const owner = item['Доля'] || item['доля'] || item['Share'] || item['share'] || item['Владелец'] || 'Спільне';

            // 2. ДІАГНОСТИКА КОНКРЕТНОГО ТОВАРУ
            if (name && name.toLowerCase().includes('toolkitrc m6d')) {
                console.log(`🧐 ЗНАЙШОВ TOOLKITRC!`);
                console.log(`-- Значення "Доля": "${item['Доля']}"`);
                console.log(`-- Значення "Share": "${item['Share']}"`);
                console.log(`-- Що піде в базу (змінна owner): "${owner}"`);
            }

            if (name) {
                await Product.findOneAndUpdate(
                    { name: name },
                    { name, article, quantity, buyingPrice, sellingPrice, category, owner },
                    { upsert: true, new: true }
                );
                updatedCount++;
            }
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: `Оновлено ${updatedCount} товарів на складі!` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка обробки файлу' });
    }
});

// 🔥 ЗАВАНТАЖЕННЯ ПРОДАЖІВ
app.post('/upload-sales', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });
        const workbook = xlsx.readFile(req.file.path);
        
        let sheetName = workbook.SheetNames.find(n => n.includes('позици') || n.includes('Items')) || workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        await Sale.deleteMany({}); 

        let salesCount = 0;
        let profitAdded = 0;

        for (const item of data) {
            const rawStatus = item['Статус'] || item['Статус заказа'] || '';
            const status = rawStatus.toString().trim();
            const name = item['Товар'] || item['Название товара'];
            const quantity = item['Кол-во'] || item['Количество'] || 1;
            const soldPrice = item['Цена продажи (за 1)'] || item['Цена продажи'] || 0; 
            
            let buyingPrice = item['Себестоимость позиции'] || item['Себестоимость'] || 0;
            let profit = item['Прибыль позиции'] || item['Прибыль'];
            let owner = 'Спільне';

            const article = item['Артикул'];
            let product = null;
            
            if (article) product = await Product.findOne({ article: article });
            if (!product && name) product = await Product.findOne({ name: name });

            if (product) {
                if (!buyingPrice) buyingPrice = product.buyingPrice;
                if (product.owner) owner = product.owner; 
            }

            if (!profit) profit = (soldPrice - buyingPrice) * quantity;

            const isDelivered = status.toLowerCase().includes('доставлен') || status.toLowerCase().includes('выполнен');

            if (isDelivered && name) {
                await Sale.create({
                    orderStatus: status,
                    productName: name,
                    quantity: quantity,
                    soldPrice: soldPrice,
                    buyingPriceAtSale: buyingPrice,
                    profit: profit, 
                    owner: owner, 
                    date: new Date()
                });

                salesCount++;
                profitAdded += profit;
            }
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: `Оброблено ${salesCount} позицій. Прибуток: ${profitAdded.toFixed(2)} ₴` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка обробки звіту' });
    }
});

app.delete('/products', async (req, res) => {
    await Product.deleteMany({});
    res.json({ message: 'Склад очищено' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Сервер готовий на порту ${PORT}`));