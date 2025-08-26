import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import pino from 'pino';
import twilioPkg from 'twilio';

const { MessagingResponse } = twilioPkg.twiml;
const twilioClient = twilioPkg(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
const log = pino({ name: 'kaptal-legal-api' });
const PORT = process.env.PORT || 3000;


app.use(express.urlencoded({ extended: false }));


app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});


const maskPhone = v => (v || '').replace(/(\+\d{2})\d+(?=\d{4}$)/, '$1******');


app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));


app.post('/whatsapp', (req, res) => {
  const from = req.body.From;                          
  const body = (req.body.Body || '').trim();          

  log.info({ from: maskPhone(from), body }, 'inbound');

  const twiml = new MessagingResponse();
  twiml.message(`Eco: ${body}`);
  res.type('text/xml').send(twiml.toString());
});


app.get('/send', async (_req, res) => {
  try {
    const msg = await twilioClient.messages.create({
      from: process.env.WHATSAPP_FROM,
      to:   process.env.WHATSAPP_TO,
      body: 'Hola desde Kaptal Legal Bot 🚀',
      statusCallback: process.env.STATUS_CALLBACK_URL || undefined
    });
    log.info({ sid: msg.sid }, 'outbound-sent');
    res.json({ sid: msg.sid });
  } catch (e) {
    log.error({ err: e?.message }, 'outbound-error');
    res.status(500).json({ error: 'send failed' });
  }
});


app.post('/status', (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode } = req.body || {};
  log.info({ MessageSid, MessageStatus, ErrorCode }, 'status-callback');
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 API arriba: http://localhost:${PORT}`);
  log.info({ port: PORT, env: process.env.NODE_ENV ?? 'dev' }, 'api-up');
});