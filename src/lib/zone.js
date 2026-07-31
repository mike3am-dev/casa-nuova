// Gli ambienti della casa: unica fonte per Casa & Design e Checklist.
// Devono coincidere con i nomi delle stanze (tabella rooms).
export const ZONE = [
  'Ingresso', 'Corridoio', 'Soggiorno', 'Cucina',
  'Camera padronale', 'Bagno padronale', 'Studio', 'Bagno ospiti',
  'Lavanderia', 'Patio', 'Giardino', 'Cantina', 'Box',
]

// Tag non legati a un ambiente specifico
export const ZONE_EXTRA = ['Tutta la casa', 'Planimetria']

export const TUTTI_I_TAG = [...ZONE, ...ZONE_EXTRA]

// Le zone di un elemento, sempre come array.
// Regge sia il nuovo formato (meta.zone: []) sia il vecchio (meta.zona: "A · B").
export function zoneDi(item) {
  const m = item?.meta ?? {}
  if (Array.isArray(m.zone)) return m.zone.filter(Boolean)
  if (typeof m.zona === 'string' && m.zona.trim()) {
    return m.zona.split(/[·,;]/).map(s => s.trim()).filter(Boolean)
  }
  return []
}

// L'elemento riguarda questo ambiente?
export function riguarda(item, nomeStanza) {
  const z = zoneDi(item)
  return z.includes(nomeStanza) || z.includes('Tutta la casa')
}
