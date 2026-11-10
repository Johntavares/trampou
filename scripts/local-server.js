const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mp = require('./mercadopago');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function getPgClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // ==============================================================================
  // API: MERCADO PAGO PIX CHECKOUT PARA TRAMPOU ADS
  // ==============================================================================

  // 1. Criar Pedido com PIX Dinâmico
  if (pathname === '/api/mercadopago/create-pix' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const {
        placement,
        duration_days,
        title,
        description,
        advertiser_name,
        advertiser_phone,
        cta_text,
        cta_link,
        image_url,
        target_city,
        target_state,
        payer_email
      } = body;

      const duration = parseInt(duration_days, 10) || 15;
      
      // Validação e normalização de posicionamento aceito pelo banco:
      let safePlacement = placement || 'home_feed';
      if (safePlacement === 'feed') safePlacement = 'home_feed';
      if (safePlacement === 'search') safePlacement = 'search_sponsored';
      if (safePlacement === 'profile') safePlacement = 'profile_footer';
      if (safePlacement === 'carousel') safePlacement = 'home_carousel';
      if (!['home_carousel', 'home_feed', 'search_sponsored', 'profile_footer'].includes(safePlacement)) {
        safePlacement = 'home_feed';
      }
      
      // Tabela de Preços Pré-Pagos
      let amount = 49.90; // Padrão 15 dias
      if (duration === 7) amount = 29.90;
      else if (duration === 15) amount = 49.90;
      else if (duration === 30) amount = 89.90;

      // 1. Gera Pedido PIX no Mercado Pago
      const pixOrder = await mp.createPixOrder({
        amount: amount,
        title: `Anúncio Trampou (${duration} dias) - ${title}`,
        description: `Veiculação de anúncio no espaço ${placement || 'Geral'} por ${duration} dias.`,
        payerEmail: payer_email || 'cliente@trampou.com',
        payerName: advertiser_name || 'Anunciante Trampou'
      });

      // 2. Registra o anúncio como pendente de pagamento no Supabase
      let bannerId = null;
      try {
        const pgClient = await getPgClient();
        const expiresAt = new Date(Date.now() + duration * 86400000).toISOString();
        const insertRes = await pgClient.query(`
          INSERT INTO public.banners (
            title, description, badge_text, cta_text, cta_link, image_url,
            active, sort_order, display_seconds, advertiser_name, advertiser_phone,
            placement, target_scope, target_state, target_city, target_audience,
            status, views_count, clicks_count, amount_paid, starts_at, expires_at
          ) VALUES (
            $1, $2, 'Patrocinado', $3, $4, $5,
            false, 1, 5, $6, $7,
            $8, 'city', $9, $10, 'all',
            'pending_payment', 0, 0, $11, now(), $12
          ) RETURNING id;
        `, [
          title || 'Anúncio Patrocinado',
          description || '',
          cta_text || 'Saiba Mais',
          cta_link || '',
          image_url || '',
          advertiser_name || 'Anunciante',
          advertiser_phone || '',
          safePlacement,
          target_state || 'PA',
          target_city || 'Parauapebas',
          amount,
          expiresAt
        ]);
        await pgClient.end();
        if (insertRes.rows && insertRes.rows[0]) {
          bannerId = insertRes.rows[0].id;
        }
      } catch (dbErr) {
        console.warn('Aviso: Falha ao gravar banner preliminar no banco:', dbErr.message);
      }

      sendJson(res, 201, {
        success: true,
        orderId: pixOrder.orderId,
        paymentId: pixOrder.paymentId,
        amount: pixOrder.amount,
        durationDays: duration,
        qrCode: pixOrder.qrCode,
        qrCodeBase64: pixOrder.qrCodeBase64,
        ticketUrl: pixOrder.ticketUrl,
        bannerId: bannerId
      });
    } catch (err) {
      console.error('Erro ao gerar PIX Mercado Pago:', err);
      sendJson(res, 500, {
        success: false,
        error: err.message || 'Erro interno ao processar cobrança'
      });
    }
    return;
  }

  // 2. Verificar Status do Pagamento PIX
  if (pathname === '/api/mercadopago/check-status' && req.method === 'GET') {
    const orderId = parsedUrl.searchParams.get('order_id');
    const bannerId = parsedUrl.searchParams.get('banner_id');
    const durationDays = parseInt(parsedUrl.searchParams.get('duration_days') || '15', 10);

    if (!orderId) {
      sendJson(res, 400, { success: false, error: 'Parâmetro order_id obrigatório' });
      return;
    }

    try {
      const statusData = await mp.getOrderStatus(orderId);

      // Se o pagamento foi aprovado, ativa o anúncio no Supabase imediatamente
      if (statusData.isPaid && bannerId) {
        try {
          const pgClient = await getPgClient();
          const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
          await pgClient.query(`
            UPDATE public.banners 
            SET active = true, 
                status = 'active', 
                starts_at = now(), 
                expires_at = $1
            WHERE id = $2;
          `, [expiresAt, bannerId]);
          await pgClient.end();
          console.log(`🎉 Anúncio ${bannerId} ATIVADO com sucesso via PIX Mercado Pago!`);
        } catch (dbErr) {
          console.error('Erro ao ativar banner no banco:', dbErr.message);
        }
      }

      sendJson(res, 200, {
        success: true,
        isPaid: statusData.isPaid,
        status: statusData.status,
        statusDetail: statusData.statusDetail,
        totalAmount: statusData.totalAmount,
        totalPaidAmount: statusData.totalPaidAmount
      });
    } catch (err) {
      console.error('Erro ao consultar status Mercado Pago:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // ==============================================================================
  // ARQUIVOS ESTÁTICOS / SPA FALLBACK
  // ==============================================================================

  let reqPath = parsedUrl.pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback para index.html (SPA)
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(fallback, (fallbackErr, content) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Trampou Web Server & Mercado Pago API rodando em http://localhost:${PORT}`);
});
