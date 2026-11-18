import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {
  Content,
  FunctionCall,
  FunctionDeclaration,
  GenerateContentResponse,
  GoogleGenAI,
  Part,
  Type,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Modelos activos priorizados en cascada (evitando modelos obsoletos)
const MODEL_CASCADE = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
const TRANSCRIPTION_MODEL = 'gemini-3.5-transcribe';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const registerExpenseDeclaration: FunctionDeclaration = {
  name: 'registerExpense',
  description:
    'Registra un gasto personal en pesos colombianos (COP) dentro del presupuesto mensual del usuario.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.NUMBER,
        description:
          'Monto numérico exacto del gasto en pesos colombianos (COP), siempre mayor a 0.',
      },
      date: {
        type: Type.STRING,
        description:
          'Fecha del gasto en formato estricto YYYY-MM-DD (por ejemplo 2026-11-17).',
      },
      description: {
        type: Type.STRING,
        description: 'Descripción breve y clara del gasto realizado.',
      },
      category: {
        type: Type.STRING,
        description:
          'Categoría del gasto. Debe ser exactamente una de: Alimentación, Transporte, Servicios públicos, Ropa y compras personales, Entretenimiento y ocio.',
      },
    },
    required: ['amount', 'date', 'description', 'category'],
  },
};

interface MediaAttachmentInput {
  kind: 'image' | 'audio';
  mimeType: string;
  data: string;
  name?: string;
}

interface ChatMessageInput {
  role: 'user' | 'assistant';
  text: string;
  attachment?: MediaAttachmentInput;
}

interface BudgetContextInput {
  userName?: string;
  monthLabel: string;
  baseBudget: number;
  totalIncome: number;
  effectiveBudget: number;
  totalSpent: number;
  availableBalance: number;
  currentDateISO: string;
}

function sanitizeMimeType(rawMime: string, kind: 'image' | 'audio'): string {
  const base = rawMime.split(';')[0]?.trim().toLowerCase();
  if (base && (base.startsWith('image/') || base.startsWith('audio/'))) {
    return base;
  }
  return kind === 'image' ? 'image/jpeg' : 'audio/webm';
}

function extractStatusCode(err: unknown): number {
  if (!err || typeof err !== 'object') return 500;
  const anyErr = err as Record<string, unknown>;
  if (typeof anyErr.status === 'number') return anyErr.status;
  if (typeof anyErr.code === 'number') return anyErr.code;

  const nestedErr = anyErr.error as Record<string, unknown> | undefined;
  if (nestedErr && typeof nestedErr.code === 'number') return nestedErr.code;

  const message =
    typeof anyErr.message === 'string' ? anyErr.message : JSON.stringify(err);
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    return 429;
  }
  if (message.includes('503') || message.includes('UNAVAILABLE')) {
    return 503;
  }
  if (message.includes('404') || message.includes('NOT_FOUND')) {
    return 404;
  }
  if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
    return 403;
  }
  if (message.includes('400') || message.includes('API_KEY_INVALID')) {
    return 400;
  }
  return 500;
}

function extractErrorMessage(err: unknown): string {
  if (!err) return 'Error desconocido en el servidor.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) {
    return String((err as {message: unknown}).message);
  }
  return 'Error al comunicarse con el modelo de Gemini.';
}

function extractPartsRobustly(response: GenerateContentResponse): {
  replyText: string;
  functionCalls: FunctionCall[];
} {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const textFragments: string[] = [];
  const functionCalls: FunctionCall[] = [];

  for (const part of parts) {
    if (typeof part.text === 'string' && part.text.trim().length > 0) {
      textFragments.push(part.text.trim());
    }
    if (part.functionCall) {
      functionCalls.push(part.functionCall);
    }
  }

  let replyText = textFragments.join('\n\n').trim();
  if (!replyText && typeof response.text === 'string') {
    replyText = response.text.trim();
  }

  return {replyText, functionCalls};
}

