import {ChangeEvent, FormEvent, useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  AlertTriangle,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  FileAudio,
  ImagePlus,
  Mic,
  Pencil,
  Send,
  Sparkles,
  Square,
  User,
  X,
} from 'lucide-react';
import {formatCOP} from '../data/budgetData';

interface RegisteredExpenseReceipt {
  amount: number;
  date: string;
  description: string;
  category: string;
}

export interface MediaAttachment {
  kind: 'image' | 'audio';
  mimeType: string;
  data: string; // base64 puro
  previewUrl: string; // data URL para previsualizar en UI
  name: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachment?: MediaAttachment;
  transcript?: string;
  isError?: boolean;
  registeredExpense?: RegisteredExpenseReceipt;
  modelUsed?: string;
}

export interface BudgetContextPayload {
  userName: string;
  monthLabel: string;
  baseBudget: number;
  totalIncome: number;
  effectiveBudget: number;
  totalSpent: number;
  availableBalance: number;
  currentDateISO: string;
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  budgetContext: BudgetContextPayload;
  onChangeUserName: (name: string) => void;
  onRegisterExpense: (payload: RegisteredExpenseReceipt) => void;
}

const SUGGESTED_PROMPTS = [
  'Gasté 25000 en almuerzo hoy',
  '¿Me alcanza para unos tenis de 280000?',
  '¿Cuánto saldo tengo disponible?',
];

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer el archivo adjunto.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo adjunto.'));
    reader.readAsDataURL(blob);
  });
}

