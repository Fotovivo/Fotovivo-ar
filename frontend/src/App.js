import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import QRCode from 'qrcode.react';
import axios from 'axios';
import './App.css';

function App() {
  const [files, setFiles] = useState({ photo: null, video: null });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Обработка загрузки файлов с валидацией
  const onDrop = useCallback((acceptedFiles, { name }) => {
    const file = acceptedFiles[0];
    
    // Проверка MIME-типа
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm'];
    
    if (name === 'photo' && !validImageTypes.includes(file.type)) {
      alert('Поддерживаются только JPG, PNG и WebP изображения');
      return;
    }
    
    if (name === 'video' && !validVideoTypes.includes(file.type)) {
      alert('Поддерживаются только MP4 и WebM видео');
      return;
    }
    
    // Проверка размера видео
    if (name === 'video' && file.size > 50 * 1024 * 1024) {
      alert('Максимальный размер видео — 50 МБ');
      return;
    }
    
    setFiles(prev => ({ ...prev, [name]: file }));
  }, []);

  // Настройки Dropzone для фото
  const { getRootProps: photoRoot, getInputProps: photoInput } = useDropzone({
    onDrop: files => onDrop(files, 'photo'),
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1
  });

  // Настройки Dropzone для видео
  const { getRootProps: videoRoot, getInputProps: videoInput } = useDropzone({
    onDrop: files => onDrop(files, 'video'),
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm']
    },
    maxFiles: 1
  });

  // Отправка данных на сервер
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('photo', files.photo);
      formData.append('video', files.video);
      formData.append('title', 'Моя AR-фото');
      formData.append('description', 'Создано через FotoVivo');

      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setQrCode(data.qrCode);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Ошибка загрузки: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>FotoVivo AR Creator</h1>
      
      <div className="upload-section">
        <div {...photoRoot()} className="dropzone">
          <input {...photoInput()} />
          {files.photo ? (
            <img 
              src={URL.createObjectURL(files.photo)} 
              alt="Превью" 
              className="preview"
            />
          ) : (
            <p>Перетащите фото сюда (JPG, PNG, WebP)</p>
          )}
        </div>

        <div {...videoRoot()} className="dropzone">
          <input {...videoInput()} />
          {files.video ? (
            <video src={URL.createObjectURL(files.video)} controls />
          ) : (
            <p>Перетащите видео (MP4, WebM, макс. 50MB)</p>
          )}
        </div>
      </div>

      <button 
        onClick={handleSubmit} 
        className="submit-btn"
        disabled={!files.photo || !files.video || loading}
      >
        {loading ? 'Загрузка...' : 'Создать AR-фото'}
      </button>
      
      {error && <div className="error">{error}</div>}

      {qrCode && (
        <div className="qr-section">
          <h2>Ваш QR-код готов!</h2>
          <QRCode value={qrCode} size={256} />
          <a 
            href={qrCode} 
            download={`ar_${Date.now()}.png`}
            className="download-link"
          >
            Скачать QR-код
          </a>
        </div>
      )}
    </div>
  );
}

export default App;