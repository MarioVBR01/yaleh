/**
 * @file Dashboard.tsx
 * @description Panel central del Modo Kiosko — Dashboard Académico Principal.
 * Renderiza 5 secciones modulares fijas:
 * 1. Sitios Educativos (Shortcuts con logos)
 * 2. Material Offline (Encarta)
 * 3. Videos Educativos
 * 4. Biblioteca de Imágenes
 * 5. Trabajo con IA (NotebookLM-inspired)
 */

import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

// ─── DATOS DE SECCIONES ───────────────────────────────────────────────────────

/** Plataformas educativas de la Lista Blanca */
const EDUCATIONAL_SITES = [
  { name: 'Duolingo', url: 'https://es.duolingo.com', icon: '🦉', color: 'from-green-500 to-emerald-600', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { name: 'Wikipedia', url: 'https://es.wikipedia.org', icon: '🌐', color: 'from-gray-500 to-gray-600', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  { name: 'Khan Academy', url: 'https://es.khanacademy.org', icon: '📐', color: 'from-teal-500 to-cyan-600', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  { name: 'Coursera', url: 'https://www.coursera.org', icon: '🎓', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { name: 'SciELO', url: 'https://www.scielo.org', icon: '🔬', color: 'from-purple-500 to-violet-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { name: 'Google Scholar', url: 'https://scholar.google.com', icon: '📚', color: 'from-blue-400 to-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { name: 'Moodle', url: 'https://moodle.org', icon: '🏫', color: 'from-orange-500 to-amber-600', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { name: 'G. Classroom', url: 'https://classroom.google.com', icon: '🖥️', color: 'from-green-400 to-teal-500', bg: 'bg-green-400/10', border: 'border-green-400/20' },
];

/** Canales de video educativos */
const VIDEO_SITES = [
  { name: 'Educatina', url: 'https://www.educatina.com', icon: '📹', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
  { name: 'TED Talks', url: 'https://www.ted.com', icon: '🎤', color: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
  { name: 'Nibble', url: 'https://nibble.org', icon: '🎬', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  { name: 'Seekho', url: 'https://seekho.com', icon: '🎯', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { name: 'CuriosityStream', url: 'https://curiositystream.com', icon: '🌌', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
  { name: 'StudyTok', url: 'https://studytok.com', icon: '📱', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400' },
];

/** Plataformas de imágenes académicas libres */
const IMAGE_SITES = [
  { name: 'Pexels', url: 'https://www.pexels.com', icon: '📷', color: 'bg-emerald-500/10 border-emerald-500/20' },
  { name: 'Pixabay', url: 'https://www.pixabay.com', icon: '🖼️', color: 'bg-amber-500/10 border-amber-500/20' },
  { name: 'Freepik', url: 'https://www.freepik.com', icon: '🎨', color: 'bg-orange-500/10 border-orange-500/20' },
  { name: 'Pics4Learning', url: 'https://www.pics4learning.com', icon: '🏞️', color: 'bg-sky-500/10 border-sky-500/20' },
];

// ─── ANIMACIONES ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── SUBCOMPONENTES ───────────────────────────────────────────────────────────

/**
 * Encabezado de sección con título, emoji y línea decorativa.
 */
function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-2xl">{emoji}</span>
      <div>
        <h2 className="text-white font-bold text-sm tracking-wide uppercase">{title}</h2>
        {subtitle && <p className="text-slate-500 text-xs">{subtitle}</p>}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent ml-2" />
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Dashboard() {
  const { state, openTab, logActivity } = useApp();

  /**
   * Abre un sitio web en una nueva pestaña y registra la actividad.
   */
  const handleOpenSite = (name: string, url: string, icon: string) => {
    openTab({ type: 'workspace-url', title: name, url, icon });
    logActivity({ type: 'site', label: `Visita: ${name}`, detail: url, icon });
  };

  /**
   * Abre el módulo de Encarta (Material Offline) en nueva pestaña.
   */
  const handleEncarta = () => {
    openTab({ type: 'encarta', title: 'Enciclopedia Offline', icon: '📖' });
    logActivity({ type: 'tool', label: 'Enciclopedia Offline abierta', icon: '📖' });
  };

  /**
   * Abre el módulo de trabajo con IA en nueva pestaña.
   */
  const handleAIWork = () => {
    openTab({ type: 'ai-work', title: 'Trabajo con IA', icon: '🤖' });
    logActivity({ type: 'tool', label: 'Módulo IA abierto', icon: '🤖' });
  };

  const hasFiles = state.uploadedFiles.length > 0;

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-5">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto space-y-8"
      >

        {/* Saludo de bienvenida */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              Bienvenido, {state.session.displayName || 'Estudiante'} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Tu entorno de estudio blindado está listo.
            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-slate-500 text-xs">Sesión activa</p>
            <p className="text-blue-400 text-sm font-mono font-medium">
              {state.uploadedFiles.length} archivo(s) cargado(s)
            </p>
          </div>
        </motion.div>

        {/* ── SECCIÓN 1: EDUCATIVOS ─────────────────────────────────────── */}
        <motion.section variants={itemVariants}>
          <SectionHeader
            emoji="🎓"
            title="Educativos"
            subtitle="Plataformas académicas de la lista blanca"
          />
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {EDUCATIONAL_SITES.map(site => (
              <motion.button
                key={site.name}
                onClick={() => handleOpenSite(site.name, site.url, site.icon)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${site.bg} ${site.border} hover:scale-105 transition-all group`}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${site.color} flex items-center justify-center text-xl shadow-lg group-hover:shadow-xl transition-shadow`}>
                  {site.icon}
                </div>
                <span className="text-slate-300 text-[10px] font-medium text-center leading-tight group-hover:text-white transition-colors">
                  {site.name}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.section>








        {/* ── SECCIÓN 2: MATERIAL OFFLINE (ENCARTA) ───────────────────────── */}
        <motion.section variants={itemVariants}>
          <SectionHeader
            emoji="📖"
            title="Material Offline"
            subtitle="Enciclopedia local — funciona sin internet"
          />
          <div
            className="relative rounded-2xl overflow-hidden border border-slate-700/50 cursor-pointer group"
            onClick={handleEncarta}
          >
            {/* Fondo degradado */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-blue-950 to-slate-900" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />

            {/* Patrón decorativo */}
            <div className="absolute inset-0 opacity-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-32 h-32 rounded-full border border-blue-400"
                  style={{ left: `${i * 20}%`, top: '-20%', transform: 'scale(1.5)' }}
                />
              ))}
            </div>

            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">📖</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">Enciclopedia SRB</h3>
                    <p className="text-blue-300 text-xs font-medium">Inspirada en Microsoft Encarta</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm max-w-lg mb-4">
                  Accede a contenido educativo completo en 6 áreas del conocimiento.
                  Artículos, videos locales, recursos multimedia — todo sin internet.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Ciencias', 'Ingeniería', 'Salud', 'Sociales', 'Artes', 'Educación'].map(cat => (
                    <span key={cat} className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-300 text-xs">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              <motion.div
                className="flex-shrink-0 ml-6"
                whileHover={{ scale: 1.05 }}
              >
                <div className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40">
                  Explorar →
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>






        {/* ── SECCIÓN 3: VIDEOS ──────────────────────────────────────────── */}
        <motion.section variants={itemVariants}>
          <SectionHeader
            emoji="🎬"
            title="Videos Educativos"
            subtitle="Canales de contenido académico permitidos"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {VIDEO_SITES.map(site => (
              <motion.button
                key={site.name}
                onClick={() => handleOpenSite(site.name, site.url, site.icon)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${site.color} bg-opacity-10 hover:bg-opacity-20 transition-all`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="text-3xl">{site.icon}</span>
                <span className="text-slate-300 text-xs font-medium text-center">{site.name}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* ── SECCIÓN 4: BIBLIOTECA DE IMÁGENES ─────────────────────────── */}
        <motion.section variants={itemVariants}>
          <SectionHeader
            emoji="🖼️"
            title="Biblioteca de Imágenes"
            subtitle="Recursos visuales de libre uso académico"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {IMAGE_SITES.map(site => (
              <motion.button
                key={site.name}
                onClick={() => handleOpenSite(site.name, site.url, site.icon)}
                className={`flex items-center gap-3 p-4 rounded-2xl border ${site.color} hover:opacity-80 transition-all group`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="text-2xl">{site.icon}</span>
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">{site.name}</p>
                  <p className="text-slate-500 text-xs">Libre uso</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* ── SECCIÓN 5: TRABAJO CON IA ───────────────────────────────────── */}
        <motion.section variants={itemVariants}>
          <SectionHeader
            emoji="🤖"
            title="Trabajo con IA"
            subtitle="Asistente académico inteligente"
          />
          <div
            className="relative rounded-2xl overflow-hidden border border-purple-700/30 cursor-pointer group"
            onClick={handleAIWork}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-950 via-violet-950 to-slate-900" />
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 50%), radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 50%)'
              }}
            />

            <div className="relative z-10 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xl shadow-lg">
                      🤖
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Asistente de Estudio IA</h3>
                      <p className="text-purple-300 text-xs">Generación · Resúmenes · Flashcards · Quiz</p>
                    </div>
                  </div>

                  {/* Preview de archivos cargados */}
                  {hasFiles ? (
                    <div className="mb-4">
                      <p className="text-slate-400 text-xs mb-2">
                        {state.uploadedFiles.length} documento(s) disponible(s) para análisis:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {state.uploadedFiles.slice(0, 3).map(file => (
                          <span key={file.id} className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-300 text-xs truncate max-w-[150px]">
                            📄 {file.name}
                          </span>
                        ))}
                        {state.uploadedFiles.length > 3 && (
                          <span className="px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 text-xs">
                            +{state.uploadedFiles.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm mb-4">
                      Sin archivos cargados — el asistente funcionará como tutor general
                      investigando en fuentes académicas permitidas.
                    </p>
                  )}

                  {/* Acciones rápidas de IA */}
                  <div className="flex flex-wrap gap-2">
                    {['📋 Resumen', '🃏 Flashcards', '❓ Quiz', '💬 Chat'].map(action => (
                      <span
                        key={action}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition-colors"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>

                <motion.div
                  className="flex-shrink-0 ml-6"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40">
                    Trabajar con IA →
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Espacio inferior */}
        <div className="h-4" />

      </motion.div>
    </div>
  );
}