function splitDataUrl(dataUrl: string, fallbackMime: string): {
  mimeType: string;
  data: string;
} {
  const match = dataUrl.match(/^data:([^;]+)(?:;[^,]*)?,(.*)$/s);
  if (match) {
    return {
      mimeType: match[1] || fallbackMime,
      data: match[2] || '',
    };
  }
  return {
    mimeType: fallbackMime,
    data: dataUrl,
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function AssistantDrawer({
  isOpen,
  onClose,
  budgetContext,
  onChangeUserName,
  onRegisterExpense,
}: AssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: `¡Hola, ${budgetContext.userName}! Soy tu asistente financiero. Cuéntame qué gastaste por texto, sube una foto o ticket de compra, o graba una nota de voz.`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Nombre editable dentro del asistente
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(budgetContext.userName);

  // Adjunto pendiente (imagen o audio)
  const [pendingAttachment, setPendingAttachment] =
    useState<MediaAttachment | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  // Grabación de audio con MediaRecorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const discardRecordingRef = useRef<boolean>(false);

  // Captura con cámara en vivo
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftName(budgetContext.userName);
  }, [budgetContext.userName]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages, isLoading, isOpen, pendingAttachment, isCameraOpen]);

  // Limpiar streams de micrófono y cámara si se cierra el drawer o se desmonta
  const stopAudioStream = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        discardRecordingRef.current = true;
        mediaRecorderRef.current.stop();
      }
      stopAudioStream();
      setIsRecording(false);
      setRecordingSeconds(0);
      closeCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopAudioStream();
      closeCamera();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [isCameraOpen]);

  const handleSaveName = () => {
    const cleaned = draftName.trim();
    if (cleaned) {
      onChangeUserName(cleaned);
    } else {
      setDraftName(budgetContext.userName);
    }
    setIsEditingName(false);
  };

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaNotice(null);
    if (file.size > MAX_FILE_BYTES) {
      setMediaNotice('La imagen supera el límite permitido de 15 MB.');
      return;
    }

    try {
      const previewUrl = await readBlobAsDataUrl(file);
      const {mimeType, data} = splitDataUrl(
        previewUrl,
        file.type || 'image/jpeg',
      );
      setPendingAttachment({
        kind: 'image',
        mimeType,
        data,
        previewUrl,
        name: file.name || 'recibo.jpg',
      });
    } catch {
      setMediaNotice('No se pudo cargar la imagen seleccionada.');
    }
  };

  const handleAudioFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaNotice(null);
    if (file.size > MAX_FILE_BYTES) {
      setMediaNotice('El archivo de audio supera el límite permitido de 15 MB.');
      return;
    }

    try {
      const previewUrl = await readBlobAsDataUrl(file);
      const {mimeType, data} = splitDataUrl(
        previewUrl,
        file.type || 'audio/mpeg',
      );
      setPendingAttachment({
        kind: 'audio',
        mimeType,
        data,
        previewUrl,
        name: file.name || 'nota-de-voz.mp3',
      });
    } catch {
      setMediaNotice('No se pudo cargar el archivo de audio.');
    }
  };

  const handleStartRecording = async () => {
    if (isRecording || isLoading) return;
    setMediaNotice(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMediaNotice(
        'Tu navegador no permite grabar audio directo; puedes subir un archivo de audio.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      audioStreamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const supportedType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      const recorder = supportedType
        ? new MediaRecorder(stream, {mimeType: supportedType})
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      discardRecordingRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const shouldDiscard = discardRecordingRef.current;
        const durationSnapshot = recordingSeconds;
        stopAudioStream();
        setIsRecording(false);
        setRecordingSeconds(0);

        if (shouldDiscard || audioChunksRef.current.length === 0) {
          return;
        }

        const rawMime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, {type: rawMime});
        if (blob.size > MAX_FILE_BYTES) {
          setMediaNotice('La nota de voz grabada supera el límite de 15 MB.');
          return;
        }

        try {
          const previewUrl = await readBlobAsDataUrl(blob);
          const {mimeType, data} = splitDataUrl(previewUrl, rawMime);
          setPendingAttachment({
            kind: 'audio',
            mimeType,
            data,
            previewUrl,
            name: `Nota de voz (${formatDuration(Math.max(durationSnapshot, 1))})`,
          });
        } catch {
          setMediaNotice('No se pudo procesar la nota de voz grabada.');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      stopAudioStream();
      setIsRecording(false);
      setMediaNotice(
        'No se pudo acceder al micrófono. Verifica los permisos o sube un archivo de audio.',
      );
    }
  };

  const handleStopRecording = (discard = false) => {
    discardRecordingRef.current = discard;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      stopAudioStream();
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  };

  const handleOpenCamera = async () => {
    setMediaNotice(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaNotice(
        'No se detectó acceso a cámara directa. Usa "Subir imagen" para seleccionar una foto o recibo.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: 'environment'},
      });
      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      setMediaNotice(
        'No se pudo abrir la cámara. Verifica los permisos o usa "Subir imagen".',
      );
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const previewUrl = canvas.toDataURL('image/jpeg', 0.9);
    const {mimeType, data} = splitDataUrl(previewUrl, 'image/jpeg');

    setPendingAttachment({
      kind: 'image',
      mimeType,
      data,
      previewUrl,
      name: `foto-recibo-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.jpg`,
    });
    closeCamera();
  };

  const sendMessage = async (
    rawText: string,
    overrideAttachment?: MediaAttachment | null,
  ) => {
    const trimmed = rawText.trim();
    const attachmentToSend =
      overrideAttachment !== undefined ? overrideAttachment : pendingAttachment;

    if ((!trimmed && !attachmentToSend) || isLoading || isRecording) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      attachment: attachmentToSend ?? undefined,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue('');
    setPendingAttachment(null);
    setMediaNotice(null);
    setIsLoading(true);

    try {
      const apiMessages = nextMessages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          text: m.transcript
            ? `${m.text ? `${m.text}\n` : ''}[Transcripción de nota de voz]: "${m.transcript}"`
            : m.text,
          attachment:
            m.attachment && !m.transcript
              ? {
                  kind: m.attachment.kind,
                  mimeType: m.attachment.mimeType,
                  data: m.attachment.data,
                  name: m.attachment.name,
                }
              : undefined,
        }));

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          messages: apiMessages,
          budgetContext,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        replyText?: string;
        functionCalls?: Array<{
          name?: string;
          args?: Record<string, unknown>;
        }>;
        modelUsed?: string;
        transcript?: string;
        error?: string;
        statusCode?: number;
      };

      if (!response.ok) {
        const status = data.statusCode ?? response.status;
        const rawError = data.error ?? `HTTP ${response.status}`;
        let friendlyError = rawError;

        if (
          status === 503 ||
          rawError.includes('503') ||
          rawError.includes('UNAVAILABLE')
        ) {
          friendlyError =
            'El asistente está muy solicitado en este momento. Por favor, intenta de nuevo en un minuto.';
        } else if (
          status === 429 ||
          rawError.includes('429') ||
          rawError.includes('RESOURCE_EXHAUSTED')
        ) {
          friendlyError =
            'He alcanzado mi límite de mensajes por ahora. Intenta de nuevo más tarde.';
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: friendlyError,
            isError: true,
          },
        ]);
        return;
      }

      // Guardar la transcripción en el mensaje del usuario si el backend la devolvió
      if (data.transcript) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id ? {...m, transcript: data.transcript} : m,
          ),
        );
      }

      let registeredReceipt: RegisteredExpenseReceipt | undefined;
      const calls = Array.isArray(data.functionCalls) ? data.functionCalls : [];

      for (const call of calls) {
        if (call.name === 'registerExpense' && call.args) {
          const amount = Number(call.args.amount ?? 0);
          const date = String(call.args.date ?? budgetContext.currentDateISO);
          const description = String(
            call.args.description ?? 'Gasto registrado por asistente',
          );
          const category = String(call.args.category ?? 'Alimentación');

          if (amount > 0) {
            const receipt: RegisteredExpenseReceipt = {
              amount,
              date,
              description,
              category,
            };
            registeredReceipt = receipt;
            onRegisterExpense(receipt);
          }
        }
      }

      const replyText =
        data.replyText?.trim() ||
        (registeredReceipt
          ? `¡Listo, ${budgetContext.userName}! He guardado tu gasto de ${formatCOP(registeredReceipt.amount)} en ${registeredReceipt.category}.`
          : 'He procesado tu solicitud.');

      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          registeredExpense: registeredReceipt,
          modelUsed: data.modelUsed,
        },
      ]);
    } catch (err) {
      const technicalMessage =
        err instanceof Error ? err.message : 'Error de red al conectar con el servidor.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: technicalMessage,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.2}}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer lateral */}
          <motion.aside
            initial={{x: '100%'}}
            animate={{x: 0}}
            exit={{x: '100%'}}
            transition={{duration: 0.25, ease: [0.16, 1, 0.3, 1]}}
            role="dialog"
            aria-modal="true"
            aria-labelledby="asistente-titulo"
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-[#0D1119] shadow-2xl"
          >
            {/* Cabecera del asistente */}
            <div className="border-b border-white/[0.06] bg-[#131720] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5B3DF5] text-white shadow-[0_0_20px_rgba(91,61,245,0.35)]"
                    aria-hidden="true"
                  >
                    <Bot className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h2
                      id="asistente-titulo"
                      className="font-display text-base font-bold text-white"
                    >
                      Asistente financiero
                    </h2>
                    <p className="text-xs text-slate-400">
                      {budgetContext.monthLabel} · Disponible:{' '}
                      <span className="font-mono font-semibold text-[#2EE87A]">
                        {formatCOP(budgetContext.availableBalance)}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar asistente"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1B202C] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Contexto editable de nombre del usuario */}
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0B0F17] px-3 py-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="h-3.5 w-3.5 text-[#8E77FF]" aria-hidden="true" />
                  <span>Nombre:</span>
                  {isEditingName ? (
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveName();
                        }
                      }}
                      autoFocus
                      maxLength={40}
                      aria-label="Tu nombre"
                      className="w-32 rounded-md border border-[#5B3DF5]/60 bg-[#131720] px-2 py-0.5 text-xs font-medium text-white focus:outline-none"
                    />
                  ) : (
                    <strong className="font-medium text-white">
                      {budgetContext.userName}
                    </strong>
                  )}
                </div>

                {isEditingName ? (
                  <button
                    type="button"
                    onClick={handleSaveName}
                    aria-label="Guardar nombre"
                    className="inline-flex items-center gap-1 rounded-md bg-[#2EE87A]/15 px-2 py-0.5 text-[11px] font-semibold text-[#2EE87A] transition-colors hover:bg-[#2EE87A]/25"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    <span>Guardar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    aria-label="Editar nombre de usuario"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span>Cambiar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Historial de mensajes */}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isUser
                          ? 'rounded-br-sm bg-[#5B3DF5] text-white'
                          : msg.isError
                          ? 'rounded-bl-sm border border-rose-500/40 bg-rose-500/10 text-rose-200'
                          : 'rounded-bl-sm border border-white/[0.06] bg-[#131720] text-slate-100'
                      }`}
                    >
                      {msg.isError && (
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Aviso del sistema</span>
                        </div>
                      )}

                      {msg.attachment?.kind === 'image' && (
                        <div className="mb-2 overflow-hidden rounded-xl border border-white/15 bg-black/20">
                          <img
                            src={msg.attachment.previewUrl}
                            alt={msg.attachment.name}
                            className="max-h-52 w-full object-cover"
                          />
                        </div>
                      )}

                      {msg.attachment?.kind === 'audio' && (
                        <div className="mb-2 space-y-1.5 rounded-xl border border-white/15 bg-black/25 p-2.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                            <FileAudio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{msg.attachment.name}</span>
                          </div>
                          <audio
                            controls
                            src={msg.attachment.previewUrl}
                            className="h-8 w-full"
                          />
                          {msg.transcript && (
                            <p className="border-t border-white/10 pt-1.5 text-[11px] italic text-white/85">
                              “{msg.transcript}”
                            </p>
                          )}
                        </div>
                      )}

                      {msg.text ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : msg.attachment ? (
                        <p className="text-xs text-white/85">
                          {msg.attachment.kind === 'image'
                            ? 'Comprobante / imagen enviada'
                            : 'Nota de voz enviada'}
                        </p>
                      ) : null}

                      {msg.registeredExpense && (
                        <div className="mt-3 rounded-xl border border-emerald-500/35 bg-[#0F241B] p-3 text-xs">
                          <div className="flex items-center gap-2 font-semibold text-[#2EE87A]">
                            <CheckCircle2
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>Gasto registrado en el Dashboard</span>
                          </div>
                          <div className="mt-2 space-y-1 text-slate-200">
                            <p>
                              <span className="text-slate-400">Monto:</span>{' '}
                              <strong className="font-mono text-white">
                                {formatCOP(msg.registeredExpense.amount)}
                              </strong>
                            </p>
                            <p>
                              <span className="text-slate-400">Categoría:</span>{' '}
                              {msg.registeredExpense.category}
                            </p>
                            <p>
                              <span className="text-slate-400">Descripción:</span>{' '}
                              {msg.registeredExpense.description}
                            </p>
                            <p>
                              <span className="text-slate-400">Fecha:</span>{' '}
                              <span className="font-mono">
                                {msg.registeredExpense.date}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Indicador de escribiendo... (dots animation) */}
              {isLoading && (
                <div className="flex items-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-white/[0.06] bg-[#131720] px-4 py-3 text-xs text-slate-300">
                    <span>analizando</span>
                    <span className="inline-flex items-center gap-1" aria-hidden="true">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2EE87A] [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2EE87A] [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2EE87A]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Zona inferior: cámara en vivo / aviso / adjunto pendiente / sugerencias / input */}
            <div className="border-t border-white/[0.06] bg-[#131720] p-4">
              {/* Vista previa de cámara en vivo */}
              {isCameraOpen && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-[#5B3DF5]/40 bg-[#0B0F17] p-2.5">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-video w-full rounded-xl bg-black object-cover"
                  />
                  <div className="mt-2.5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeCamera}
                      className="rounded-full border border-white/[0.08] bg-[#1B202C] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#2EE87A] px-4 py-1.5 text-xs font-bold text-[#061A10] hover:bg-[#49F28E]"
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Capturar foto</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Aviso de permisos o validación de archivos */}
              {mediaNotice && (
                <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <span>{mediaNotice}</span>
                  <button
                    type="button"
                    onClick={() => setMediaNotice(null)}
                    aria-label="Cerrar aviso multimedia"
                    className="rounded p-0.5 text-amber-200/70 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Vista previa del archivo adjunto antes de enviar */}
              {pendingAttachment && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#5B3DF5]/35 bg-[#0B0F17] p-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {pendingAttachment.kind === 'image' ? (
                      <img
                        src={pendingAttachment.previewUrl}
                        alt={pendingAttachment.name}
                        className="h-12 w-12 shrink-0 rounded-lg border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5B3DF5]/20 text-[#8E77FF]">
                        <FileAudio className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">
                        {pendingAttachment.name}
                      </p>
                      {pendingAttachment.kind === 'audio' ? (
                        <audio
                          controls
                          src={pendingAttachment.previewUrl}
                          className="mt-1 h-7 w-full"
                        />
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Imagen lista para analizar
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    aria-label="Quitar archivo adjunto"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1B202C] text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Estado de grabación activa */}
              {isRecording && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                    <span className="text-xs font-medium text-rose-100">
                      Grabando nota de voz...{' '}
                      <strong className="font-mono">
                        {formatDuration(recordingSeconds)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStopRecording(true)}
                      className="rounded-full border border-white/10 bg-[#1B202C] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStopRecording(false)}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-400"
                    >
                      <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                      <span>Listo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sugerencias rápidas */}
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isLoading || isRecording}
                    onClick={() => sendMessage(prompt, null)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#1B202C] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-[#5B3DF5]/60 hover:text-white disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3 text-[#8E77FF]" aria-hidden="true" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>

              {/* Barra de acciones multimedia (imagen, cámara, micrófono, subir audio) */}
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isLoading || isRecording}
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#1B202C] px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-[#5B3DF5]/60 hover:text-white disabled:opacity-50"
                >
                  <ImagePlus className="h-3.5 w-3.5 text-[#8E77FF]" aria-hidden="true" />
                  <span>Subir ticket</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading || isRecording}
                  onClick={handleOpenCamera}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#1B202C] px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-[#5B3DF5]/60 hover:text-white disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5 text-[#8E77FF]" aria-hidden="true" />
                  <span>Cámara</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    isRecording ? handleStopRecording(false) : handleStartRecording()
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                    isRecording
                      ? 'border-rose-500/50 bg-rose-500/20 text-rose-200'
                      : 'border-white/[0.08] bg-[#1B202C] text-slate-200 hover:border-[#2EE87A]/60 hover:text-white'
                  }`}
                >
                  <Mic
                    className={`h-3.5 w-3.5 ${
                      isRecording ? 'text-rose-400' : 'text-[#2EE87A]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{isRecording ? 'Detener voz' : 'Grabar voz'}</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading || isRecording}
                  onClick={() => audioInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#1B202C] px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-[#2EE87A]/60 hover:text-white disabled:opacity-50"
                >
                  <FileAudio className="h-3.5 w-3.5 text-[#2EE87A]" aria-hidden="true" />
                  <span>Subir audio</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading || isRecording}
                  placeholder={
                    pendingAttachment
                      ? 'Agrega una nota opcional o envía directo...'
                      : 'Escribe un gasto, sube un recibo o graba voz...'
                  }
                  aria-label="Escribe un gasto o pregunta al asistente"
                  className="flex-1 rounded-full border border-white/[0.08] bg-[#0B0F17] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-[#5B3DF5] focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    isRecording ||
                    (!inputValue.trim() && !pendingAttachment)
                  }
                  aria-label="Enviar mensaje"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5B3DF5] text-white transition-all hover:bg-[#6D52F7] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
