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
    owner: { type: String, default: 'Спільне' } 
});
const Product = mongoose.model('Product', ProductSchema);

const SaleSchema = new mongoose.Schema({
    orderId: String, // 👈 Добавили ID заказа для группировки
    date: { type: Date, default: Date.now },
    orderStatus: String,
    productName: String,
    quantity: Number,
    soldPrice: Number,
    buyingPriceAtSale: Number,
    profit: Number,
    owner: { type: String, default: 'Спільне' }
});
const Sale = mongoose.model('Sale', SaleSchema);

// --- 🛠 ХЕЛПЕРИ ---
const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const clean = String(val).replace(/\s/g, '').replace(/[^0-9.,-]/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
};

const getVal = (obj, search) => {
    const key = Object.keys(obj).find(k => k.toLowerCase().trim().includes(search.toLowerCase()));
    return key ? obj[key] : null;
};

const getOwner = (val) => {
    if (!val) return 'Спільне';
    const v = String(val).toLowerCase().trim();
    if (v.includes('я') || v.includes('богдан')) return 'Я';
    if (v.includes('отец') || v.includes('папа') || v.includes('батько')) return 'Отець';
    return 'Спільне';
};

// --- МАРШРУТИ ---

app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// 🔥 ОБНОВЛЕННАЯ СТАТИСТИКА (Считает уникальные заказы)
app.get('/sales-stats', async (req, res) => {
    try {
        const sales = await Sale.find();
        let stats = { profit: 0, revenue: 0, count: 0, myShare: 0, fatherShare: 0 };
        
        // Сет для хранения уникальных номеров заказов
        const uniqueOrderIds = new Set();

        sales.forEach(sale => {
            const p = sale.profit || 0;
            stats.profit += p;
            stats.revenue += (sale.soldPrice * sale.quantity);
            
            // Если у заказа есть ID, добавляем его в Сет
            if (sale.orderId) {
                uniqueOrderIds.add(sale.orderId);
            }

            if (sale.owner === 'Я') stats.myShare += p;
            else if (sale.owner === 'Отець') stats.fatherShare += p;
            else { stats.myShare += p / 2; stats.fatherShare += p / 2; }
        });

        // 👈 Количество заказов = размер Сета (если пустой, считаем по записям)
        stats.count = uniqueOrderIds.size || sales.length;

        res.json(stats);
    } catch (e) { res.status(500).send(e); }
});

app.get('/sales-history', async (req, res) => {
    const sales = await Sale.find().sort({ date: -1 });
    res.json(sales);
});

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        await Product.deleteMany({});
        const productsToInsert = [];
        for (const item of data) {
            const name = getVal(item, 'Название') || getVal(item, 'Товар');
            if (name) {
                productsToInsert.push({
                    name: name.trim(),
                    article: String(getVal(item, 'Артикул') || ''),
                    quantity: parseNum(getVal(item, 'наличии')),
                    buyingPrice: parseNum(getVal(item, 'закупки')),
                    sellingPrice: parseNum(getVal(item, 'продажи')),
                    category: String(getVal(item, 'Категория') || 'Склад'),
                    owner: getOwner(getVal(item, 'Доля'))
                });
            }
        }
        if (productsToInsert.length > 0) await Product.insertMany(productsToInsert);
        fs.unlinkSync(req.file.path);
        res.json({ message: "Склад оновлено!" });
    } catch (e) { res.status(500).send(e); }
});

// 🔥 ОБНОВЛЕННАЯ ЗАГРУЗКА ПРОДАЖ (Запоминает номер заказа)
app.post('/upload-sales', upload.single('file'), async (req, res) => {
    try {
        const workbook = xlsx.readFile(req.file.path);
        let sheetName = workbook.SheetNames.find(n => n.includes('позици')) || workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        await Sale.deleteMany({});
        let added = 0;

        for (const item of data) {
            const name = getVal(item, 'Товар');
            const status = String(getVal(item, 'Статус') || '').toLowerCase();
            const orderId = String(getVal(item, 'Номер заказа') || ''); // 👈 Берем номер заказа
            
            if (name && (status.includes('доставлен') || status.includes('выполнен'))) {
                const qty = parseNum(getVal(item, 'Кол-во'));
                const sell = parseNum(getVal(item, 'Цена продажи'));
                let buy = parseNum(getVal(item, 'Себестоимость'));
                
                let product = await Product.findOne({ name: name.trim() });
                if (buy === 0 && product) buy = product.buyingPrice;
                
                let profit = parseNum(getVal(item, 'Прибыль'));
                if (profit === 0) profit = (sell - buy) * qty;

                await Sale.create({
                    orderId: orderId, // 👈 Сохраняем номер заказа
                    productName: name.trim(),
                    orderStatus: status,
                    quantity: qty,
                    soldPrice: sell,
                    buyingPriceAtSale: buy,
                    profit: profit,
                    owner: product ? product.owner : 'Спільне'
                });
                added++;
            }
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: `Оброблено ${added} позицій` });
    } catch (e) { res.status(500).send(e); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));