require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

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
    category: { type: String, default: 'Склад' }
});
const Product = mongoose.model('Product', ProductSchema);

const SaleSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    orderStatus: String,
    productName: String,
    quantity: Number,
    soldPrice: Number,
    buyingPriceAtSale: Number,
    profit: Number
});
const Sale = mongoose.model('Sale', SaleSchema);

// --- 📧 ПОВЕРТАЄМОСЯ ДО 'service: gmail' (ВОНО МАЄ ЗАПРАЦЮВАТИ) ---
const transporter = nodemailer.createTransport({
    service: 'gmail', // 👈 Розумне авто-налаштування
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- ФУНКЦІЯ: ГЕНЕРАЦІЯ ТА ВІДПРАВКА ЗВІТУ ---
const sendMonthlyReport = async () => {
    console.log('⏳ Починаю генерацію звіту...');
    try {
        const sales = await Sale.find();
        
        // 1. Рахуємо статистику
        const productStats = {};
        let totalRevenue = 0;
        let totalProfit = 0;

        sales.forEach(sale => {
            const name = sale.productName || 'Невідомий товар';
            if (!productStats[name]) {
                productStats[name] = { qty: 0, revenue: 0, profit: 0 };
            }
            productStats[name].qty += sale.quantity;
            productStats[name].revenue += (sale.soldPrice * sale.quantity);
            productStats[name].profit += sale.profit;

            totalRevenue += (sale.soldPrice * sale.quantity);
            totalProfit += sale.profit;
        });

        // 2. Готуємо дані для Excel
        const excelData = [
            ['ЗАГАЛЬНА СТАТИСТИКА'],
            ['Всього дохід:', totalRevenue.toFixed(2) + ' грн'],
            ['Чистий прибуток:', totalProfit.toFixed(2) + ' грн'],
            ['Всього продажів:', sales.length],
            [],
            ['ДЕТАЛІЗАЦІЯ ПО ТОВАРАХ'],
            ['Товар', 'Продано (шт)', 'Виручка (грн)', 'Прибуток (грн)']
        ];

        for (const [name, stat] of Object.entries(productStats)) {
            excelData.push([name, stat.qty, stat.revenue.toFixed(2), stat.profit.toFixed(2)]);
        }

        // 3. Створюємо файл
        const ws = xlsx.utils.aoa_to_sheet(excelData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Звіт");
        const fileName = `Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        xlsx.writeFile(wb, fileName);

        // 4. Відправляємо
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `📊 Solder Warehouse: Твій звіт`,
            text: `Привіт! Ось статистика продажів. Чистий прибуток: ${totalProfit.toFixed(2)} грн.`,
            attachments: [{ path: fileName }]
        });

        console.log('✅ Лист успішно відправлено!');
        fs.unlinkSync(fileName); 
    } catch (error) {
        console.error('❌ Помилка відправки:', error);
        throw error;
    }
};

// ⏰ ПЛАНУВАЛЬНИК: Щодня о 02:40 (Київський час)
cron.schedule('40 2 * * *', () => {
    console.log('⏰ Час прийшов! Відправляю звіт...');
    sendMonthlyReport();
}, {
    scheduled: true,
    timezone: "Europe/Kiev"
});

// --- МАРШРУТИ ---

app.get('/send-report-now', async (req, res) => {
    try {
        await sendMonthlyReport();
        res.send('✅ Звіт відправлено вручну! Перевір пошту (і спам).');
    } catch (error) {
        res.status(500).send('Помилка при відправці: ' + error.message);
    }
});

app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

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

app.get('/sales-history', async (req, res) => {
    try {
        const sales = await Sale.find().sort({ date: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Помилка отримання історії' });
    }
});

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        let updatedCount = 0;
        for (const item of data) {
            const name = item['Название'] || item['Название(RU)'] || item['name'] || item['Name'];
            const article = item['Артикул'] || item['Article'] || item['sku'] || '';
            const quantity = item['В наличии'] || item['Количество'] || item['quantity'] || 0;
            const buyingPrice = item['Цена закупки'] || item['BuyingPrice'] || item['Закупка'] || 0;
            const sellingPrice = item['Цена продажи'] || item['SellingPrice'] || item['Продажа'] || buyingPrice;
            const category = item['Категория'] || item['Category'] || 'Склад';

            if (name) {
                await Product.findOneAndUpdate(
                    { name: name },
                    { name, article, quantity, buyingPrice, sellingPrice, category },
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
            if (!buyingPrice && !profit) {
                const article = item['Артикул'];
                let product = null;
                if (article) product = await Product.findOne({ article: article });
                if (!product && name) product = await Product.findOne({ name: name });
                if (product) buyingPrice = product.buyingPrice;
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