const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const Tesseract = require('tesseract.js');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- FUNCIONES DE COTIZACIÓN (idénticas a index-botones.js) ---
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
    const res = await axios.get('https://criptoya.com/api/usdt/ars/0.1');
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

// --- HANDLERS DE TELEGRAM ---
bot.on('text', async (ctx) => {
  try {
    await ctx.reply(
      '¿Qué cotización querés ver?',
      Markup.inlineKeyboard([
        [Markup.button.callback('💸 USDT', 'ver_usdt')],
        [Markup.button.callback('💵 Dólar Blue', 'ver_dolar')],
      ])
    );
  } catch (e) {
    console.error('Error al enviar los botones:', e.message);
    await ctx.reply('❌ Ocurrió un error al mostrar las opciones.');
  }
});

bot.action('ver_usdt', async (ctx) => {
  try {
    await ctx.answerCbQuery();
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

bot.action('ver_dolar', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const { compra, venta } = await obtenerDolarBlue();
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

// --- HANDLER HTTP PARA VERCEL ---
// Para usar este endpoint como webhook:
// 1. Deploy a Vercel.
// 2. Configura el webhook de Telegram:
//    https://api.telegram.org/bot<tu_bot_token>/setWebhook?url=https://<tu-proyecto>.vercel.app/api/bot

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('ok');
    } catch (err) {
      console.error('Error en el webhook:', err);
      res.status(500).send('error');
    }
  } else {
    res.status(200).send('Bot is running');
  }
}; 