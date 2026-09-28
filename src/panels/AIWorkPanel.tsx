/**
 * @file AIWorkPanel.tsx
 * @description Módulo de Trabajo con IA de YALEH — Inspirado en NotebookLM.
 * Zona izquierda: AI GENERATE (Resumen, Flashcards, Quiz, Feedback).
 * Zona derecha: CHAT — Tutor académico adaptativo con IA.
 * Funciona con o sin archivos cargados.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, FileText, Brain, Layers, HelpCircle,
  MessageSquare, Star, Sparkles, RefreshCw, Copy, Check, Globe
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeneratedContent {
  type: 'summary' | 'flashcards' | 'quiz' | 'feedback' | null;
  content: string;
  loading: boolean;
}

// ─── RESPUESTAS SIMULADAS ─────────────────────────────────────────────────────

/**
 * Base de respuestas educativas para el modo tutor.
 * En producción, reemplazar con llamada a API (OpenAI, Gemini, etc.)
 */
const AI_RESPONSES: Record<string, string[]> = {
  default: [
    "¡Excelente pregunta! Como tu tutor académico, te puedo ayudar a comprender este tema en profundidad. ¿Qué aspecto específico te gustaría explorar primero?",
    "Entiendo tu consulta. Voy a explicártelo de forma clara y estructurada, usando ejemplos prácticos para facilitar tu comprensión.",
    "¡Perfecto! Ese es un tema muy relevante en el contexto académico actual. Permíteme desglosarlo paso a paso para que puedas asimilarlo mejor.",
  ],
  saludos: [
    "¡Hola! Soy tu asistente académico de YALEH 📚. Estoy aquí para ayudarte a estudiar de manera más efectiva. ¿En qué tema trabajamos hoy?",
    "¡Bienvenido de nuevo! Listo para continuar con tu sesión de aprendizaje. ¿Qué deseas explorar hoy?",
  ],
};

/**
 * Genera una respuesta simulada según el contexto del mensaje.
 */
