/**
 * @file LandingPage.tsx
 * @description Landing page: el inicio de la web (fase 'landing', brief revisión 1.10). Presenta el producto
 * y tiene dos caminos: "Preparar mi sesión" (login con Google → Material → Duración → .yaleh) y
 * "Descargar para Windows" (el instalador, en el mismo hosting). Aparte ofrece el asistente sin conexión.
 * El escritorio nunca la muestra. Usa los tokens, letras y logo del diseño (ORION #29) y sigue el modo
 * claro/oscuro del sistema.
 */

import { useState } from 'react';
import {
  BarChart2,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileText,
  Laptop,
  Lock,
  LogIn,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Type,
  Upload,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { APP_VERSION, DOWNLOADS, LIMITS, LOCAL_AI } from '@shared/config';
import Logo from '../components/Logo';
import { useApp } from '../context/AppContext';

/** Tamaño del modelo en GB decimales (2,7 GB), como en la documentación. */
const MODEL_SIZE = `${(LOCAL_AI.sizeBytes / 1e9).toFixed(1).replace('.', ',')} GB`;
const MODELS_FOLDER = '%APPDATA%\\yaleh\\models';

const NAV = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#sin-conexion', label: 'Sin conexión' },
  { href: '#requisitos', label: 'Requisitos' },
  { href: '#preguntas', label: 'Preguntas' },
];

const STEPS = [
  {
    icon: Upload,
    title: 'Prepará tu sesión en la web',
    text: 'Entrá con tu cuenta de Google, subí tus apuntes (PDF, Word o texto) y elegí cuánto tiempo vas a estudiar.',
  },
  {
    icon: MousePointerClick,
    title: 'Abrí el archivo con doble clic',
    text: 'La web te da un archivo .yaleh. Al abrirlo, YALEH carga tus materiales y empieza la sesión.',
  },
  {
    icon: Lock,
    title: 'Estudiá sin distracciones',
    text: 'La computadora queda bloqueada en YALEH hasta que el tiempo llegue a cero. Solo se abren los sitios de estudio permitidos.',
  },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'Sesión protegida', text: 'Pantalla completa, sin atajos para salir y con registro de cada vez que la ventana pierde el foco.' },
  { icon: Sparkles, title: 'Asistente de IA con tus apuntes', text: 'Chat, resumen, tarjetas, cuestionario, informe, mapa mental, tabla, infografía y presentación.' },
  { icon: WifiOff, title: 'Funciona sin internet', text: 'El kiosko, las notas y el Pomodoro siguen igual; con el asistente sin conexión, también la IA.' },
  { icon: Wrench, title: 'Herramientas de Google', text: 'Docs, Hojas, Presentaciones, Drive y Classroom dentro de la sesión, con tu cuenta.' },
  { icon: Clock, title: 'Pomodoro y avisos', text: 'Pomodoro configurable, aviso antes de que termine el tiempo y opción de extender la sesión.' },
  { icon: BarChart2, title: 'Historial y estadísticas', text: 'Minutos estudiados por día, sesiones completadas e interrumpidas, y exportación a PDF.' },
  { icon: Type, title: 'Accesible', text: 'Tamaño del texto, alto contraste, tipografía para dislexia, menos animaciones y modo claro u oscuro.' },
  { icon: FileText, title: 'Tus archivos, en tu equipo', text: 'Los documentos originales nunca se suben: en la sesión se trabaja con el texto extraído.' },
];