async function transcribeAudioAttachment(
  attachment: MediaAttachmentInput,
): Promise<string | null> {
  const mimeType = sanitizeMimeType(attachment.mimeType, 'audio');
  try {
    const response = await ai.models.generateContent({
      model: TRANSCRIPTION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: attachment.data,
            },
          },
          {
            text: 'Transcribe fielmente este audio en español. Si contiene montos, fechas o nombres de comercios, consérvalos con exactitud. Devuelve únicamente la transcripción.',
          },
        ],
      },
    });
    const {replyText} = extractPartsRobustly(response);
    return replyText || null;
  } catch (err) {
    console.warn(
      `[Assistant] Transcripción previa con ${TRANSCRIPTION_MODEL} falló (${extractStatusCode(err)}), se enviará el audio directo al modelo multimodal: ${extractErrorMessage(err)}`,
    );
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '25mb'}));

  app.post('/api/assistant/chat', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            'GEMINI_API_KEY no está configurada en el entorno del servidor.',
          statusCode: 500,
        });
        return;
      }

      const body = req.body as {
        messages?: ChatMessageInput[];
        budgetContext?: BudgetContextInput;
      };

      const messages = Array.isArray(body?.messages) ? body.messages : [];
      const ctx = body?.budgetContext;

      if (messages.length === 0) {
        res.status(400).json({
          error: 'Se requiere al menos un mensaje para el asistente.',
          statusCode: 400,
        });
        return;
      }

      const userName = ctx?.userName?.trim() || 'Usuario';
      const currentDateISO = ctx?.currentDateISO ?? '2026-11-17';

      // Mantiene intactas las instrucciones originales y extiende capacidades multimodales y contexto dinámico
      const systemInstruction = [
        'Eres un asistente experto en finanzas personales para la aplicación "Mi Presupuesto Mensual" en Colombia (moneda: pesos colombianos COP).',
        'Sé breve, amable y directo.',
        ctx
          ? `Contexto actual del usuario (${ctx.monthLabel}, fecha de hoy ${currentDateISO}, nombre del usuario: ${userName}): Presupuesto base: $${ctx.baseBudget} COP, Ingresos extra: $${ctx.totalIncome} COP, Presupuesto disponible total: $${ctx.effectiveBudget} COP, Total gastado: $${ctx.totalSpent} COP, Saldo disponible: $${ctx.availableBalance} COP.`
          : '',
        'Cuando el usuario indique que gastó o pagó dinero (por ejemplo "Gasté 500 en comida hoy" o "Pagué 25000 de taxi"), llama inmediatamente a la función registerExpense con:',
        '- amount: número positivo.',
        `- date: fecha en formato YYYY-MM-DD (si dice "hoy", usa ${currentDateISO}).`,
        '- description: descripción breve del gasto.',
        '- category: exactamente una de estas 5 categorías: "Alimentación", "Transporte", "Servicios públicos", "Ropa y compras personales", "Entretenimiento y ocio".',
        'Siempre confirma de forma amable los datos del gasto o responde consultas sobre su presupuesto actual.',
        '',
        'Instrucciones extendidas para entrada multimodal (Imagen y Audio), validación y contexto dinámico:',
        `- Contexto Dinámico: Utiliza siempre la fecha actual (${currentDateISO}), el nombre del usuario (${userName}) y el saldo disponible ($${ctx?.availableBalance ?? 0} COP) proporcionados en cada mensaje.`,
        `- Al finalizar cualquier registro con registerExpense, dirígete siempre al usuario por su nombre (ejemplo: "¡Listo, ${userName}! He guardado tu gasto...").`,
        `- Para consultas de compras o si le alcanza el dinero, compara el gasto solicitado contra su saldo disponible actual ($${ctx?.availableBalance ?? 0} COP) e indica con claridad si le alcanza o cuánto le faltaría.`,
        '- Imagen (ticket, recibo, factura, captura de compra o apunte de gasto): extrae monto, fecha y descripción (además de la categoría más adecuada). Si la imagen está borrosa, ilegible o algún dato falta o es dudoso, pregunta al usuario antes de guardar. NO inventes datos.',
        '- Audio (nota de voz): transcribe o analiza el audio y extrae monto, fecha y descripción (además de la categoría). Si falta algún dato o no se escucha claro, pregunta al usuario antes de guardar. NO inventes datos.',
        '- Validación: Si la imagen o el audio no tiene que ver con gastos, compras o finanzas personales, indica amablemente que no puedes procesarlo y no registres ningún gasto.',
      ]
        .filter(Boolean)
        .join('\n');

      // Si el último mensaje tiene audio, transcribirlo primero con gemini-3.5-transcribe
      const lastIndex = messages.length - 1;
      let latestTranscript: string | null = null;
      const latestMsg = messages[lastIndex];
      if (
        latestMsg?.role === 'user' &&
        latestMsg.attachment?.kind === 'audio' &&
        latestMsg.attachment.data
      ) {
        latestTranscript = await transcribeAudioAttachment(latestMsg.attachment);
      }

      // Conservar adjuntos recientes en la conversación para permitir repreguntas/aclaraciones
      const mediaIndices = messages
        .map((m, idx) => (m.attachment?.data ? idx : -1))
        .filter((idx) => idx !== -1);
      const keepMediaSet = new Set(mediaIndices.slice(-2));

      const contents: Content[] = messages.map((msg, idx) => {
        const parts: Part[] = [];
        const trimmedText = (msg.text || '').trim();

        if (msg.role === 'user' && msg.attachment?.data && keepMediaSet.has(idx)) {
          const cleanMime = sanitizeMimeType(
            msg.attachment.mimeType,
            msg.attachment.kind,
          );
          if (msg.attachment.kind === 'image') {
            parts.push({
              inlineData: {
                mimeType: cleanMime,
                data: msg.attachment.data,
              },
            });
            parts.push({
              text:
                trimmedText ||
                'Analiza esta imagen adjunta. Si es un recibo, ticket, captura de compra o apunte de gasto, extrae monto, fecha y descripción; si algún dato está borroso o falta, pregúntame antes de guardar. Si no tiene relación con gastos o finanzas, indícamelo.',
            });
          } else {
            // Audio: si tenemos transcripción del último audio la incluimos junto al audio para máxima precisión
            if (idx === lastIndex && latestTranscript) {
              parts.push({
                text: `${trimmedText ? `${trimmedText}\n` : ''}[Transcripción de nota de voz]: "${latestTranscript}"`,
              });
            } else {
              parts.push({
                inlineData: {
                  mimeType: cleanMime,
                  data: msg.attachment.data,
                },
              });
              parts.push({
                text:
                  trimmedText ||
                  'Escucha y transcribe esta nota de voz. Extrae monto, fecha y descripción si corresponde a un gasto; si falta algún dato pregúntame antes de guardar. Si no tiene relación con gastos o finanzas, indícamelo.',
              });
            }
          }
        } else {
          parts.push({text: trimmedText || ' '});
        }

        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      });

      let lastError: unknown = null;
      let lastStatusCode = 500;

      for (const modelName of MODEL_CASCADE) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              tools: [{functionDeclarations: [registerExpenseDeclaration]}],
            },
          });

          const {replyText, functionCalls} = extractPartsRobustly(response);

          let finalReply = replyText;
          if (!finalReply && functionCalls.length > 0) {
            const firstCall = functionCalls[0];
            const args = (firstCall.args ?? {}) as Record<string, unknown>;
            const amt = Number(args.amount ?? 0);
            const cat = String(args.category ?? 'Alimentación');
            const desc = String(args.description ?? 'Gasto registrado');
            const date = String(args.date ?? currentDateISO);
            finalReply = `¡Listo, ${userName}! He guardado tu gasto de $${amt.toLocaleString('es-CO')} COP en ${cat} (${desc}) con fecha ${date}.`;
          }

          res.json({
            replyText: finalReply,
            functionCalls,
            modelUsed: modelName,
            transcript: latestTranscript ?? undefined,
          });
          return;
        } catch (err) {
          lastError = err;
          lastStatusCode = extractStatusCode(err);
          const isFallbackError =
            lastStatusCode === 429 ||
            lastStatusCode === 503 ||
            lastStatusCode === 404;

          console.warn(
            `[Assistant] Modelo ${modelName} falló con estado ${lastStatusCode}: ${extractErrorMessage(err)}`,
          );

          if (isFallbackError) {
            continue;
          }
          break;
        }
      }

      res.status(lastStatusCode).json({
        error: extractErrorMessage(lastError),
        statusCode: lastStatusCode,
      });
    } catch (err) {
      const statusCode = extractStatusCode(err);
      res.status(statusCode).json({
        error: extractErrorMessage(err),
        statusCode,
      });
    }
  });

  if (!isProduction) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