function generateAIResponse(userMessage: string, hasFiles: boolean): string {
  const msg = userMessage.toLowerCase();

  if (msg.match(/^(hola|buenos|buenas|hey|hi)/)) {
    return AI_RESPONSES.saludos[Math.floor(Math.random() * AI_RESPONSES.saludos.length)];
  }

  if (msg.includes('resumen') || msg.includes('resume')) {
    return hasFiles
      ? "📋 **Resumen generado a partir de tus documentos:**\n\nHe analizado el contenido de tus archivos y he identificado los conceptos clave. El documento aborda principalmente los principios fundamentales del tema, con énfasis en los conceptos teóricos y sus aplicaciones prácticas.\n\n**Puntos principales:**\n- Conceptos teóricos centrales del área\n- Metodologías y procedimientos clave\n- Conclusiones y aplicaciones\n\n¿Deseas que profundice en alguno de estos puntos específicos?"
      : "Para generar un resumen personalizado, necesitaría que cargues un documento en el Dropzone. Sin embargo, puedo ayudarte a crear resúmenes sobre cualquier tema académico. ¿Sobre qué materia deseas un resumen?";
  }

  if (msg.includes('flashcard') || msg.includes('tarjeta')) {
    return "🃏 **Flashcards generadas:**\n\n**Tarjeta 1:** ¿Qué es el método científico?\n*Respuesta:* Proceso sistemático de observación, hipótesis, experimentación y conclusión.\n\n**Tarjeta 2:** ¿Cuál es la diferencia entre hipótesis y teoría?\n*Respuesta:* La hipótesis es una suposición no probada; la teoría es una explicación sustentada por evidencia.\n\n**Tarjeta 3:** ¿Qué es una variable dependiente?\n*Respuesta:* La variable que se mide y que puede cambiar en respuesta a la variable independiente.\n\n¿Quieres más flashcards o sobre algún tema específico?";
  }

  if (msg.includes('quiz') || msg.includes('cuestionario') || msg.includes('pregunta')) {
    return "❓ **Cuestionario de práctica:**\n\n**Pregunta 1:** ¿Cuál es la principal función del núcleo celular?\na) Producción de energía\n**b) Almacenamiento y transcripción del ADN** ✓\nc) Síntesis de proteínas\nd) Transporte celular\n\n**Pregunta 2:** La fotosíntesis ocurre principalmente en:\na) Las mitocondrias\nb) El retículo endoplasmático\n**c) Los cloroplastos** ✓\nd) El aparato de Golgi\n\nTu puntaje estimado: 2/2 ⭐ ¡Excelente! ¿Quieres más preguntas de práctica?";
  }

  if (msg.includes('código') || msg.includes('programación') || msg.includes('python') || msg.includes('javascript')) {
    return "💻 **Código estructurado:**\n\n```python\n# Ejemplo: Algoritmo de búsqueda binaria\ndef busqueda_binaria(arr, objetivo):\n    '''\n    Búsqueda eficiente en array ordenado.\n    Complejidad: O(log n)\n    '''\n    izquierda, derecha = 0, len(arr) - 1\n    \n    while izquierda <= derecha:\n        medio = (izquierda + derecha) // 2\n        \n        if arr[medio] == objetivo:\n            return medio  # Encontrado\n        elif arr[medio] < objetivo:\n            izquierda = medio + 1\n        else:\n            derecha = medio - 1\n    \n    return -1  # No encontrado\n\n# Uso\nnumeros = [1, 3, 5, 7, 9, 11, 13]\nresultado = busqueda_binaria(numeros, 7)\nprint(f'Índice encontrado: {resultado}')  # Output: 3\n```\n\nEste código está listo para copiar y ejecutar. ¿Quieres que explique alguna parte o que lo adapte a otro lenguaje?";
  }

  if (msg.includes('glosario')) {
    return "📖 **Glosario Técnico generado:**\n\n- **Algoritmo:** Conjunto finito de pasos ordenados para resolver un problema.\n- **Variable:** Elemento que puede tomar distintos valores en un contexto.\n- **Función:** Relación que asigna exactamente un valor de salida a cada valor de entrada.\n- **Paradigma:** Modelo o patrón conceptual que define un enfoque o metodología.\n- **Hipótesis:** Proposición provisional sujeta a verificación experimental.\n\n¿Deseas añadir más términos o exportar este glosario a un documento?";
  }

  if (msg.includes('fuente') || msg.includes('buscar') || msg.includes('investigar')) {
    return "🔍 **Búsqueda en fuentes académicas autorizadas:**\n\nHe consultado las siguientes fuentes de la lista blanca:\n\n📚 **Wikipedia** — Artículo principal con referencias verificadas\n🔬 **Google Scholar** — 3 artículos científicos relevantes encontrados\n📄 **SciELO** — 2 publicaciones académicas en español\n🎓 **Khan Academy** — Módulo educativo relacionado\n\nLos resultados indican que el tema tiene múltiples enfoques. ¿Deseas que profundice en alguna fuente específica o que genere un estado del arte?";
  }

  // Respuesta general educativa
  const responses = [
    `Excelente consulta sobre "${userMessage.slice(0, 30)}...". Como tutor académico, te puedo orientar en varios aspectos:\n\n1. **Comprensión conceptual:** Los fundamentos teóricos son esenciales para dominar este tema.\n2. **Aplicación práctica:** La práctica constante consolida el aprendizaje.\n3. **Recursos adicionales:** Te recomiendo explorar Wikipedia y Khan Academy para profundizar.\n\n¿Te gustaría que elabore un **glosario técnico**, un **resumen ejecutivo** o un **examen corto de práctica** sobre este tema?`,
    `Entiendo tu consulta. Este es un tema fascinante con múltiples dimensiones de análisis.\n\n**Lo que necesitas saber:**\n- Los conceptos fundamentales se construyen sobre bases previas\n- La comprensión progresiva es clave para el aprendizaje efectivo\n- La práctica y los ejemplos concretos facilitan la asimilación\n\nPuedo ayudarte a crear:\n🃏 Flashcards de memoria\n❓ Cuestionarios de práctica\n📋 Resúmenes estructurados\n\n¿Por cuál prefieres comenzar?`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// ─── COMPONENTES ──────────────────────────────────────────────────────────────

/**
 * Renderiza el contenido markdown-like de los mensajes del chat.
 */
function MessageContent({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatted = content
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-700 text-cyan-300 text-xs font-mono">$1</code>')
    .replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre class="bg-slate-900 border border-slate-700 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-green-300 leading-relaxed"><code>$2</code></pre>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 mb-1"><span class="text-blue-400 font-bold min-w-[16px]">$1.</span><span>$2</span></div>')
    .replace(/^[-•] (.+)$/gm, '<div class="flex gap-2 mb-1"><span class="text-blue-400">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br/>');

  return (
    <div className="relative group">
      <div
        className="text-sm text-slate-300 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-white transition-all"
        title="Copiar"
      >
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function AIWorkPanel() {
  const { state } = useApp();
  const hasFiles = state.uploadedFiles.length > 0;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: hasFiles
        ? `¡Hola! 👋 Tengo acceso a **${state.uploadedFiles.length} documento(s)** que cargaste. Puedo ayudarte a generar resúmenes, flashcards, cuestionarios de práctica, o simplemente conversar sobre el contenido.\n\n¿Con qué comenzamos?`
        : `¡Hola! 👋 Soy tu asistente académico de **YALEH**. \n\nNo has cargado documentos aún, pero puedo:\n- 🔍 Investigar temas en fuentes académicas\n- 💡 Explicar conceptos científicos\n- 💻 Escribir y depurar código\n- 📝 Redactar textos académicos formateados\n- 🃏 Crear flashcards y cuestionarios\n\n*"Busca fuentes nuevas en la web"* — Sugerencia permanente disponible.\n\n¿Sobre qué tema trabajamos hoy?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent>({ type: null, content: '', loading: false });
  const [activePanel, setActivePanel] = useState<'generate' | 'chat'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  /** Desplaza el chat hacia el mensaje más reciente */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /**
   * Envía un mensaje al asistente de IA y genera una respuesta contextual.
   */
  const sendMessage = useCallback(async (msg?: string) => {
    const content = (msg || input).trim();
    if (!content || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simula el tiempo de procesamiento de la IA
    const delay = 800 + Math.random() * 1200;
    await new Promise(r => setTimeout(r, delay));

    const response = generateAIResponse(content, hasFiles);
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMsg]);
    setIsTyping(false);
  }, [input, isTyping, hasFiles]);

  /**
   * Genera contenido automático (Resumen, Flashcards, Quiz, Feedback)
   * basado en los documentos cargados o de forma general.
   */
  const generateContent = useCallback(async (type: 'summary' | 'flashcards' | 'quiz' | 'feedback') => {
    setGenerated({ type, content: '', loading: true });
    setActivePanel('generate');
    await new Promise(r => setTimeout(r, 1500));

    const contents: Record<string, string> = {
      summary: hasFiles
        ? `## 📋 Resumen Ejecutivo\n\nAnálisis de ${state.uploadedFiles.length} documento(s) cargados:\n\n**Documento principal:** ${state.uploadedFiles[0]?.name}\n\n### Puntos Clave Identificados:\n\n1. **Conceptos Centrales** — El documento establece una base teórica sólida en el área de estudio, definiendo terminología especializada y marcos de referencia.\n\n2. **Metodología** — Se presenta una aproximación estructurada con pasos claros y criterios de evaluación definidos.\n\n3. **Conclusiones** — Los resultados sugieren una correlación positiva entre los elementos analizados y los objetivos planteados.\n\n### Recomendaciones:\n- Profundizar en los conceptos del capítulo 2\n- Consultar las referencias bibliográficas citadas\n- Practicar con los ejercicios propuestos\n\n*Confianza del análisis: Alta*`
        : `## 📋 Resumen de Metodología de Estudio\n\nSin documentos cargados, aquí tienes un resumen de técnicas de estudio efectivas:\n\n1. **Técnica Pomodoro** — 25 minutos de trabajo + 5 de descanso\n2. **Recuperación espaciada** — Repasar material a intervalos crecientes\n3. **Práctica activa** — Generar preguntas y responderlas\n4. **Elaboración** — Conectar conceptos nuevos con conocimiento previo\n5. **Intercalado** — Alternar entre temas para mejorar retención`,

      flashcards: `## 🃏 Flashcards Generadas\n\n**Tarjeta 1:**\n❓ ¿Qué es el aprendizaje significativo?\n✅ Es el proceso por el cual el nuevo conocimiento se relaciona con conceptos preexistentes en la estructura cognitiva del estudiante. (Ausubel)\n\n---\n\n**Tarjeta 2:**\n❓ ¿Cuál es la diferencia entre dato e información?\n✅ El dato es un valor bruto sin contexto; la información es un dato procesado e interpretado con significado.\n\n---\n\n**Tarjeta 3:**\n❓ ¿Qué es la metacognición?\n✅ Es la capacidad de reflexionar sobre los propios procesos de pensamiento y aprendizaje para regularlos.\n\n---\n\n**Tarjeta 4:**\n❓ ¿Qué establece la Ley de Fitts?\n✅ El tiempo para adquirir un objetivo es función de la distancia y el tamaño del objetivo: T = a + b·log₂(2D/W)\n\n*¿Quieres exportar estas tarjetas a un documento?*`,

      quiz: `## ❓ Cuestionario de Práctica\n\n**Instrucciones:** Selecciona la respuesta correcta.\n\n**1.** ¿Cuál es la complejidad temporal de la búsqueda binaria?\na) O(n)\nb) O(n²)\n**c) O(log n)** ✓\nd) O(1)\n\n**2.** En estadística, ¿qué mide la desviación estándar?\na) El valor central de los datos\n**b) La dispersión de los datos respecto a la media** ✓\nc) El valor más frecuente\nd) La diferencia entre el máximo y mínimo\n\n**3.** ¿Qué tipo de aprendizaje describe el condicionamiento operante?\na) Aprendizaje por observación\nb) Aprendizaje por comprensión\n**c) Aprendizaje por consecuencias** ✓\nd) Aprendizaje por descubrimiento\n\n**4.** La célula eucariota se diferencia de la procariota por:\n**a) Presencia de núcleo definido** ✓\nb) Mayor tamaño\nc) Capacidad de reproducirse\nd) Presencia de ARN\n\n*Puntaje estimado: 4/4 ⭐ Si tienes dudas en alguna, dímelo para explicarla.*`,

      feedback: `## 💬 Retroalimentación y Recomendaciones\n\n### Análisis de tu Sesión de Estudio\n\n**Tiempo activo:** ${Math.round((state.sessionDuration - state.timeRemaining) / 60)} minutos\n**Archivos analizados:** ${state.uploadedFiles.length}\n**Interacciones:** ${messages.length}\n\n### Fortalezas Detectadas:\n✅ Uso activo del asistente para consultas\n✅ Sesión de estudio estructurada\n✅ Enfoque en material académico\n\n### Áreas de Mejora:\n📌 **Profundización:** Considera explorar los temas con más fuentes bibliográficas\n📌 **Práctica:** Los cuestionarios de práctica refuerzan la retención a largo plazo\n📌 **Síntesis:** Crear mapas conceptuales ayuda a conectar ideas\n\n### Plan de Acción Sugerido:\n1. Genera flashcards sobre los conceptos clave\n2. Realiza el cuestionario de práctica\n3. Toma un descanso con el temporizador Pomodoro\n4. Revisa las fuentes en Wikipedia o Scholar\n\n*¿Quieres que cree un glosario técnico o un resumen ejecutivo de esta sesión?*`,
    };

    setGenerated({ type, content: contents[type] || '', loading: false });
  }, [hasFiles, state.uploadedFiles, state.sessionDuration, state.timeRemaining, messages.length]);

  const GENERATE_ACTIONS = [
    { type: 'summary' as const, label: 'Generar Resumen', icon: <FileText size={16} />, color: 'from-blue-600 to-blue-700', hoverColor: 'hover:from-blue-500 hover:to-blue-600' },
    { type: 'flashcards' as const, label: 'Flashcards', icon: <Layers size={16} />, color: 'from-emerald-600 to-emerald-700', hoverColor: 'hover:from-emerald-500 hover:to-emerald-600' },
    { type: 'quiz' as const, label: 'Cuestionario', icon: <HelpCircle size={16} />, color: 'from-amber-600 to-amber-700', hoverColor: 'hover:from-amber-500 hover:to-amber-600' },
    { type: 'feedback' as const, label: 'Retroalimentación', icon: <Star size={16} />, color: 'from-purple-600 to-purple-700', hoverColor: 'hover:from-purple-500 hover:to-purple-600' },
  ];

  const QUICK_SUGGESTIONS = [
    'Explícame con un ejemplo',
    '¿Puedes crear un glosario?',
    'Busca fuentes en la web académica',
    'Genera un resumen ejecutivo',
    'Escribe código de ejemplo',
  ];

  return (
    <div className="h-full flex bg-slate-950 overflow-hidden">

      {/* Panel Izquierdo: AI GENERATE */}
      <div className="w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-purple-400" />
            <h2 className="text-white font-bold text-sm">AI GENERATE</h2>
          </div>
          <p className="text-slate-500 text-xs">
            {hasFiles ? `${state.uploadedFiles.length} documento(s) disponibles` : 'Sin documentos — modo tutor general'}
          </p>
        </div>

        {/* Archivos cargados */}
        {hasFiles && (
          <div className="p-3 border-b border-slate-800">
            <p className="text-slate-500 text-xs mb-2">Documentos analizables:</p>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {state.uploadedFiles.map(file => (
                <div key={file.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800 text-xs">
                  <span>📄</span>
                  <span className="text-slate-300 truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones de generación */}
        <div className="p-3 space-y-2">
          {GENERATE_ACTIONS.map(action => (
            <motion.button
              key={action.type}
              onClick={() => generateContent(action.type)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${action.color} ${action.hoverColor} text-white text-sm font-medium transition-all shadow-sm`}
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              {action.icon}
              {action.label}
            </motion.button>
          ))}
        </div>

        {/* Sugerencia permanente */}
        <div className="mt-auto p-3">
          <button
            onClick={() => sendMessage('Busca fuentes nuevas en la web académica sobre el tema actual')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-colors"
          >
            <Globe size={14} />
            Busca fuentes nuevas en la web
          </button>
        </div>
      </div>

      {/* Panel Derecho: CHAT + GENERATE OUTPUT */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Tabs de panel */}
        <div className="flex border-b border-slate-800 bg-slate-900 flex-shrink-0">
          <button
            onClick={() => setActivePanel('chat')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activePanel === 'chat'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            <MessageSquare size={15} />
            Chat con IA
          </button>
          <button
            onClick={() => setActivePanel('generate')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activePanel === 'generate'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            <Brain size={15} />
            Contenido Generado
            {generated.type && <div className="w-2 h-2 rounded-full bg-purple-400" />}
          </button>
        </div>

        {/* Vista: Chat */}
        {activePanel === 'chat' && (
          <>
            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs">🤖</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-slate-800 border border-slate-700 rounded-bl-sm'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : (
                        <MessageContent content={msg.content} />
                      )}
                      <p className="text-[10px] mt-1.5 opacity-40">
                        {msg.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white">
                        {(state.session.initials || 'TU')[0]}
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Indicador de escritura */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">🤖</span>
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-800 border border-slate-700">
                      <div className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-slate-400"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Sugerencias rápidas */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0">
              {QUICK_SUGGESTIONS.map(sug => (
                <button
                  key={sug}
                  onClick={() => sendMessage(sug)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-slate-400 hover:text-blue-300 text-xs transition-all"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Input de mensaje */}
            <div className="p-4 border-t border-slate-800 flex-shrink-0">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Escribe tu consulta académica..."
                  className="flex-1 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                <motion.button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-colors"
                  whileHover={input.trim() ? { scale: 1.05 } : {}}
                  whileTap={input.trim() ? { scale: 0.95 } : {}}
                >
                  <Send size={16} />
                </motion.button>
              </div>
            </div>
          </>
        )}

        {/* Vista: Contenido Generado */}
        {activePanel === 'generate' && (
          <div className="flex-1 overflow-y-auto p-6">
            {generated.loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <motion.div
                  className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ borderWidth: '3px' }}
                />
                <p className="text-slate-400 text-sm">Procesando con IA...</p>
              </div>
            ) : generated.content ? (
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain size={18} className="text-purple-400" />
                    <span className="text-white font-semibold text-sm">Contenido generado</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => generated.type && generateContent(generated.type)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      <RefreshCw size={12} /> Regenerar
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(generated.content)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      <Copy size={12} /> Copiar
                    </button>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
                  <MessageContent content={generated.content} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                <Brain size={40} className="opacity-30" />
                <p className="text-sm">Selecciona una acción del panel izquierdo</p>
                <p className="text-xs">El contenido generado aparecerá aquí</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
