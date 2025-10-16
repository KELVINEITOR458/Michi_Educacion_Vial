export interface Question {
  id: string;
  q: string;
  options: string[];
  answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  image?: string;
}

const questions: Question[] = [
  // Fácil (5)
  { id: 'l3-e1', q: '¿Qué debes hacer antes de cruzar una calle?', options: ['Mirar a ambos lados', 'Correr', 'Cerrar los ojos', 'Saltar'], answer: 0, difficulty: 'easy', image: 'paso-peatones-nivel2.png' },
  { id: 'l3-e2', q: '¿Cuál luz del semáforo indica que puedes cruzar?', options: ['Rojo', 'Amarillo', 'Verde peatonal', 'Azul'], answer: 2, difficulty: 'easy', image: 'semaforo-verde-peaton.png' },
  { id: 'l3-e3', q: '¿Dónde deben caminar los peatones?', options: ['En la vereda', 'En la pista', 'En la berma central', 'Entre autos'], answer: 0, difficulty: 'easy' },
  { id: 'l3-e4', q: '¿Qué significa la señal PARE?', options: ['Avanzar', 'Detenerse', 'Velocidad máxima', 'Prohibido girar'], answer: 1, difficulty: 'easy', image: 'senal-pare.png' },
  { id: 'l3-e5', q: '¿Qué NO debes hacer al cruzar?', options: ['Usar celular', 'Mirar a ambos lados', 'Cruzar por el cruce', 'Esperar el verde'], answer: 0, difficulty: 'easy' },
  // Medio (5)
  { id: 'l3-m1', q: 'Si un auto sale en retroceso, ¿qué haces?', options: ['Pasar corriendo', 'Esperar y hacer contacto visual', 'Golpear el auto', 'Ignorar'], answer: 1, difficulty: 'medium', image: 'mirar-atras-auto.png' },
  { id: 'l3-m2', q: '¿Qué significa línea amarilla continua?', options: ['Se puede adelantar', 'No se puede adelantar', 'Zona escolar', 'Fin de vía'], answer: 1, difficulty: 'medium', image: 'linea-amarilla-continua.png' },
  { id: 'l3-m3', q: '¿Qué hacer ante una rotonda?', options: ['Entrar sin mirar', 'Ceder el paso al que ya circula', 'Detenerse siempre', 'Acelerar'], answer: 1, difficulty: 'medium', image: 'rotonda.png' },
  { id: 'l3-m4', q: 'En zona escolar, debes…', options: ['Acelerar', 'Usar claxon', 'Reducir velocidad', 'Girar sin señalizar'], answer: 2, difficulty: 'medium' },
  { id: 'l3-m5', q: '¿Qué indica “Prohibido girar a la izquierda”?', options: ['Puedes girar a cualquier lado', 'No girar a la izquierda', 'No estacionar', 'Ceda el paso'], answer: 1, difficulty: 'medium', image: 'senal-prohibido-girar.png' },
  // Difícil (5)
  { id: 'l3-h1', q: 'Velocidad máx. típica en zona urbana (km/h):', options: ['30', '50', '80', '100'], answer: 1, difficulty: 'hard', image: 'velocidad-urbana.png' },
  { id: 'l3-h2', q: '¿Qué hacer si no hay cruce peatonal cercano?', options: ['Cruzar en diagonal', 'Cruzar recto y en línea recta tras mirar', 'Correr entre autos', 'Pedir que te lleven'], answer: 1, difficulty: 'hard' },
  { id: 'l3-h3', q: 'Si un semáforo falla, ¿a quién haces caso?', options: ['A nadie', 'A los autos', 'A la autoridad de tránsito', 'A los peatones'], answer: 2, difficulty: 'hard' },
  { id: 'l3-h4', q: '¿Qué significa luz ámbar intermitente?', options: ['Detenerse siempre', 'Precaución, avanzar con cuidado', 'Paso cerrado', 'Vía exclusiva'], answer: 1, difficulty: 'hard' },
  { id: 'l3-h5', q: '¿Qué hacer si llueve fuerte?', options: ['Correr', 'Usar paraguas y mirar firmemente el entorno', 'Evitar veredas', 'Usar audífonos'], answer: 1, difficulty: 'hard' },
];

export default questions;


