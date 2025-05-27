require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Загрузка файлов
app.post('/upload', async (req, res) => {
  try {
    const { photo, video, title, description } = req.body;

    // Генерация уникальных имен файлов
    const photoName = `photos/${Date.now()}_${title}.jpg`;
    const videoName = `videos/${Date.now()}_${title}.mp4`;

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
    res.status(500).json({ error: error.message });
  }
});

// Получение данных AR
app.get('/ar/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ar_photos')
      .select('*')
      .eq('ar_id', req.params.id)
      .single();

    if (error) throw error;

    const photoUrl = supabase.storage
      .from('ar-photos')
      .getPublicUrl(data.photo_path);

    const videoUrl = supabase.storage
      .from('ar-videos')
      .getPublicUrl(data.video_path);

    res.json({ ...data, photoUrl, videoUrl });
  } catch (error) {
    res.status(404).json({ error: 'AR photo not found' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
