import { iniciarPainel } from './server/painel.js';
import { conectarBot } from './connection/connect.js';

// Número do dono para o painel e pareamento
const NUMERO_DONO = '5591988746023';

// Liga o painel web uma única vez fora do bot
iniciarPainel(NUMERO_DONO);

// Liga o motor do WhatsApp Bot
conectarBot(NUMERO_DONO);