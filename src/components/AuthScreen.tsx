import {FormEvent, useState} from 'react';
import {motion} from 'motion/react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {auth, googleProvider} from '../firebase';

type AuthMode = 'login' | 'register';

function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as {code: unknown}).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'El correo electrónico no tiene un formato válido.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo. Inicia sesión para entrar.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/popup-closed-by-user':
      return 'Cerraste la ventana de Google antes de completar el ingreso.';
    case 'auth/popup-blocked':
      return 'Tu navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes e intenta de nuevo.';
    case 'auth/cancelled-popup-request':
      return 'Se canceló la solicitud anterior de Google. Intenta de nuevo.';
    case 'auth/operation-not-allowed':
      return 'El método de correo y contraseña aún no está habilitado en Firebase Console (Authentication > Sign-in method > Correo electrónico/contraseña). Puedes entrar rápido con Google o habilitarlo en tu consola de Firebase.';
    case 'auth/network-request-failed':
      return 'Error de conexión con Firebase. Verifica tu internet e intenta nuevamente.';
    default:
      return error instanceof Error
        ? error.message
        : 'No se pudo completar la autenticación.';
  }
}

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (mode === 'register' && trimmedName.length < 2) {
      setErrorMessage('Por favor ingresa tu nombre (mínimo 2 caracteres).');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          password,
        );
        await updateProfile(credential.user, {
          displayName: trimmedName,
        });
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (error) {
      setErrorMessage(mapFirebaseAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setErrorMessage(mapFirebaseAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0A0D14] px-4 py-10 text-slate-100">
      <motion.div
        initial={{opacity: 0, y: 14}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.28, ease: [0.16, 1, 0.3, 1]}}
        className="mx-auto w-full max-w-md"
      >
        {/* Marca */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2EE87A] text-[#071A10] shadow-[0_0_28px_rgba(46,232,122,0.3)]"
            aria-hidden="true"
          >
            <Wallet className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">
            Mi Presupuesto Mensual
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Tu presupuesto personal en pesos colombianos (COP), guardado solo en tu cuenta
          </p>
        </div>

        {/* Tarjeta de autenticación */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131720] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <div
            className="h-1 w-full bg-gradient-to-r from-[#5B3DF5] via-[#7B61FF] to-[#2EE87A]"
            aria-hidden="true"
          />

          <div className="p-6 sm:p-7">
            {/* Selector de modo */}
            <div
              className="grid grid-cols-2 rounded-xl border border-white/[0.06] bg-[#0B0F17] p-1"
              role="tablist"
              aria-label="Modo de acceso"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  mode === 'login'
                    ? 'bg-[#1F2736] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  mode === 'register'
                    ? 'bg-[#1F2736] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            {/* Botón rápido con Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.12] bg-[#1B202C] px-4 py-3 text-sm font-semibold text-white transition-all hover:border-white/25 hover:bg-[#232A3A] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.11-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.23 1.18-3.26 0-6.02-2.2-7-5.16H1.01v3.14C3.05 21.2 7.21 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5 14.01c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.15H1.01C.37 7.43 0 8.88 0 11.65s.37 4.22 1.01 5.5l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.79 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.8 1.01 6.85l3.99 3.14C5.98 6.95 8.74 4.75 12 4.75Z"
                />
              </svg>
              <span>Entrar rápido con Google</span>
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                o con tu correo
              </span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} noValidate className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Tu nombre
                  </label>
                  <div className="relative mt-1.5">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-name"
                      type="text"
                      maxLength={60}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ej. Tatiana"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-[#5B3DF5] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Correo electrónico
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-[#5B3DF5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Contraseña
                </label>
                <div className="relative mt-1.5">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      mode === 'register' ? 'new-password' : 'current-password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-[#5B3DF5] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Ver contraseña'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#5B3DF5] py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(91,61,245,0.35)] transition-all hover:bg-[#6D52F7] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Procesando...'
                  : mode === 'register'
                  ? 'Crear mi cuenta'
                  : 'Entrar a mi presupuesto'}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2EE87A]" aria-hidden="true" />
              <span>Tus presupuestos y movimientos son privados por cuenta</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
