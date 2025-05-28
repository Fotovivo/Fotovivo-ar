require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();

// ==================== КОНФИГУРАЦИЯ ====================
// 1. Увеличиваем лимиты для загрузки больших файлов
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Настройки CORS
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL, // URL фронтенда на Vercel
    'http://localhost:3000'   // Для локальной разработки
  ],
  methods: 'GET,POST',
  allowedHeaders: 'Content-Type,Authorization'
};
app.use(cors(corsOptions));

// 3. Логирование для отладки (можно удалить после тестов)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  next();
});

// ==================== SUPABASE КЛИЕНТ ====================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ==================== РОУТЫ API ====================
// 1. Загрузка файлов
app.post('/upload', async (req, res) => {
  try {
    const { photo, video, title, description } = req.body;

    // Генерация имен файлов
    const photoName = `photos/${Date.now()}_${title.replace(/\s+/g, '_')}.jpg`;
    const videoName = `videos/${Date.now()}_${title.replace(/\s+/g, '_')}.mp4`;

    // Загрузка в Supabase
    await supabase.storage.from('ar-photos').upload(photoName, photo);
    await supabase.storage.from('ar-videos').upload(videoName, video);

    // Генерация QR-кода
    const arId = Date.now().toString(36);
    const qrCode = await QRCode.toDataURL(
      `${process.env.FRONTEND_URL}/view/${arId}`
    );

    // Сохранение метаданных
    await supabase.from('ar_photos').insert([{
      ar_id: arId,
      title,
      description,
      photo_path: photoName,
      video_path: videoName,
      qr_code: qrCode,
      created_at: new Date()
    }]);

    res.status(201).json({ arId, qrCode });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Получение данных AR
app.get('/ar/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ar_photos')
      .select('*')
      .eq('ar_id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'AR photo not found' });

    const photoUrl = supabase.storage
      .from('ar-photos')
      .getPublicUrl(data.photo_path);

    const videoUrl = supabase.storage
      .from('ar-videos')
      .getPublicUrl(data.video_path);

    res.json({ ...data, photoUrl, videoUrl });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(404).json({ error: 'AR photo not found' });
  }
});

// ==================== ЗАПУСК СЕРВЕРА ====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));