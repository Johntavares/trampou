const { createClient } = require('@supabase/supabase-js');

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-6642156034321863-111007-4d628ecb0ab61599307361b1e89b0771-1261556524';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://txcmnqisfwekmhihdutt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y21ucWlzZndla21oaWhkdXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMyNDc4MywiZXhwIjoyMTA3OTAwNzgzfQ.GkTfFTH7PX-5I0qTFFu1w-bwmHZgyjE5rkudXXufe-0';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const orderId = req.query ? req.query.order_id : null;
  const bannerId = req.query ? req.query.banner_id : null;
  const durationDays = parseInt((req.query && req.query.duration_days) || '15', 10);

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Parâmetro order_id é obrigatório' });
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      }
    });

    const data = await mpRes.json();
    if (!mpRes.ok) {
      return res.status(500).json({ success: false, error: data.message || 'Erro ao consultar status no Mercado Pago' });
    }

    const isPaid = data.status === 'processed' || data.status === 'approved' || Number(data.total_paid_amount || 0) >= Number(data.total_amount || 0);

    // Se o pagamento foi aprovado, ativa o anúncio no Supabase imediatamente
    if (isPaid && bannerId) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();

        await supabase
          .from('banners')
          .update({
            active: true,
            status: 'active',
            starts_at: new Date().toISOString(),
            expires_at: expiresAt
          })
          .eq('id', bannerId);

        console.log(`🎉 Anúncio ${bannerId} ATIVADO com sucesso via PIX Mercado Pago!`);
      } catch (dbErr) {
        console.error('Erro ao ativar banner no Supabase:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      isPaid: isPaid,
      status: data.status,
      statusDetail: data.status_detail,
      totalAmount: data.total_amount,
      totalPaidAmount: data.total_paid_amount
    });

  } catch (err) {
    console.error('Erro na API check-status:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao consultar status'
    });
  }
};
