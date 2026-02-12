const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servir arquivos HTML

// Armazenamento temporário de códigos (em produção, use Redis ou banco de dados)
const verificationCodes = new Map();

// Configuração Brevo
const BREVO_API_KEY = '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';
const SENDER_EMAIL = 'araujonando800@gmail.com';
const SENDER_NAME = 'Meus Jogos APK';

// Função para gerar código de 6 dígitos
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Endpoint: Enviar código de verificação
app.post('/api/send-verification', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Email inválido' });
  }

  try {
    // Gerar código
    const code = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

    // Armazenar código
    verificationCodes.set(email, { code, expiresAt });

    // Enviar email via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME,
          email: SENDER_EMAIL
        },
        to: [{ email: email }],
        subject: 'Seu código de verificação',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #111827, #374151); padding: 30px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 40px 30px; text-align: center; }
              .code-box { background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; margin: 25px 0; }
              .code { font-size: 36px; font-weight: bold; color: #111827; letter-spacing: 8px; font-family: monospace; }
              .info { color: #6b7280; font-size: 14px; margin-top: 20px; }
              .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎮 Meus Jogos APK</h1>
              </div>
              <div class="content">
                <h2 style="color: #111827; margin-top: 0;">Confirme seu cadastro</h2>
                <p style="color: #6b7280; font-size: 16px;">Use o código abaixo para verificar sua conta:</p>
                <div class="code-box">
                  <div class="code">${code}</div>
                </div>
                <p class="info">⏱️ Este código expira em 10 minutos</p>
                <p class="info">Se você não solicitou este código, ignore este email.</p>
              </div>
              <div class="footer">
                © 2026 Meus Jogos APK - Todos os direitos reservados
              </div>
            </div>
          </body>
          </html>
        `
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro Brevo:', error);
      return res.status(500).json({ success: false, message: 'Erro ao enviar email' });
    }

    res.json({ success: true, message: 'Código enviado com sucesso!' });

  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
});

// Endpoint: Verificar código
app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email e código são obrigatórios' });
  }

  const stored = verificationCodes.get(email);

  if (!stored) {
    return res.status(404).json({ success: false, message: 'Nenhum código encontrado para este email' });
  }

  // Verificar expiração
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return res.status(410).json({ success: false, message: 'Código expirado. Solicite um novo.' });
  }

  // Verificar código
  if (stored.code !== code) {
    return res.status(401).json({ success: false, message: 'Código incorreto' });
  }

  // Código correto - remover da memória
  verificationCodes.delete(email);
  res.json({ success: true, message: 'Email verificado com sucesso!' });
});

// Limpar códigos expirados a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(email);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});