from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import random
import string

app = Flask(__name__)
CORS(app)  # Permite requisições do frontend local

# Sua chave API Brevo (NUNCA publique isso em repositório público!)
BREVO_API_KEY = "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"

# Remetente – PRECISA ESTAR VERIFICADO na Brevo[](https://app.brevo.com/senders/list)
SENDER_EMAIL = "araujonando800@gmail.com"          # ← MUDE PARA O EMAIL QUE VOCÊ VERIFICOU NA BREVO
SENDER_NAME  = "Fantasma Mods"

@app.route('/api/send-verification', methods=['POST', 'OPTIONS'])
def send_verification():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    email = data.get('email')
    nome = data.get('nome', 'Usuário')

    if not email:
        return jsonify({"success": False, "message": "Email obrigatório"}), 400

    # Gera código aleatório de 6 dígitos
    verification_code = ''.join(random.choices(string.digits, k=6))

    # HTML do email
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px; margin:0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4; padding:20px;">
            <tr>
                <td align="center">
                    <div style="max-width:500px; background:white; padding:30px; border-radius:10px; box-shadow:0 0 15px rgba(0,0,0,0.1);">
                        <h2 style="color:#111827; margin-bottom:20px;">Verificação de Conta</h2>
                        <p style="font-size:16px; color:#374151;">Olá {nome},</p>
                        <p style="font-size:16px; color:#374151;">Seu código de verificação é:</p>
                        <h1 style="font-size:48px; color:#2563eb; letter-spacing:10px; margin:20px 0;">{verification_code}</h1>
                        <p style="font-size:14px; color:#6b7280;">Esse código expira em 10 minutos. Não compartilhe com ninguém.</p>
                        <p style="font-size:12px; color:#9ca3af; margin-top:30px; text-align:center;">
                            Se você não solicitou este cadastro, ignore este email.
                        </p>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    payload = {
        "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to": [{"email": email, "name": nome}],
        "subject": "Seu Código de Verificação - Meus Jogos APK",
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    try:
        response = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
        response.raise_for_status()  # Levanta exceção se não for 2xx

        print(f"[SUCESSO] Código {verification_code} enviado para {email}")
        return jsonify({
            "success": True,
            "message": "Código enviado!",
            "code": verification_code   # só para teste local – em produção remova isso
        })

    except requests.exceptions.HTTPError as http_err:
        error_text = response.text if 'response' in locals() else str(http_err)
        print(f"[ERRO BREVO] {response.status_code if 'response' in locals() else '??'} - {error_text}")
        return jsonify({
            "success": False,
            "message": f"Erro na Brevo: {error_text}"
        }), 500

    except Exception as e:
        print(f"[EXCEÇÃO GERAL] {str(e)}")
        return jsonify({"success": False, "message": f"Erro interno: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
