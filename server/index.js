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

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    buyingPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    category: { type: String, default: 'Товар' }
});
const Product = mongoose.model('Product', ProductSchema);

// --- МАРШРУТИ ---

app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не знайдено' });

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let updatedCount = 0;
        for (const item of data) {
            // --- ОСЬ ТУТ МАГІЯ ДЛЯ ТВОГО ФАЙЛУ ---
            // Ми шукаємо колонки з твого скріншоту
            const name = item['Название(RU)'] || item['Название'] || item['name'];
            const quantity = item['Количество'] || item['quantity'] || 0;
            const price = item['Цена'] || item['Price'] || 0;

            if (name) {
                await Product.findOneAndUpdate(
                    { name: name },
                    {
                        name: name,
                        quantity: quantity,
                        buyingPrice: price, // Записуємо ціну з файлу
                        sellingPrice: price, // Записуємо ту ж ціну
                        category: 'Склад'    // Ставимо загальну категорію
                    },
                    { upsert: true, new: true }
                );
                updatedCount++;
            }
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: `Успішно завантажено ${updatedCount} товарів!` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка обробки файлу' });
    }
});

app.delete('/products', async (req, res) => {
    await Product.deleteMany({});
    res.json({ message: 'Склад очищено' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Сервер чекає твій файл на порту ${PORT}`));