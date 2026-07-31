// Entro quale fase di cantiere va decisa una voce.
// L'ordine è quello reale del cantiere: ciò che viene prima è più urgente.
export const FASI = {
  muri:     { label: 'prima delle tramezze',  breve: 'muri',     spiega: 'posizione di pareti, nicchie, porte' },
  impianti: { label: 'prima degli impianti',  breve: 'impianti', spiega: 'tracce elettriche, scarichi, adduzioni' },
  massetti: { label: 'prima dei massetti',    breve: 'massetti', spiega: 'radiante, quote di pavimento' },
  finiture: { label: 'prima delle finiture',  breve: 'finiture', spiega: 'gres, sanitari, serramenti' },
  arredo:   { label: 'dopo la consegna',      breve: 'arredo',   spiega: 'mobili e complementi' },
}
export const ORDINE_FASI = ['muri', 'impianti', 'massetti', 'finiture', 'arredo']
