const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-2365226061846646-111007-1d2a3b4e8edb8b1d6db770721ac5eed4-3832646532';
const MP_PUBLIC_KEY = process.env.MERCADO_PAGO_PUBLIC_KEY || 'APP_USR-14c39827-b5f9-4b2f-9669-c39a6c814aa3';

/**
 * Cria um pedido com pagamento PIX via API de Orders do Mercado Pago
 */
async function createPixOrder({
  amount,
  title,
  description,
  externalReference,
  payerEmail,
  payerName
}) {
  const formattedAmount = Number(amount).toFixed(2);
  const idempotencyKey = 'trampou_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const payload = {
    type: 'online',
    external_reference: externalReference || ('ad_' + Date.now()),
    total_amount: formattedAmount,
    description: description || title || 'Anúncio Trampou',
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
      email: payerEmail || 'cliente@trampou.com',
      first_name: (payerName || 'Anunciante').split(' ')[0] || 'Anunciante'
    }
  };

  const response = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || (data.errors && data.errors[0] && data.errors[0].message) || 'Erro ao criar pedido no Mercado Pago');
  }

  const payment = data.transactions && data.transactions.payments && data.transactions.payments[0];
  const pixData = payment && payment.payment_method;

  return {
    orderId: data.id,
    paymentId: payment ? payment.id : null,
    status: data.status,
    statusDetail: data.status_detail,
    amount: data.total_amount,
    qrCode: pixData ? pixData.qr_code : null,
    qrCodeBase64: pixData ? pixData.qr_code_base64 : null,
    ticketUrl: pixData ? pixData.ticket_url : null,
    expirationDate: payment ? payment.date_of_expiration : null
  };
}

/**
 * Consulta o status de um pedido no Mercado Pago
 */
async function getOrderStatus(orderId) {
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Erro ao consultar status no Mercado Pago');
  }

  const isPaid = data.status === 'processed' || data.status === 'approved' || Number(data.total_paid_amount || 0) >= Number(data.total_amount || 0);

  return {
    orderId: data.id,
    status: data.status,
    statusDetail: data.status_detail,
    totalAmount: data.total_amount,
    totalPaidAmount: data.total_paid_amount,
    isPaid: isPaid
  };
}

module.exports = {
  MP_PUBLIC_KEY,
  MP_ACCESS_TOKEN,
  createPixOrder,
  getOrderStatus
};

