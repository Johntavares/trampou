const { createClient } = require('@supabase/supabase-js');

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-6642156034321863-111007-4d628ecb0ab61599307361b1e89b0771-1261556524';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://txcmnqisfwekmhihdutt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y21ucWlzZndla21oaWhkdXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMyNDc4MywiZXhwIjoyMTA3OTAwNzgzfQ.GkTfFTH7PX-5I0qTFFu1w-bwmHZgyjE5rkudXXufe-0';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
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
    let safePlacement = placement || 'home_feed';
    if (safePlacement === 'feed') safePlacement = 'home_feed';
    if (safePlacement === 'search') safePlacement = 'search_sponsored';
    if (safePlacement === 'profile') safePlacement = 'profile_footer';
    if (safePlacement === 'carousel') safePlacement = 'home_carousel';
    if (!['home_carousel', 'home_feed', 'search_sponsored', 'profile_footer'].includes(safePlacement)) {
      safePlacement = 'home_feed';
    }

    let amount = 49.90;
    if (duration === 7) amount = 29.90;
    else if (duration === 15) amount = 49.90;
    else if (duration === 30) amount = 89.90;

    const formattedAmount = Number(amount).toFixed(2);
    const idempotencyKey = 'trampou_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // 1. Chamada à API de Orders do Mercado Pago
    const mpPayload = {
      type: 'online',
      external_reference: 'ad_' + Date.now(),
      total_amount: formattedAmount,
      description: `Anúncio Trampou (${duration} dias) - ${title || advertiser_name || 'Destaque'}`,
      transactions: {
        payments: [
          {
            payment_method: {
              id: 'pix',
              type: 'bank_transfer'
            },
            amount: formattedAmount
          }
        ]
      },
      payer: {
        email: payer_email || 'cliente@trampou.com',
        first_name: (advertiser_name || 'Anunciante').split(' ')[0] || 'Anunciante'
      }
    };

    const mpRes = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(mpPayload)
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      const errMsg = mpData.message || (mpData.errors && mpData.errors[0] && mpData.errors[0].message) || 'Erro ao gerar pedido no Mercado Pago';
      console.error('Mercado Pago Order Erro:', mpData);
      return res.status(500).json({ success: false, error: errMsg });
    }

    const payment = mpData.transactions && mpData.transactions.payments && mpData.transactions.payments[0];
    const pixData = payment && payment.payment_method;

    // 2. Registra o anúncio como pendente de pagamento no Supabase
    let bannerId = null;
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const expiresAt = new Date(Date.now() + duration * 86400000).toISOString();

      const { data: inserted, error: dbErr } = await supabase
        .from('banners')
        .insert({
          title: title || 'Anúncio Patrocinado',
          description: description || '',
          badge_text: 'Patrocinado',
          cta_text: cta_text || 'Saiba Mais',
          cta_link: cta_link || '',
          image_url: image_url || '',
          advertiser_name: advertiser_name || 'Anunciante',
          advertiser_phone: advertiser_phone || '',
          placement: safePlacement,
          target_scope: 'city',
          target_state: target_state || 'PA',
          target_city: target_city || 'Parauapebas',
          target_audience: 'all',
          active: false,
          sort_order: 1,
          display_seconds: 5,
          status: 'pending_payment',
          views_count: 0,
          clicks_count: 0,
          amount_paid: amount,
          starts_at: new Date().toISOString(),
          expires_at: expiresAt
        })
        .select('id')
        .single();

      if (inserted) {
        bannerId = inserted.id;
      }
      if (dbErr) {
        console.warn('Aviso ao gravar banner:', dbErr.message);
      }
    } catch (dbErr) {
      console.warn('Erro ao conectar com Supabase para banner:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      orderId: mpData.id,
      paymentId: payment ? payment.id : null,
      amount: mpData.total_amount,
      durationDays: duration,
      qrCode: pixData ? pixData.qr_code : null,
      qrCodeBase64: pixData ? pixData.qr_code_base64 : null,
      ticketUrl: pixData ? pixData.ticket_url : null,
      bannerId: bannerId
    });

  } catch (err) {
    console.error('Erro na API create-pix:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno no servidor'
    });
  }
};

