const { Telegraf } = require('telegraf');
const axios = require('axios');
const Tesseract = require('tesseract.js');
const fs = require('fs');

const bot = new Telegraf('7288597871:AAGTULOO9MvgDY2tVhTTYSFRQ-nwsr0CJug'); // <— reemplazá con tu token

// Función para obtener la cotización de USDT
async function obtenerCotizacionUSDT() {
  const res = await axios.get('https://criptoya.com/api/fiwind/usdt/ars/0.1');
  const { ask, time } = res.data;
  const fecha = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'medium'
    }).format(new Date());
  return { ask: Math.round(ask * 1.01), fecha };
}

// Función para obtener Dólar Blue y aplicarle +20
async function obtenerDolarBlue() {
  try {
    const res = await axios.get('https://dolarapi.com/v1/dolares/blue');
    const { compra, venta } = res.data;
    const compraUsdt = compra + 5;
    const fecha = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'medium'
      }).format(new Date());  
    return {
      compra: Math.round(compra),
      compraUsdt: Math.round(compraUsdt),
      venta: Math.round(venta + 20)
    };
  } catch (error) {
    console.error("Error al obtener Dólar Blue:", error.response ? error.response.data : error.message);
    throw new Error('❌ Error al obtener Dólar Blue');
  }
}

async function obtenerMultiplesCotizaciones() {
  try {
    const res = await axios.get('https://criptoya.com/api/usdt/ars/0.1'); // cotización general
    const exchanges = ['fiwind', 'binancep2p', 'lemoncash', 'belo', 'ripio','letsbit'];
    const resultados = [];

    exchanges.forEach((exchange) => {
      if (res.data[exchange]) {
        const precio = res.data[exchange].totalAsk || res.data[exchange].ask;
        resultados.push({
          exchange,
          precio: Math.round(precio)
        });
      }
    });

    return resultados;
  } catch (error) {
    console.error("Error al obtener cotizaciones múltiples:", error.message);
    throw new Error('❌ No se pudo obtener la cotización en múltiples exchanges');
  }
}

// Comando /dolar
bot.command('dolar', async (ctx) => {
  try {
    const { compra, venta, compraUsdt } = await obtenerDolarBlue();

    const fecha = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date());

    const msg =
      `💵 *Dólar Blue*\n` +
      `💲 Compra USD: $${compra}\n` +
      `💲 Venta USD: $${venta}\n` +
      `🕒 Fecha: ${fecha}\n\n`;

    await ctx.replyWithMarkdown(msg);
  } catch (e) {
    console.error(e);
    await ctx.reply('❌ Error al obtener el Dólar Blue');
  }
});

// Comando /usdt
bot.command('usdt', async (ctx) => {
  try {
    const { ask, fecha } = await obtenerCotizacionUSDT();
    const { compraUsdt } = await obtenerDolarBlue();
    const cotizaciones = await obtenerMultiplesCotizaciones();

    let cotizacionMsg = '🏦 *USDT en múltiples exchanges*\n';
    cotizaciones.forEach(({ exchange, precio }) => {
      cotizacionMsg += `• ${exchange.toUpperCase()}: $${precio}\n`;
    });

    const msg =
      `💸 *Cotización x USDT*\n` +
      `📈 Compra: $${compraUsdt}\n` +
      `📈 Venta: $${ask}\n\n` +
      cotizacionMsg + '\n' +
      `🕒 Fecha: ${fecha}\n\n`;

    await ctx.replyWithMarkdown(msg);
  } catch (e) {
    console.error(e);
    await ctx.reply('❌ Error al obtener la cotización de USDT');
  }
});


// Procesamiento de imagen (OCR)
// async function procesarImagen(fileId, token) {
//   const file = await bot.getFile(fileId);
//   const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
//   const filePath = './imagen.jpg';
//   const response = await axios.get(url, { responseType: 'stream' });
//   const writer = fs.createWriteStream(filePath);
//   response.data.pipe(writer);

//   return new Promise((resolve, reject) => {
//     writer.on('finish', async () => {
//       try {
//         const result = await Tesseract.recognize(filePath, 'eng');
//         const texto = result.data.text;
//         const match = texto.match(/\$?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/);
//         fs.unlinkSync(filePath);
//         resolve(match ? match[0] : '❌ No se detectó un monto en la imagen.');
//       } catch (err) {
//         reject('❌ Error al procesar la imagen: ' + err.message);
//       }
//     });
//     writer.on('error', reject);
//   });
// }

// Cuando llega texto, respondo con USDT + Dólar Blue(+20)
// bot.on('text', async (ctx) => {
//   try {
    
//     const { ask, fecha } = await obtenerCotizacionUSDT();
//     const { compra, venta,compraUsdt } = await obtenerDolarBlue();

//     const cotizaciones = await obtenerMultiplesCotizaciones();
//     let cotizacionMsg = '🏦 *USDT en múltiples exchanges*\n';

//     cotizaciones.forEach(({ exchange, precio }) => {
//     cotizacionMsg += `• ${exchange.toUpperCase()}: $${precio}\n`;
//     });

//     const msg =  
//       `💸 *Cotización x USDT*\n` +
//       `📈 Compra: $${compraUsdt}\n` +
//       `📈 Venta: $${ask}\n\n` +
//       cotizacionMsg + '\n' +        
//       `💵 *Dólar Blue*\n` +
//       `💲 Compra USD: $${compra}\n` +
//       `💲 Venta USD: $${venta}\n` +
//       `🕒 Fecha: ${fecha}\n\n` ;

//     await ctx.replyWithMarkdown(msg);
//   } catch (e) {
//     console.error('Error al obtener las cotizaciones:', e);
//     await ctx.reply(e.message);  // Mostramos el mensaje de error al usuario
//   }
// });

// Cuando llega una foto, extraigo monto con OCR
// bot.on('photo', async (ctx) => {
//   const fileId = ctx.message.photo.slice(-1)[0].file_id;
//   try {
//     const monto = await procesarImagen(fileId, bot.token);
//     await ctx.reply(`🧾 Monto detectado: ${monto}`);
//   } catch (err) {
//     console.error(err);
//     await ctx.reply(err.toString());
//   }
// });

bot.launch();
console.log('🤖 Bot funcionando...');  