const FAQ = [
  {
    q: 'Windows dice "Windows protegió su PC". ¿Es seguro?',
    a: 'Aparece porque el instalador todavía no tiene firma digital (requiere un certificado pago). Elegí "Más información" → "Ejecutar de todas formas". Se instala solo para tu usuario y no pide permisos de administrador.',
  },
  {
    q: '¿Puedo salir antes de que termine la sesión?',
    a: 'No: es la idea de YALEH. Si se apaga o se reinicia la computadora, la sesión queda como interrumpida y al volver a abrir YALEH podés retomarla con el tiempo que faltaba.',
  },
  {
    q: '¿Tengo que preparar la sesión acá?',
    a: 'No es obligatorio. Prepararla acá te deja subir tus apuntes desde cualquier computadora y llevarlos en el archivo .yaleh, pero en la aplicación también podés empezar una sesión con "Iniciar", con o sin conexión.',
  },
  {
    q: '¿Qué pasa con mis documentos?',
    a: 'Los archivos originales quedan en tu computadora. Al preparar la sesión acá se guarda el texto extraído en tu cuenta para armar el archivo de sesión. Con conexión, el asistente en línea (Gemini) recibe ese texto para responder; el asistente sin conexión trabaja en tu equipo y no envía nada.',
  },
  {
    q: '¿Cuánto cuesta?',
    a: 'Nada. YALEH es un proyecto de grado del TECBA y usa solo servicios gratuitos.',
  },
  {
    q: '¿Cómo lo desinstalo?',
    a: 'Desde Configuración de Windows → Aplicaciones → YALEH. Tu historial, la configuración y el asistente sin conexión quedan en %APPDATA%\\yaleh por si lo volvés a instalar; podés borrar esa carpeta si no los querés.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <OfflineAssistant />
        <Requirements />
        <Faq />
        <FinalCta />
      </main>
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center gap-3 justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span>
              YALEH v{APP_VERSION} · Proyecto de grado de Mario Víctor Brañez Rodriguez · TECBA 2026
            </span>
          </div>
          <span>Hecho para estudiantes del TECBA</span>
        </div>
      </footer>
    </div>
  );
}

function DownloadButton({ large = false, compact = false }: { large?: boolean; compact?: boolean }) {
  return (
    <a
      href={DOWNLOADS.installerPath}
      download={DOWNLOADS.installerFile}
      data-testid="download-installer"
      className={`inline-flex items-center justify-center gap-2.5 rounded-[18px] bg-accent hover:bg-accent-strong text-on-accent font-semibold whitespace-nowrap transition-colors ${
        large ? 'h-14 px-7 text-base' : 'h-11 px-5 text-sm'
      }`}
    >
      <Download size={large ? 20 : 16} />
      {compact ? (
        <>
          <span className="sm:hidden">Descargar</span>
          <span className="hidden sm:inline">Descargar para Windows</span>
        </>
      ) : (
        'Descargar para Windows'
      )}
    </a>
  );
}

