export type WeightRange = { min: number; max: number }

const DOG_BREEDS: Record<string, WeightRange> = {
  // Pequeno porte
  'chihuahua':             { min: 1.5, max: 3   },
  'yorkshire-terrier':     { min: 2,   max: 3.5 },
  'yorkshire':             { min: 2,   max: 3.5 },
  'maltese':               { min: 2,   max: 4   },
  'maltes':                { min: 2,   max: 4   },
  'lulu-da-pomerania':     { min: 1.4, max: 3   },
  'spitz-alemao':          { min: 1.4, max: 3   },
  'spitz':                 { min: 1.4, max: 3   },
  'pinscher-miniatura':    { min: 4,   max: 5   },
  'pinscher':              { min: 4,   max: 5   },
  'bichon-frise':          { min: 3,   max: 5   },
  'bichon':                { min: 3,   max: 5   },
  'shih-tzu':              { min: 4,   max: 7   },
  'pug':                   { min: 6,   max: 8   },
  'jack-russell-terrier':  { min: 6,   max: 8   },
  'jack-russell':          { min: 6,   max: 8   },
  'fox-terrier':           { min: 7,   max: 9   },
  'cavalier-king-charles': { min: 5,   max: 8   },
  'coton-de-tulear':       { min: 4,   max: 6   },
  'poodle-toy':            { min: 2,   max: 4   },
  'lhasa-apso':            { min: 5,   max: 8   },
  'lhasa':                 { min: 5,   max: 8   },
  'shiba-inu':             { min: 7,   max: 11  },
  'shiba':                 { min: 7,   max: 11  },
  'papillon':              { min: 3,   max: 5   },
  'pekingese':             { min: 3,   max: 6   },
  'pequines':              { min: 3,   max: 6   },
  // Médio porte
  'poodle-miniatura':      { min: 12,  max: 17  },
  'poodle-medio':          { min: 12,  max: 17  },
  'schnauzer-miniatura':   { min: 5,   max: 9   },
  'schnauzer':             { min: 5,   max: 9   },
  'cocker-spaniel':        { min: 12,  max: 15  },
  'cocker':                { min: 12,  max: 15  },
  'beagle':                { min: 10,  max: 14  },
  'dachshund':             { min: 7,   max: 15  },
  'basset-hound':          { min: 20,  max: 30  },
  'basset':                { min: 20,  max: 30  },
  'shetland-sheepdog':     { min: 6,   max: 8   },
  'sheltie':               { min: 6,   max: 8   },
  'australian-shepherd':   { min: 18,  max: 30  },
  'border-collie':         { min: 14,  max: 20  },
  'vizsla':                { min: 20,  max: 30  },
  'braco-alemao':          { min: 20,  max: 32  },
  'pointer':               { min: 20,  max: 30  },
  'basenji':               { min: 9,   max: 11  },
  'bulldog-frances':       { min: 8,   max: 14  },
  'frances':               { min: 8,   max: 14  },
  'whippet':               { min: 12,  max: 14  },
  'english-setter':        { min: 25,  max: 36  },
  // Grande porte
  'labrador-retriever':    { min: 25,  max: 36  },
  'labrador':              { min: 25,  max: 36  },
  'golden-retriever':      { min: 25,  max: 34  },
  'golden':                { min: 25,  max: 34  },
  'poodle-padrao':         { min: 20,  max: 30  },
  'poodle-grande':         { min: 20,  max: 30  },
  'poodle':                { min: 20,  max: 30  },
  'bulldog-ingles':        { min: 18,  max: 25  },
  'bulldog':               { min: 18,  max: 25  },
  'pastor-alemao':         { min: 22,  max: 40  },
  'pastor':                { min: 22,  max: 40  },
  'husky-siberiano':       { min: 16,  max: 27  },
  'husky':                 { min: 16,  max: 27  },
  'boxer':                 { min: 25,  max: 32  },
  'weimaraner':            { min: 25,  max: 40  },
  'dalmata':               { min: 20,  max: 32  },
  'dalmatian':             { min: 20,  max: 32  },
  'pitbull':               { min: 14,  max: 27  },
  'american-pit-bull':     { min: 14,  max: 27  },
  'staffordshire':         { min: 11,  max: 17  },
  'doberman':              { min: 32,  max: 45  },
  'chow-chow':             { min: 20,  max: 32  },
  'shar-pei':              { min: 18,  max: 30  },
  'akita':                 { min: 25,  max: 45  },
  'samoieda':              { min: 16,  max: 30  },
  'samoyed':               { min: 16,  max: 30  },
  'irish-setter':          { min: 25,  max: 32  },
  'setter':                { min: 25,  max: 32  },
  'dalmata':               { min: 20,  max: 32  },
  'fila-brasileiro':       { min: 40,  max: 50  },
  'fila':                  { min: 40,  max: 50  },
  'chow':                  { min: 20,  max: 32  },
  // Gigante
  'rottweiler':            { min: 35,  max: 60  },
  'bernese-mountain-dog':  { min: 38,  max: 50  },
  'bernes':                { min: 38,  max: 50  },
  'malamute':              { min: 34,  max: 43  },
  'sao-bernardo':          { min: 64,  max: 90  },
  'newfoundland':          { min: 45,  max: 70  },
  'terra-nova':            { min: 45,  max: 70  },
  'great-dane':            { min: 50,  max: 82  },
  'dogue-alemao':          { min: 50,  max: 82  },
}

