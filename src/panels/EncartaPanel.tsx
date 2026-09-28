/**
 * @file EncartaPanel.tsx
 * @description Módulo de Enciclopedia Offline (inspirado en Microsoft Encarta).
 * Muestra 6 Class Cards con imágenes representativas por área del conocimiento.
 * Permite navegar entre materias, temas y artículos locales.
 * Incluye barra de control propia (Atrás, Adelante, Búsqueda, Inicio).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Home, Search, X } from 'lucide-react';

// ─── DATOS DE CATEGORÍAS ──────────────────────────────────────────────────────

interface EncartaSubject {
  id: string;
  name: string;
  topics: EncartaTopic[];
}

interface EncartaTopic {
  id: string;
  name: string;
  content: string;
  type: 'article' | 'video' | 'interactive';
}

interface EncartaCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gradient: string;
  image: string;
  description: string;
  subjects: EncartaSubject[];
}

const ENCARTA_CATEGORIES: EncartaCategory[] = [
  {
    id: 'ciencias',
    name: 'Ciencias Exactas y Naturales',
    emoji: '🔬',
    color: 'from-blue-500 to-cyan-600',
    gradient: 'from-blue-950 to-cyan-950',
    image: '/cards/ciencias-exactas.jpg',
    description: 'Matemáticas, Física, Química, Biología y Astronomía',
    subjects: [
      {
        id: 'matematicas', name: 'Matemáticas', topics: [
          { id: 'algebra', name: 'Álgebra Lineal', type: 'article', content: `# Álgebra Lineal\n\nEl **álgebra lineal** es una rama de las matemáticas que estudia vectores, espacios vectoriales, transformaciones lineales y sistemas de ecuaciones lineales.\n\n## Conceptos Fundamentales\n\n### Vectores\nUn vector es un objeto matemático con **magnitud** y **dirección**. Se representa como:\n\n$$\\vec{v} = (v_1, v_2, v_3)$$\n\n### Matrices\nUna matriz es un arreglo rectangular de números organizados en filas y columnas:\n\n$$A = \\begin{pmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{pmatrix}$$\n\n### Operaciones Básicas\n- **Suma de matrices:** Se suman elemento a elemento\n- **Multiplicación escalar:** Cada elemento se multiplica por el escalar\n- **Producto matricial:** Combina filas por columnas\n\n## Aplicaciones\nEl álgebra lineal es fundamental en:\n- Computación gráfica y renderizado 3D\n- Machine Learning e Inteligencia Artificial\n- Física cuántica\n- Economía y modelos financieros` },
          { id: 'calculo', name: 'Cálculo Diferencial', type: 'article', content: `# Cálculo Diferencial\n\nEl **cálculo diferencial** estudia la variación de las funciones y la noción de derivada.\n\n## Derivada\n\nLa derivada de una función f(x) representa la **tasa de cambio instantáneo**:\n\n$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$\n\n## Reglas de Derivación\n\n| Función | Derivada |\n|---------|----------|\n| xⁿ | n·xⁿ⁻¹ |\n| eˣ | eˣ |\n| ln(x) | 1/x |\n| sin(x) | cos(x) |\n| cos(x) | -sin(x) |\n\n## Aplicaciones\n- Optimización de funciones\n- Velocidad e aceleración en física\n- Crecimiento y decaimiento exponencial` },
        ]
      },
      {
        id: 'fisica', name: 'Física', topics: [
          { id: 'mecanica', name: 'Mecánica Clásica', type: 'article', content: `# Mecánica Clásica\n\nEstudia el movimiento de cuerpos macroscópicos bajo la acción de fuerzas.\n\n## Leyes de Newton\n\n**Primera Ley (Inercia):** Un cuerpo permanece en reposo o en movimiento rectilíneo uniforme a menos que una fuerza neta actúe sobre él.\n\n**Segunda Ley (Fuerza):** La fuerza neta sobre un cuerpo es igual al producto de su masa por su aceleración:\n$$F = ma$$\n\n**Tercera Ley (Acción-Reacción):** Por cada acción hay una reacción igual y opuesta.\n\n## Cinemática\n\nEcuaciones del movimiento uniformemente acelerado:\n- $v = v_0 + at$\n- $x = x_0 + v_0t + \\frac{1}{2}at^2$\n- $v^2 = v_0^2 + 2a(x-x_0)$` },
        ]
      },
    ],
  },
  {
    id: 'ingenieria',
    name: 'Ingeniería, Tecnología y Computación',
    emoji: '⚙️',
    color: 'from-slate-500 to-zinc-600',
    gradient: 'from-slate-950 to-zinc-950',
    image: '/cards/ingenieria.jpg',
    description: 'Programación, Redes, Electrónica y Sistemas',
    subjects: [
      {
        id: 'programacion', name: 'Programación', topics: [
          { id: 'algoritmos', name: 'Algoritmos y Estructuras de Datos', type: 'article', content: `# Algoritmos y Estructuras de Datos\n\nUn **algoritmo** es una secuencia finita de instrucciones bien definidas para resolver un problema.\n\n## Complejidad Algorítmica\n\nLa notación **Big-O** describe el comportamiento asintótico:\n\n| Complejidad | Nombre | Ejemplo |\n|-------------|--------|---------|\n| O(1) | Constante | Acceso a array |\n| O(log n) | Logarítmica | Búsqueda binaria |\n| O(n) | Lineal | Búsqueda lineal |\n| O(n²) | Cuadrática | Bubble Sort |\n\n## Estructuras de Datos\n\n\`\`\`python\n# Lista enlazada\nclass Nodo:\n    def __init__(self, dato):\n        self.dato = dato\n        self.siguiente = None\n\nclass ListaEnlazada:\n    def __init__(self):\n        self.cabeza = None\n    \n    def insertar(self, dato):\n        nuevo = Nodo(dato)\n        nuevo.siguiente = self.cabeza\n        self.cabeza = nuevo\n\`\`\`` },
        ]
      },
    ],
  },
  {
    id: 'salud',
    name: 'Ciencias de la Salud',
    emoji: '🏥',
    color: 'from-red-500 to-rose-600',
    gradient: 'from-red-950 to-rose-950',
    image: '/cards/salud.jpg',
    description: 'Medicina, Biología Humana, Nutrición y Psicología',
    subjects: [
      {
        id: 'anatomia', name: 'Anatomía Humana', topics: [
          { id: 'sistema-nervioso', name: 'Sistema Nervioso', type: 'article', content: `# Sistema Nervioso\n\nEl **sistema nervioso** coordina y controla todas las funciones del cuerpo.\n\n## División\n\n### Sistema Nervioso Central (SNC)\n- **Encéfalo:** Cerebro, cerebelo y tronco encefálico\n- **Médula espinal:** 31 pares de nervios espinales\n\n### Sistema Nervioso Periférico (SNP)\n- **Somático:** Controla músculos voluntarios\n- **Autónomo:** Regula funciones involuntarias\n  - Simpático: "Lucha o huida"\n  - Parasimpático: "Descanso y digestión"\n\n## La Neurona\n\nUnidad funcional básica del sistema nervioso:\n- **Soma:** Cuerpo celular con núcleo\n- **Dendritas:** Reciben señales\n- **Axón:** Transmite señales\n- **Sinapsis:** Unión entre neuronas\n\n## Neurotransmisores\n\n| Neurotransmisor | Función |\n|-----------------|----------|\n| Dopamina | Recompensa y placer |\n| Serotonina | Estado de ánimo |\n| Acetilcolina | Memoria y movimiento |\n| GABA | Inhibición neuronal |` },
        ]
      },
    ],
  },
  {
    id: 'sociales',
    name: 'Ciencias Sociales, Administración y Derecho',
    emoji: '⚖️',
    color: 'from-amber-500 to-yellow-600',
    gradient: 'from-amber-950 to-yellow-950',
    image: '/cards/sociales.jpg',
    description: 'Historia, Economía, Derecho y Administración',
    subjects: [
      {
        id: 'economia', name: 'Economía', topics: [
          { id: 'micro', name: 'Microeconomía', type: 'article', content: `# Microeconomía\n\nEstudia el comportamiento de agentes económicos individuales (consumidores, empresas).\n\n## Oferta y Demanda\n\n**Ley de la Demanda:** A mayor precio, menor cantidad demandada (ceteris paribus).\n\n**Ley de la Oferta:** A mayor precio, mayor cantidad ofrecida.\n\n## Elasticidad\n\n$$E_d = \\frac{\\%\\Delta Q_d}{\\%\\Delta P}$$\n\n- |Ed| > 1: Demanda elástica\n- |Ed| = 1: Demanda unitaria  \n- |Ed| < 1: Demanda inelástica\n\n## Estructuras de Mercado\n\n| Estructura | Empresas | Ejemplo |\n|------------|----------|---------|\n| Competencia perfecta | Muchas | Agricultura |\n| Oligopolio | Pocas | Telecomunicaciones |\n| Monopolio | Una | Servicios públicos |` },
        ]
      },
    ],
  },
  {
    id: 'artes',
    name: 'Artes y Humanidades',
    emoji: '🎭',
    color: 'from-violet-500 to-purple-600',
    gradient: 'from-violet-950 to-purple-950',
    image: '/cards/artes.jpg',
    description: 'Literatura, Filosofía, Música y Bellas Artes',
    subjects: [
      {
        id: 'filosofia', name: 'Filosofía', topics: [
          { id: 'epistemologia', name: 'Epistemología', type: 'article', content: `# Epistemología\n\nLa **epistemología** es la rama de la filosofía que estudia el conocimiento: su naturaleza, origen y límites.\n\n## Preguntas Fundamentales\n\n- ¿Qué es el conocimiento?\n- ¿Cómo llegamos a conocer?\n- ¿Cuáles son los límites del conocimiento?\n\n## Corrientes Principales\n\n### Racionalismo (Descartes, Leibniz, Spinoza)\nEl conocimiento se obtiene principalmente a través de la **razón**. Conocimiento innato.\n\n*"Cogito, ergo sum"* — Pienso, luego existo. (Descartes)\n\n### Empirismo (Locke, Hume, Berkeley)\nTodo conocimiento proviene de la **experiencia sensorial**. La mente es una "tabula rasa".\n\n### Criticismo (Kant)\nSíntesis: El conocimiento requiere tanto **razón** como **experiencia**. Las categorías del entendimiento organizan la experiencia.` },
        ]
      },
    ],
  },
  {
    id: 'educacion',
    name: 'Educación',
    emoji: '🎓',
    color: 'from-emerald-500 to-teal-600',
    gradient: 'from-emerald-950 to-teal-950',
    image: '/cards/educacion.jpg',
    description: 'Pedagogía, Didáctica y Ciencias de la Educación',
    subjects: [
      {
        id: 'pedagogia', name: 'Pedagogía', topics: [
          { id: 'teorias', name: 'Teorías del Aprendizaje', type: 'article', content: `# Teorías del Aprendizaje\n\nLas teorías del aprendizaje explican cómo los seres humanos adquieren conocimientos.\n\n## Conductismo (Watson, Skinner)\n\nEl aprendizaje es un cambio en la conducta producido por estímulos externos.\n\n- **Condicionamiento clásico** (Pavlov): Estímulo → Respuesta\n- **Condicionamiento operante** (Skinner): Refuerzo y castigo\n\n## Cognitivismo (Piaget, Ausubel)\n\nEl aprendizaje es un proceso mental activo de construcción de significados.\n\n### Etapas de Piaget:\n1. **Sensoriomotora** (0-2 años)\n2. **Preoperacional** (2-7 años)\n3. **Operaciones concretas** (7-11 años)\n4. **Operaciones formales** (11+ años)\n\n## Constructivismo (Vygotsky)\n\n**Zona de Desarrollo Próximo (ZDP):** Diferencia entre lo que el alumno puede hacer solo vs. con ayuda.\n\n## Conectivismo (Siemens)\n\nTeoría del aprendizaje para la **era digital**: el conocimiento reside en las redes y conexiones.` },
        ]
      },
    ],
  },
];

// ─── VISTAS ───────────────────────────────────────────────────────────────────

type EncartaView = 'home' | 'category' | 'subject' | 'topic';

interface BreadcrumbItem {
  label: string;
  view: EncartaView;
  categoryId?: string;
  subjectId?: string;
  topicId?: string;
}

export default function EncartaPanel() {
  const [view, setView] = useState<EncartaView>('home');
  const [history, setHistory] = useState<BreadcrumbItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EncartaCategory | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<EncartaSubject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<EncartaTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setHistoryIndex] = useState(-1);


  /**
   * Navega a una nueva vista guardando el historial de navegación.
   */
  const navigate = (nextView: EncartaView, item?: BreadcrumbItem) => {
    setHistoryIndex(prev => prev + 1);
    setView(nextView);
    if (item) {
      setHistory(prev => [...prev, item]);
    }
  };

  /** Retrocede en el historial de navegación interno */
  const goBack = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      newHistory.pop();
      setHistory(newHistory);
      const last = newHistory[newHistory.length - 1];
      if (!last) { setView('home'); return; }
      setView(last.view);
    } else {
      setView('home');
    }
  };

  /** Navega a la vista principal de Encarta */
  const goHome = () => {
    setView('home');
    setHistory([]);
    setSelectedCategory(null);
    setSelectedSubject(null);
    setSelectedTopic(null);
  };

  /**
   * Abre una categoría y navega a su vista.
   */
  const openCategory = (category: EncartaCategory) => {
    setSelectedCategory(category);
    navigate('category', { label: category.name, view: 'category' });
  };

  /**
   * Abre una materia dentro de la categoría seleccionada.
   */
  const openSubject = (subject: EncartaSubject) => {
    setSelectedSubject(subject);
    navigate('subject', { label: subject.name, view: 'subject' });
  };

  /**
   * Abre un tema/artículo específico.
   */
  const openTopic = (topic: EncartaTopic) => {
    setSelectedTopic(topic);
    navigate('topic', { label: topic.name, view: 'topic' });
  };

  /**
   * Renderiza el contenido markdown-like del artículo con formato básico.
   */
  const renderContent = (content: string) => {
    return content
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mb-4 mt-6">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-blue-300 mb-3 mt-5">$2</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-cyan-300 mb-2 mt-4">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-slate-300 italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-sm font-mono">$1</code>')
      .replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre class="bg-slate-900 border border-slate-700 rounded-xl p-4 my-4 overflow-x-auto text-sm font-mono text-green-300"><code>$2</code></pre>')
      .replace(/\$\$(.+?)\$\$/g, '<div class="my-3 p-3 bg-blue-950/50 border border-blue-800/30 rounded-xl text-center text-blue-200 font-mono text-sm">$1</div>')
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(Boolean).map(c => c.trim());
        const isHeader = history.length > 0;
        return `<div class="flex">${cells.map(c => `<div class="flex-1 px-3 py-2 border border-slate-700 text-slate-300 text-sm">${c}</div>`).join('')}</div>`;
      })
      .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 text-slate-300 text-sm mb-1"><span class="text-blue-400 mt-1">•</span><span>$1</span></li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="text-slate-300 text-sm mb-1 ml-4 list-decimal">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-slate-400 text-sm leading-relaxed mb-3">')
      .replace(/^(?![<\n])/gm, '<p class="text-slate-400 text-sm leading-relaxed mb-3">');
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">

      {/* Barra de Control Superior */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <button
          onClick={goBack}
          disabled={history.length === 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all opacity-30 cursor-not-allowed"
        >
          <ArrowRight size={16} />
        </button>
        <button
          onClick={goHome}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <Home size={16} />
        </button>

        {/* Separador */}
        <div className="h-5 w-px bg-slate-700" />

        {/* Buscador interno */}
        <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 max-w-md">
          <Search size={13} className="text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar en el repositorio..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-slate-500 ml-2">
          <span className="hover:text-white cursor-pointer" onClick={goHome}>Encarta</span>
          {history.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              <span>/</span>
              <span className={i === history.length - 1 ? 'text-blue-400' : 'hover:text-white cursor-pointer'}>
                {item.label.length > 20 ? item.label.slice(0, 20) + '...' : item.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* Vista: Home — Categorías */}
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-bold text-white mb-1">📖 Enciclopedia SRB</h1>
                  <p className="text-slate-400 text-sm">Selecciona un área del conocimiento para explorar</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ENCARTA_CATEGORIES.map(cat => (
                    <motion.div
                      key={cat.id}
                      onClick={() => openCategory(cat)}
                      className="relative rounded-2xl overflow-hidden cursor-pointer group border border-slate-700/50 hover:border-slate-600 transition-all"
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {/* Imagen de fondo */}
                      <div className="h-36 relative overflow-hidden">
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-br opacity-40" />
                        <div className="absolute top-3 left-3 text-3xl">{cat.emoji}</div>
                      </div>

                      {/* Info */}
                      <div className="p-4 bg-slate-900">
                        <h3 className="text-white font-bold text-sm mb-1 leading-tight">{cat.name}</h3>
                        <p className="text-slate-500 text-xs">{cat.description}</p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
                          <span>{cat.subjects.length} materia(s)</span>
                          <span>→</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Vista: Categoría — Materias */}
          {view === 'category' && selectedCategory && (
            <motion.div
              key="category"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl">{selectedCategory.emoji}</span>
                  <div>
                    <h1 className="text-xl font-bold text-white">{selectedCategory.name}</h1>
                    <p className="text-slate-400 text-sm">{selectedCategory.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCategory.subjects.map(subject => (
                    <motion.button
                      key={subject.id}
                      onClick={() => openSubject(subject)}
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-left transition-all group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedCategory.color} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-sm">
                          {subject.name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{subject.name}</p>
                        <p className="text-slate-500 text-xs">{subject.topics.length} tema(s)</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Vista: Materia — Temas */}
          {view === 'subject' && selectedSubject && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <div className="max-w-3xl mx-auto">
                <h1 className="text-xl font-bold text-white mb-2">{selectedSubject.name}</h1>
                <p className="text-slate-400 text-sm mb-6">{selectedSubject.topics.length} temas disponibles</p>
                <div className="space-y-2">
                  {selectedSubject.topics.map(topic => (
                    <motion.button
                      key={topic.id}
                      onClick={() => openTopic(topic)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-500/50 text-left transition-all"
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl">
                        {topic.type === 'article' ? '📝' : topic.type === 'video' ? '🎬' : '🔢'}
                      </span>
                      <div>
                        <p className="text-white font-medium text-sm">{topic.name}</p>
                        <p className="text-slate-500 text-xs capitalize">{topic.type}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Vista: Tema/Artículo */}
          {view === 'topic' && selectedTopic && (
            <motion.div
              key="topic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 max-w-3xl mx-auto"
            >
              <div
                className="prose-custom"
                dangerouslySetInnerHTML={{ __html: renderContent(selectedTopic.content) }}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