/** "Preparar mi sesión": el login con Google (o Material si la cuenta ya está iniciada). */
function PrepareButton({ large = false, compact = false }: { large?: boolean; compact?: boolean }) {
  const { state, dispatch } = useApp();
  return (
    <button
      onClick={() => dispatch({ type: 'SET_PHASE', payload: state.session.isAuthenticated ? 'dropzone' : 'login' })}
      data-testid="prepare-session"
      className={`inline-flex items-center justify-center gap-2 rounded-[18px] border border-line bg-surface text-ink font-medium whitespace-nowrap hover:border-ink-muted ${
        large ? 'h-14 px-6 text-base' : 'h-11 px-4 text-sm'
      }`}
    >
      <LogIn size={large ? 18 : 16} />
      {compact ? (
        <>
          <span className="sm:hidden">Preparar</span>
          <span className="hidden sm:inline">Preparar mi sesión</span>
        </>
      ) : (
        'Preparar mi sesión'
      )}
    </button>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto h-[72px] px-4 sm:px-8 flex items-center gap-6">
        <a href="#inicio" className="flex items-center gap-2.5 flex-shrink-0">
          <Logo size={38} />
          <b className="font-display text-[19px] font-extrabold tracking-[0.04em]">YALEH</b>
        </a>
        <nav className="hidden xl:flex flex-1 justify-center gap-1" aria-label="Secciones">
          {NAV.map(item => (
            <a key={item.href} href={item.href} className="px-3 py-2 rounded-lg text-sm text-ink-soft whitespace-nowrap hover:text-ink hover:bg-surface-raised">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto xl:ml-0 flex items-center gap-2">
          {/* En el celular solo cabe uno: preparar la sesión (los dos botones están en la portada). */}
          <PrepareButton compact />
          <span className="hidden sm:inline-flex">
            <DownloadButton compact />
          </span>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[45%] w-[1100px] h-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--color-accent) 14%, transparent) 0%, transparent 60%)' }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-accent/15 text-accent-soft text-[0.8rem] font-medium">
            <Laptop size={14} /> Para Windows 10 y 11 · gratis
          </span>
          <h1 className="mt-5 font-display text-5xl sm:text-[4rem] leading-[0.98] font-extrabold tracking-tight">
            Estudiá sin distracciones<span className="text-accent">.</span>
          </h1>
          <p className="mt-5 text-lg sm:text-[1.2rem] font-light text-ink-soft max-w-xl mx-auto lg:mx-0">
            YALEH bloquea la computadora durante tu sesión de estudio y te acompaña con un asistente de IA que trabaja con tus
            propios apuntes, con o sin internet.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <PrepareButton large />
            <DownloadButton large />
          </div>
          <p className="mt-4 text-[0.8rem] text-ink-muted">
            ¿Todavía no tenés la aplicación? Descargala para computadoras con Windows: versión {APP_VERSION}, {DOWNLOADS.installerSizeLabel}, 64 bits,
            sin permisos de administrador.
          </p>
        </div>
        <KioskPreview />
      </div>
    </section>
  );
}