const CAT_BREEDS: Record<string, WeightRange> = {
  'srd':               { min: 3,   max: 5   },
  'vira-lata':         { min: 3,   max: 5   },
  'persa':             { min: 3,   max: 5   },
  'persian':           { min: 3,   max: 5   },
  'siames':            { min: 3,   max: 5   },
  'siamese':           { min: 3,   max: 5   },
  'maine-coon':        { min: 5,   max: 9   },
  'ragdoll':           { min: 4,   max: 8   },
  'bengal':            { min: 4,   max: 7   },
  'bengali':           { min: 4,   max: 7   },
  'british-shorthair': { min: 4,   max: 8   },
  'british':           { min: 4,   max: 8   },
  'sphynx':            { min: 3,   max: 5   },
  'scottish-fold':     { min: 3,   max: 5   },
  'scottish':          { min: 3,   max: 5   },
  'angora':            { min: 3,   max: 5   },
  'abissinio':         { min: 3,   max: 5   },
  'birman':            { min: 4,   max: 6   },
  'burmese':           { min: 4,   max: 6   },
  'russo-azul':        { min: 3,   max: 5   },
  'noruegues':         { min: 4,   max: 7   },
  'norwegian':         { min: 4,   max: 7   },
  'savannah':          { min: 5,   max: 11  },
  'devon-rex':         { min: 3,   max: 4.5 },
  'cornish-rex':       { min: 3,   max: 4.5 },
}

const SPECIES_DEFAULTS: Record<string, WeightRange> = {
  cat:     { min: 3,   max: 5   },
  rabbit:  { min: 1.5, max: 2.5 },
  hamster: { min: 0.08,max: 0.2 },
  bird:    { min: 0.05,max: 0.5 },
  fish:    { min: 0.05,max: 1   },
}

function normalizeBreed(breed: string): string {
  return breed
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function findInDict(normalized: string, dict: Record<string, WeightRange>): WeightRange | null {
  if (dict[normalized]) return dict[normalized]
  for (const [key, val] of Object.entries(dict)) {
    if (normalized.includes(key) || key.includes(normalized)) return val
  }
  return null
}

function ageFactor(ageMonths: number): number {
  if (ageMonths >= 18) return 1.0
  if (ageMonths >= 12) return 0.95
  if (ageMonths >= 9)  return 0.85
  if (ageMonths >= 6)  return 0.70
  if (ageMonths >= 3)  return 0.50
  return 0.30
}

export interface IdealWeightResult {
  min: number
  max: number
  ideal: number
  isAdult: boolean
  source: 'breed' | 'species'
}

export function getIdealWeight(
  species: string,
  breed: string | null | undefined,
  ageMonths: number | null | undefined,
): IdealWeightResult | null {
  let range: WeightRange | null = null
  let source: 'breed' | 'species' = 'species'

  if (breed?.trim()) {
    const key = normalizeBreed(breed.trim())
    if (species === 'dog') range = findInDict(key, DOG_BREEDS)
    else if (species === 'cat') range = findInDict(key, CAT_BREEDS)
    if (range) source = 'breed'
  }

  if (!range) {
    range = SPECIES_DEFAULTS[species] ?? null
  }

  if (!range) return null

  const months = ageMonths ?? 24
  const isAdult = months >= 12
  const f = ageFactor(months)

  const min   = parseFloat((range.min * f).toFixed(1))
  const max   = parseFloat((range.max * f).toFixed(1))
  const ideal = parseFloat(((min + max) / 2).toFixed(1))

  return { min, max, ideal, isAdult, source }
}
