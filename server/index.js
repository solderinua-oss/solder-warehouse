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
    quantity: { type: Number, default: 0 },
    buyingPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    category: { type: String, default: 'Склад' }
});
const Product = mongoose.model('Product', ProductSchema);

const SaleSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    orderStatus: String, // "Доставлено"
    productName: String,
    quantity: Number,
    soldPrice: Number,
    buyingPriceAtSale: Number,
    profit: Number
});
const Sale = mongoose.model('Sale', SaleSchema);

// --- МАРШРУТИ ---

app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// Статистика (Загальна сума)
app.get('/sales-stats', async (req, res) => {
    try {
        const sales = await Sale.find();
        const totalProfit = sales.reduce((acc, sale) => acc + (sale.profit || 0), 0);
        const totalRevenue = sales.reduce((acc, sale) => acc + (sale.soldPrice * sale.quantity), 0);
        const totalSalesCount = sales.reduce((acc, sale) => acc + sale.quantity, 0);

        res.json({ profit: totalProfit, revenue: totalRevenue, count: totalSalesCount });
    } catch (error) {
        res.status(500).json({ message: 'Помилка статистики' });
    }
});

// 🔥 НОВЕ: Отримати детальну історію продажів
app.get('/sales-history', async (req, res) => {
    try {
        // Сортуємо: останні продажі зверху
        const sales = await Sale.find().sort({ date: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Помилка отримання історії' });
    }
});

// Завантаження СКЛАДУ
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        let updatedCount = 0;
        for (const item of data) {
            const name = item['Название'] || item['Название(RU)'] || item['name'] || item['Name'];
            const quantity = item['В наличии'] || item['Количество'] || item['quantity'] || 0;
            const buyingPrice = item['Цена закупки'] || item['BuyingPrice'] || item['Закупка'] || 0;
            const sellingPrice = item['Цена продажи'] || item['SellingPrice'] || item['Продажа'] || buyingPrice;
            const category = item['Категория'] || item['Category'] || 'Склад';

            if (name) {
                await Product.findOneAndUpdate(
                    { name: name },
                    { name, quantity, buyingPrice, sellingPrice, category },
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

// 🚀 Завантаження ПРОДАЖІВ (З фільтром "Доставлено")
app.post('/upload-sales', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        await Sale.deleteMany({}); // Очищаємо стару історію

        let salesCount = 0;
        let profitAdded = 0;

        for (const item of data) {
            // Читаємо статус і дані
            const status = item['Статус заказа']; // Колонка А з твого скріншоту
            const name = item['Товар'];
            const quantity = item['Кол-во этого товара'] || 0;
            const soldPrice = item['Цена (за 1)'] || 0; 
            
            // 🔥 ГОЛОВНА ПЕРЕВІРКА: Рахуємо тільки "Доставлено"
            if (status === 'Доставлено' && name && quantity > 0) {
                
                const product = await Product.findOne({ name: name });
                const buyingPrice = product ? product.buyingPrice : 0;
                
                // Рахуємо чистий навар
                const profit = (soldPrice - buyingPrice) * quantity;

                await Sale.create({
                    orderStatus: status,
                    productName: name,
                    quantity: quantity,
                    soldPrice: soldPrice,
                    buyingPriceAtSale: buyingPrice,
                    profit: profit,
                    date: new Date()
                });

                salesCount++;
                profitAdded += profit;
            }
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: `Враховано ${salesCount} замовлень (Тільки 'Доставлено'). Прибуток: ${profitAdded.toFixed(2)} ₴` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка обробки продажів' });
    }
});

app.delete('/products', async (req, res) => {
    await Product.deleteMany({});
    res.json({ message: 'Склад очищено' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Сервер готовий на порту ${PORT}`));