/** Vista previa ilustrativa del kiosko (solo HTML, con los tokens del diseño). */
function KioskPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[520px] hidden sm:block">
      <div className="rounded-[20px] border border-line bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="flex">
          <div className="w-[92px] border-r border-line p-3 flex flex-col items-center gap-3">
            <Logo size={34} />
            {[0, 1, 2, 3].map(i => (
              <span key={i} className={`w-full h-7 rounded-lg ${i === 0 ? 'bg-accent/20 shadow-[inset_3px_0_0_var(--color-accent)]' : 'bg-surface-raised'}`} />
            ))}
          </div>
          <div className="flex-1 p-4 grid grid-cols-[0.8fr_1.2fr] gap-3">
            <div className="rounded-xl border border-line bg-canvas p-3 space-y-2">
              <p className="font-display text-xs font-bold">Fuentes</p>
              {['Biología.pdf', 'Clase 3.docx'].map(name => (
                <div key={name} className="flex items-center gap-2 rounded-lg border border-accent p-2">
                  <span className="w-5 h-6 rounded bg-accent/15 grid place-items-center text-accent-soft">
                    <FileText size={11} />
                  </span>
                  <span className="text-[10px] truncate">{name}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-line bg-canvas p-3 flex flex-col gap-2">
              <p className="font-display text-xs font-bold">Chat</p>
              <span className="self-end max-w-[85%] rounded-[10px_10px_3px_10px] bg-ink text-canvas text-[10px] px-2 py-1.5">Resumime la clase 3</span>
              <div className="flex gap-1.5">
                <span className="w-5 h-5 rounded-md bg-accent/15 text-accent-soft grid place-items-center flex-shrink-0">
                  <Sparkles size={10} />
                </span>
                <div className="space-y-1 flex-1">
                  <span className="block h-2 rounded bg-surface-raised w-full" />
                  <span className="block h-2 rounded bg-surface-raised w-4/5" />
                  <span className="block h-2 rounded bg-surface-raised w-3/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-14 border-t border-line flex items-center gap-3 px-4">
          <span className="w-8 h-8 rounded-full border-[3px] border-accent border-r-line" />
          <span className="leading-none">
            <span className="block text-[9px] uppercase tracking-wide font-semibold text-ink-muted">Quedan</span>
            <span className="font-mono text-base font-bold">00:24:52</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-ink-muted">
            <ShieldCheck size={12} className="text-accent" /> Sesión protegida
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-10">
      <p className="text-[0.72rem] tracking-[0.08em] uppercase text-accent-soft font-semibold">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl sm:text-[2.5rem] leading-[1.05] font-extrabold tracking-tight">{title}</h2>
      {text && <p className="mt-3 text-ink-soft">{text}</p>}
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20">
        <SectionTitle
          eyebrow="Cómo funciona"
          title="Tres pasos y a estudiar"
          text="Si es la primera vez, descargá e instalá la aplicación. Después, cada sesión empieza acá."
        />
        <ol className="grid md:grid-cols-3 gap-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-[20px] border border-line bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="w-[26px] h-[26px] rounded-full bg-ink text-canvas grid place-items-center text-xs font-semibold">{i + 1}</span>
                <Icon size={20} className="text-accent-soft" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <PrepareButton large />
          <DownloadButton large />
        </div>
        <p className="mt-5 text-center text-sm text-ink-muted">
          ¿Sin internet? En la aplicación tocá <b className="text-ink font-medium">Iniciar</b>, cargá tus archivos y elegí el tiempo.
        </p>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="funciones" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20">
        <SectionTitle eyebrow="Funciones" title="Todo lo que necesitás, nada más" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} data-testid="feature" className="rounded-2xl border border-line bg-canvas p-5">
              <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent-soft grid place-items-center">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 font-sans text-[0.95rem] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[0.84rem] text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OfflineAssistant() {
  const [copied, setCopied] = useState(false);
  const copyFolder = async () => {
    try {
      await navigator.clipboard.writeText(MODELS_FOLDER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="sin-conexion" className="scroll-mt-20 border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <p className="text-[0.72rem] tracking-[0.08em] uppercase text-accent-soft font-semibold">Opcional</p>
          <h2 className="mt-2 font-display text-3xl sm:text-[2.5rem] leading-[1.05] font-extrabold tracking-tight">Asistente sin conexión</h2>
          <p className="mt-4 text-ink-soft">
            Un modelo de IA que funciona en tu computadora, sin internet: chat con tus apuntes, resumen, tarjetas, cuestionario y más.
            Tus documentos no salen del equipo.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[
              `${LOCAL_AI.displayName} del ${LOCAL_AI.author}, licencia ${LOCAL_AI.license}.`,
              `Descarga aparte de ${MODEL_SIZE}; no viene en el instalador.`,
              `Necesita al menos ${LOCAL_AI.minRamLabel} de RAM y unos 3 GB libres.`,
              'Es más lento que el asistente en línea: puede tardar hasta un minuto en responder.',
            ].map(item => (
              <li key={item} className="flex gap-2.5">
                <Check size={16} className="text-success mt-0.5 flex-shrink-0" />
                <span className="text-ink-soft">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-[20px] border-2 border-accent bg-surface p-6">
            <span className="inline-flex h-6 px-2.5 items-center rounded-full bg-accent/15 text-accent-soft text-xs font-semibold">Recomendado</span>
            <h3 className="mt-3 font-display text-xl font-bold">Desde la aplicación</h3>
            <p className="mt-2 text-sm text-ink-soft">
              Con internet, en YALEH andá a <b className="text-ink font-medium">Configuración → IA sin conexión</b> y tocá{' '}
              <b className="text-ink font-medium">Descargar asistente sin conexión</b>. Se puede pausar y retomar, y YALEH comprueba el archivo al terminar.
            </p>
          </div>

          <div className="rounded-[20px] border border-line bg-surface p-6" data-testid="manual-model">
            <h3 className="font-display text-xl font-bold">Descarga directa</h3>
            <p className="mt-2 text-sm text-ink-soft">Si preferís bajarlo con el navegador (por ejemplo, en otra conexión):</p>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="w-[26px] h-[26px] rounded-full bg-ink text-canvas grid place-items-center text-xs font-semibold flex-shrink-0">1</span>
                <span className="pt-0.5">
                  Descargá <span className="font-mono text-[0.8rem]">{LOCAL_AI.fileName}</span> ({MODEL_SIZE}).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-[26px] h-[26px] rounded-full bg-ink text-canvas grid place-items-center text-xs font-semibold flex-shrink-0">2</span>
                <span className="pt-0.5 min-w-0">
                  Copialo, sin cambiarle el nombre, en esta carpeta (abrí YALEH una vez antes para que exista):
                  <span className="mt-2 flex items-center gap-2 rounded-xl bg-surface-raised px-3 py-2 font-mono text-[0.8rem] break-all">
                    {MODELS_FOLDER}
                    <button onClick={() => void copyFolder()} className="ml-auto p-1 rounded-md text-ink-muted hover:text-ink" title="Copiar la ruta" aria-label="Copiar la ruta">
                      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-[26px] h-[26px] rounded-full bg-ink text-canvas grid place-items-center text-xs font-semibold flex-shrink-0">3</span>
                <span className="pt-0.5">Abrí YALEH: en Configuración → IA sin conexión aparece como instalado.</span>
              </li>
            </ol>
            <a
              href={LOCAL_AI.url}
              data-testid="download-model"
              className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-[14px] border border-line bg-canvas text-sm font-medium hover:border-ink-muted"
            >
              <Download size={16} /> Descargar el modelo ({MODEL_SIZE})
            </a>
            <p className="mt-3 text-[0.72rem] text-ink-muted break-all">SHA-256: <span className="font-mono">{LOCAL_AI.sha256}</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Requirements() {
  const rows = [
    { label: 'Sistema', value: 'Windows 10 u 11 de 64 bits' },
    { label: 'Espacio', value: 'Unos 500 MB para la aplicación' },
    { label: 'Internet', value: 'Para la web, el asistente en línea y las herramientas de Google. Sin internet funcionan el kiosko, las notas, el Pomodoro y el asistente sin conexión.' },
    { label: 'Asistente sin conexión', value: `${LOCAL_AI.minRamLabel} de RAM o más y ${MODEL_SIZE} para el modelo` },
    { label: 'Sesiones', value: `De ${LIMITS.minSessionMinutes} a ${LIMITS.maxSessionMinutes} minutos; el archivo .yaleh vale 24 horas y se usa una sola vez` },
  ];
  return (
    <section id="requisitos" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-20">
        <SectionTitle eyebrow="Requisitos" title="¿Funciona en mi computadora?" />
        <dl className="rounded-[20px] border border-line bg-canvas divide-y divide-line">
          {rows.map(row => (
            <div key={row.label} className="grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-6 px-5 py-4">
              <dt className="text-sm font-medium">{row.label}</dt>
              <dd className="text-sm text-ink-soft">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="preguntas" className="scroll-mt-20 border-t border-line">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-20">
        <SectionTitle eyebrow="Preguntas frecuentes" title="Antes de instalar" />
        <div className="space-y-3">
          {FAQ.map(item => (
            <details key={item.q} className="group rounded-2xl border border-line bg-surface px-5 py-4">
              <summary className="flex items-center gap-3 cursor-pointer list-none font-medium">
                <span className="flex-1">{item.q}</span>
                <ChevronDown size={18} className="text-ink-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 text-center flex flex-col items-center gap-6">
        <Logo size={88} />
        <h2 className="font-display text-3xl sm:text-[2.75rem] leading-[1.05] font-extrabold tracking-tight">
          Tu próxima sesión, sin distracciones<span className="text-accent">.</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <PrepareButton large />
          <DownloadButton large />
        </div>
        <p className="text-[0.8rem] text-ink-muted">Gratis · la aplicación es para Windows 10 y 11 · versión {APP_VERSION}</p>
      </div>
    </section>
  );
}
