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
    owner: { type: String, default: 'Shared' } 
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
    owner: { type: String, default: 'Shared' }
});
const Sale = mongoose.model('Sale', SaleSchema);

// --- 🛠 ХЕЛПЕРИ ---

// 1. Очищення цін від пробілів та сміття (ГОЛОВНЕ ВИПРАВЛЕННЯ)
const cleanNumber = (value) => {
    if (!value) return 0;
    // Перетворюємо в рядок, видаляємо все крім цифр, коми і крапки
    const cleanStr = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
};

// 2. Визначення власника (точно під твій файл)
const determineOwner = (row) => {
    // Шукаємо колонку "Доля" (твоя точна назва з файлу)
    const rawValue = row['Доля'] || row['доля'] || row['Share'] || row['Владелец'];
    
    if (!rawValue) return 'Shared';

    const v = String(rawValue).toLowerCase().trim();
    
    if (v.includes('я') || v.includes('богдан') || v.includes('my')) return 'Me';
    if (v.includes('отец') || v.includes('папа') || v.includes('батько')) return 'Father';
    
    return 'Shared';
};

// --- МАРШРУТИ ---

app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// СТАТИСТИКА
app.get('/sales-stats', async (req, res) => {
    try {
        const sales = await Sale.find();
        
        let totalProfit = 0;
        let totalRevenue = 0;
        let totalSalesCount = 0;
        let myShare = 0;
        let fatherShare = 0;

        sales.forEach(sale => {
            const profit = sale.profit || 0;
            totalProfit += profit;
            totalRevenue += (sale.soldPrice * sale.quantity);
            totalSalesCount += sale.quantity;

            if (sale.owner === 'Me') {
                myShare += profit;
            } else if (sale.owner === 'Father') {
                fatherShare += profit;
            } else {
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

// 🔥 ЗАВАНТАЖЕННЯ СКЛАДУ (Фікс цін + власники)
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        let updatedCount = 0;
        for (const item of data) {
            // Твої точні назви колонок з файлу
            const name = item['Название'];
            
            if (name) {
                // Використовуємо cleanNumber, щоб виправити "1 200" -> 1200
                const buyingPrice = cleanNumber(item['Цена закупки']);
                const sellingPrice = cleanNumber(item['Цена продажи']);
                const quantity = cleanNumber(item['В наличии']);
                
                const article = item['Артикул'] ? String(item['Артикул']) : '';
                const category = item['Категория'] || 'Склад';
                
                const owner = determineOwner(item);

                await Product.findOneAndUpdate(
                    { name: name },
                    { name, article, quantity, buyingPrice, sellingPrice, category, owner },
                    { upsert: true, new: true }
                );
                updatedCount++;
            }
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: `Оновлено ${updatedCount} товарів. Ціни перераховано.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка обробки файлу' });
    }
});

// ЗАВАНТАЖЕННЯ ПРОДАЖІВ
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
            // Універсальний пошук колонок для звіту продажів
            const keys = Object.keys(item);
            const findKey = (search) => keys.find(k => k.toLowerCase().trim().includes(search));

            const nameKey = findKey('товар') || findKey('название');
            const name = item[nameKey];

            if (name) {
                const statusKey = findKey('статус');
                const status = item[statusKey] ? String(item[statusKey]).trim() : '';
                
                const qty = cleanNumber(item[findKey('кол-во') || findKey('количество')]);
                const soldPrice = cleanNumber(item[findKey('цена продажи')]);
                
                let buyingPrice = cleanNumber(item[findKey('себестоимость')]);
                let profit = cleanNumber(item[findKey('прибыль')]);
                let owner = 'Shared';

                const article = item[findKey('артикул')];
                let product = null;
                
                if (article) product = await Product.findOne({ article: article });
                if (!product) product = await Product.findOne({ name: name });

                if (product) {
                    if (!buyingPrice) buyingPrice = product.buyingPrice;
                    owner = product.owner || 'Shared';
                }

                if (!profit) profit = (soldPrice - buyingPrice) * qty;

                const isDelivered = status.toLowerCase().includes('доставлен') || status.toLowerCase().includes('выполнен');

                if (isDelivered) {
                    await Sale.create({
                        orderStatus: status,
                        productName: name,
                        quantity: qty,
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