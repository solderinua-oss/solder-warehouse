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

// --- МОДЕЛИ ---
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Название
    article: { type: String, default: '' }, // Артикул
    quantity: { type: Number, default: 0 }, // В наличии
    buyingPrice: { type: Number, default: 0 }, // Цена закупки
    sellingPrice: { type: Number, default: 0 }, // Цена продажи
    category: { type: String, default: 'Склад' }, // Категория
    owner: { type: String, default: 'Shared' } // Доля (Me, Father, Shared)
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

// --- 🛠 ЖЕСТКАЯ ОЧИСТКА ЧИСЕЛ ---
// Удаляет пробелы (в т.ч. неразрывные), значки валют, меняет запятую на точку
const cleanNumber = (value) => {
    if (!value) return 0;
    // \s включает в себя пробелы, табы и неразрывные пробелы
    let str = String(value).replace(/\s/g, '').replace(/[^0-9.,-]/g, ''); 
    str = str.replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

// --- ОПРЕДЕЛЕНИЕ ВЛАДЕЛЬЦА ---
const determineOwner = (value) => {
    if (!value) return 'Shared';
    const v = String(value).toLowerCase().trim();
    if (v.includes('я') || v.includes('богдан') || v.includes('my')) return 'Me';
    if (v.includes('отец') || v.includes('папа') || v.includes('батько')) return 'Father';
    return 'Shared';
};

// --- МАРШРУТЫ ---

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

// 🔥 ЗАГРУЗКА СКЛАДА (По твоему файлу "СКЛАД ВСЯ ИНФА.xlsx")
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        console.log('🔄 Обновляю склад...');
        let updatedCount = 0;

        for (const item of data) {
            // Берем ТОЧНЫЕ названия колонок из твоего файла
            const name = item['Название'];
            
            if (name) {
                // Чистим числа от пробелов "1 200" -> 1200
                const buyingPrice = cleanNumber(item['Цена закупки']);
                const sellingPrice = cleanNumber(item['Цена продажи']);
                const quantity = cleanNumber(item['В наличии']);
                
                const article = item['Артикул'] ? String(item['Артикул']) : '';
                const category = item['Категория'] || 'Склад';
                
                // Читаем колонку "Доля"
                const ownerRaw = item['Доля'];
                const owner = determineOwner(ownerRaw);

                await Product.findOneAndUpdate(
                    { name: name },
                    { name, article, quantity, buyingPrice, sellingPrice, category, owner },
                    { upsert: true, new: true }
                );
                updatedCount++;
            }
        }
        fs.unlinkSync(req.file.path);
        console.log(`✅ Склад обновлен: ${updatedCount} товаров.`);
        res.json({ message: `Оновлено ${updatedCount} товарів. Ціни виправлені.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка обробки файлу' });
    }
});

// 🔥 ЗАГРУЗКА ЗАКАЗОВ (По твоему файлу "апдейт заказов...xlsx" лист "По позициям")
app.post('/upload-sales', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });
        const workbook = xlsx.readFile(req.file.path);
        
        // Ищем лист, где есть слово "позици" (обычно "По позициям")
        let sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('позици'));
        if (!sheetName) sheetName = workbook.SheetNames[0]; // Если не нашли, берем первый
        
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`🔄 Обрабатываю отчет: лист "${sheetName}"`);
        await Sale.deleteMany({}); 

        let salesCount = 0;
        let profitAdded = 0;

        for (const item of data) {
            // Точные названия колонок из твоего файла
            const name = item['Товар'];
            const rawStatus = item['Статус заказа'];

            if (name && rawStatus) {
                const status = String(rawStatus).trim();
                
                // Проверяем статус: Доставлен или Выполнен
                const isDelivered = status.toLowerCase().includes('доставлен') || status.toLowerCase().includes('выполнен');

                if (isDelivered) {
                    const quantity = cleanNumber(item['Кол-во']);
                    const soldPrice = cleanNumber(item['Цена продажи']);
                    const fileBuyingPrice = cleanNumber(item['Себестоимость']); 
                    let profit = cleanNumber(item['Прибыль']);

                    // Ищем товар в базе, чтобы узнать ВЛАДЕЛЬЦА (Owner)
                    let product = await Product.findOne({ name: name });
                    
                    // Если прибыль не посчитана в файле, считаем сами
                    let finalBuyingPrice = fileBuyingPrice;
                    if (finalBuyingPrice === 0 && product) {
                        finalBuyingPrice = product.buyingPrice;
                    }

                    if (profit === 0) {
                        profit = (soldPrice - finalBuyingPrice) * quantity;
                    }

                    // Определяем чьи деньги
                    let owner = 'Shared';
                    if (product && product.owner) {
                        owner = product.owner;
                    }

                    await Sale.create({
                        orderStatus: status,
                        productName: name,
                        quantity: quantity,
                        soldPrice: soldPrice,
                        buyingPriceAtSale: finalBuyingPrice,
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
        console.log(`✅ Обработано ${salesCount} продаж. Прибыль: ${profitAdded}`);
        res.json({ message: `Оброблено ${salesCount} позицій. Прибуток: ${profitAdded.toLocaleString()} ₴` });
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