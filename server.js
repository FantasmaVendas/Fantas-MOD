const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;  // pode mudar se quiser

app.use(cors());
app.use(express.json());

// Chave fixa (como você pediu)
const BREVO_API_KEY = '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';

// Armazenamento temporário dos códigos (em memória)
const verificationCodes = new Map(); // email → { code, expiresAt }

app.post('/api/send-verification', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Email inválido' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

  verificationCodes.set(email, { code, expiresAt });

  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: 'App Nando Games',
          email: 'araujonando800@gmail.com'
        },
        to: [{ email }],
        subject: 'Seu Código de Verificação',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px;">
            <h2>Olá!</h2>
            <p>Seu código de verificação é:</p>
            <h1 style="font-size: 48px; letter-spacing: 12px; color: #111827; margin: 20px 0;">${code}</h1>
            <p>Esse código expira em <strong>10 minutos</strong>.</p>
            <p>Não compartilhe com ninguém.</p>
            <br>
            <small>App Nando Games • ${new Date().toLocaleString('pt-BR')}</small>
          </div>
        `
      },
      {
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        }
      }
    );

    res.json({ success: true, message: 'Código enviado com sucesso!' });
  } catch (error) {
    console.error('Erro Brevo:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Erro ao enviar o código. Tente novamente.' });
  }
});

app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Dados inválidos' });
  }

  const stored = verificationCodes.get(email);
  if (!stored) {
    return res.status(400).json({ success: false, message: 'Nenhum código pendente' });
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return res.status(400).json({ success: false, message: 'Código expirado' });
  }

  if (stored.code !== code) {
    return res.status(400).json({ success: false, message: 'Código incorreto' });
  }

  verificationCodes.delete(email);
  res.json({ success: true, message: 'Código verificado!' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});