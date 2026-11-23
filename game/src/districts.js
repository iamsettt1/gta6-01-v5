// Puerto Brisa — Storm Surge: the eight districts and their art direction.
//
// Each district owns a rectangle of the world, a roof palette, a ground tone
// and a set of street-sign names. city-map.js builds the streets inside
// these rectangles; the renderer and the map screen read the same table, so
// the city the player drives is the city the map shows.

export function districtPalette(name) {
  for (const d of DISTRICTS) if (d.name === name) return d;
  return DISTRICTS[0];
}

export const DISTRICTS = [
  {
    name: 'El Mirador',
    rect: { x: 240, y: 240, w: 1420, h: 1060 },
    ground: '#cbb98a',
    road: '#5a5148',
    roofs: ['#b6543a', '#c96f43', '#a8482f', '#d08355', '#9c4a34'],
    accent: '#e8b34b',
    signs: ['Plaza del Faro', 'Calle Alba', 'Mirador Alto', 'Los Arcos'],
    blurb: 'Old town on the hill: tiled roofs, plazas, arcades.',
  },
  {
    name: 'Avenida Coral',
    rect: { x: 1760, y: 240, w: 1560, h: 1060 },
    ground: '#b9b3a4',
    road: '#4c4c52',
    roofs: ['#7d8aa0', '#93a3b8', '#6d7f99', '#a8b6c6', '#8795a8'],
    accent: '#ff7a59',
    signs: ['Av. Coral', 'Torre Brisa', 'Gran Vía del Sol', 'Paseo Central'],
    blurb: 'Downtown towers and wide avenues.',
  },
  {
    name: 'Puerto Brisa Marina',
    rect: { x: 240, y: 1420, w: 1760, h: 1180 },
    ground: '#a89a7c',
    road: '#55504a',
    roofs: ['#8a6f4d', '#74604a', '#9c8461', '#665741', '#86755a'],
    accent: '#37b6ff',
    signs: ['Muelle Uno', 'Astillería Brisa', 'Mercado del Puerto', 'Rampa de Hidroavión'],
    blurb: 'Harbour, cranes, containers, docks and the seaplane ramp.',
  },
  {
    name: 'Barrio Iris',
    rect: { x: 2100, y: 1420, w: 1420, h: 1180 },
    ground: '#8f8fa3',
    road: '#3f3f4d',
    roofs: ['#5d4a72', '#6e557f', '#4d3f66', '#7d6390', '#59496e'],
    accent: '#ff4fd8',
    signs: ['Club Iris', 'Neón y Sal', 'La Última Copa', 'Calle del Eco'],
    blurb: 'Nightlife: neon signs, clubs, wet streets.',
  },
  {
    name: 'Playa Brisa',
    rect: { x: 3620, y: 1420, w: 1420, h: 1180 },
    ground: '#e3cf9e',
    road: '#6b6257',
    roofs: ['#d99a5b', '#e5b06e', '#cf8a4e', '#ecc088', '#dca763'],
    accent: '#ffb03a',
    signs: ['Paseo de la Playa', 'Hotel Brisa Azul', 'Chiringuito Sol', 'Palmas Altas'],
    blurb: 'Beachfront promenade, palms, sand, sea.',
  },
  {
    name: 'Las Lomas',
    rect: { x: 3620, y: 240, w: 1420, h: 1060 },
    ground: '#a9bd8a',
    road: '#5d5a4e',
    roofs: ['#a05a44', '#b06a4e', '#93523e', '#bb7857', '#9d5c46'],
    accent: '#7ec850',
    signs: ['Camino de las Lomas', 'Villa Serena', 'Los Pinos', 'Mirador Verde'],
    blurb: 'Leafy hills suburb, winding roads.',
  },
  {
    name: 'Zona Libre',
    rect: { x: 5140, y: 240, w: 1420, h: 1360 },
    ground: '#b0a58e',
    road: '#52504b',
    roofs: ['#7a7f72', '#8b9082', '#6b7063', '#979c8d', '#757a6c'],
    accent: '#ffd23e',
    signs: ['Pista Brisa', 'Almacén 9', 'Garaje de Exportación', 'Muelle de Hidroaviones'],
    blurb: 'Warehouses, the export garage, the airstrip and the seaplane dock.',
  },
  {
    name: 'Isla Ancla',
    rect: { x: 5140, y: 1900, w: 1420, h: 1180 },
    ground: '#c2b280',
    road: '#5a5348',
    roofs: ['#b6543a', '#c07a4a', '#a85f3d', '#cd8a58', '#9c5638'],
    accent: '#37e0c8',
    signs: ['Faro de Ancla', 'Cala del Contrabando', 'Puente Largo', 'La Ancla'],
    blurb: 'An island: lighthouse, smugglers cove, two bridges home.',
  },
];

// Which district holds this point? Falls back to open water / outskirts.
export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    const r = d.rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return d;
  }
  return null;
}

export function districtNameAt(x, y) {
  const d = districtAt(x, y);
  return d ? d.name : 'Aguas de Brisa';
}
