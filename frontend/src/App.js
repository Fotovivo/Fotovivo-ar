import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import QRCode from 'qrcode.react';
import axios from 'axios';
import './App.css';

function App() {
  const [files, setFiles] = useState({ photo: null, video: null });
  const [qrCode, setQrCode] = useState(null);

  const onDrop = useCallback((acceptedFiles, { name }) => {
    const file = acceptedFiles[0];
    if (name === 'video' && file.size > 20 * 1024 * 1024) {
      alert('Максимальный размер видео — 20 МБ');
      return;
    }
    setFiles(prev => ({ ...prev, [name]: file }));
  }, []);

  const { getRootProps: photoRoot, getInputProps: photoInput } = useDropzone({
    onDrop: files => onDrop(files, 'photo'),
    accept: 'image/*',
    maxFiles: 1
  });

  const { getRootProps: videoRoot, getInputProps: videoInput } = useDropzone({
    onDrop: files => onDrop(files, 'video'),
    accept: 'video/*',
    maxFiles: 1
  });

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('photo', files.photo);
    formData.append('video', files.video);
    formData.append('title', 'Моя AR-фото');
    formData.append('description', 'Создано через FotoVivo');

    try {
      const { data } = await axios.post('http://localhost:3001/upload', formData);
      setQrCode(data.qrCode);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    }
  };

  return (
    <div className="app">
      <div {...photoRoot()} className="dropzone">
        <input {...photoInput()} />
        {files.photo ? (
          <img 
            src={URL.createObjectURL(files.photo)} 
            alt="Превью" 
            className="preview"
          />
        ) : (
          <p>Перетащите фото сюда</p>
        )}
      </div>

      <div {...videoRoot()} className="dropzone">
        <input {...videoInput()} />
        {files.video ? (
          <video src={URL.createObjectURL(files.video)} controls />
        ) : (
          <p>Перетащите видео (макс. 20MB)</p>
        )}
      </div>

      <button onClick={handleSubmit} className="submit-btn">
        Создать AR-фото
      </button>

      {qrCode && (
        <div className="qr-section">
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