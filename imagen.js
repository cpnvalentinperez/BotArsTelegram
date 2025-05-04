// imagen.js
const axios = require('axios');
const fs = require('fs');
const Tesseract = require('tesseract.js');

async function procesarImagen(bot, fileId, token) {
  const file = await bot.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const filePath = './imagen.jpg';

  const response = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', async () => {
      try {
        const result = await Tesseract.recognize(filePath, 'eng');
        const texto = result.data.text;
        const match = texto.match(/\$?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/);
        fs.unlinkSync(filePath); // Eliminar la imagen local
        resolve(match ? match[0] : null);
      } catch (err) {
        reject(err);
      }
    });

    writer.on('error', reject);
  });
}

module.exports = { procesarImagen };
