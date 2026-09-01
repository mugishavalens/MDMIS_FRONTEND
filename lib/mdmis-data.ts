// MDMIS — Mineral Detection & Mining Intelligence System
// Mock domain data for a Rwanda-based mining intelligence platform.
// All figures are illustrative for demonstration.

export type Mineral = 'Cassiterite' | 'Coltan' | 'Wolframite' | 'Gold' | 'Beryl' | 'Lithium'

export const MINERAL_META: Record<
  Mineral,
  { label: string; symbol: string; commodity: string; color: string }
> = {
  Cassiterite: { label: 'Cassiterite', symbol: 'SnO₂', commodity: 'Tin', color: 'var(--chart-1)' },
  Coltan: { label: 'Coltan', symbol: '(Fe,Mn)Ta₂O₆', commodity: 'Tantalum', color: 'var(--chart-2)' },
  Wolframite: { label: 'Wolframite', symbol: '(Fe,Mn)WO₄', commodity: 'Tungsten', color: 'var(--chart-3)' },
  Gold: { label: 'Gold', symbol: 'Au', commodity: 'Gold', color: 'var(--chart-1)' },
  Beryl: { label: 'Beryl', symbol: 'Be₃Al₂Si₆O₁₈', commodity: 'Beryllium', color: 'var(--chart-5)' },
  Lithium: { label: 'Lithium', symbol: 'LiAlSi₂O₆', commodity: 'Lithium', color: 'var(--chart-4)' },
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface DetectionSite {
  id: string
  name: string
  district: string
  lat: number
  lng: number
  primaryMineral: Mineral
  secondaryMinerals: Mineral[]
  gradePct: number // ore grade %
  confidence: number // AI confidence %
  estimatedTonnage: number
  safetyScore: number // 0-100, higher is safer
  riskLevel: RiskLevel
  status: 'active' | 'surveying' | 'flagged' | 'depleted'
  lastScan: string
  depthMeters: number
}

export const SITES: DetectionSite[] = [
  {
    id: 'RW-RTG-01', name: 'Rutongo Tin Belt', district: 'Rulindo', lat: -1.7783, lng: 30.0611,
    primaryMineral: 'Cassiterite', secondaryMinerals: ['Wolframite'], gradePct: 1.8, confidence: 96.4,
    estimatedTonnage: 42500, safetyScore: 82, riskLevel: 'low', status: 'active', lastScan: '2026-06-08T09:12:00Z', depthMeters: 48,
  },
  {
    id: 'RW-GTB-02', name: 'Gatumba Coltan Field', district: 'Ngororero', lat: -1.8642, lng: 29.5231,
    primaryMineral: 'Coltan', secondaryMinerals: ['Beryl', 'Cassiterite'], gradePct: 0.42, confidence: 93.1,
    estimatedTonnage: 12800, safetyScore: 61, riskLevel: 'moderate', status: 'active', lastScan: '2026-06-08T07:44:00Z', depthMeters: 32,
  },
  {
    id: 'RW-NYK-03', name: 'Nyakabingo Mine', district: 'Rulindo', lat: -1.7419, lng: 30.0089,
    primaryMineral: 'Wolframite', secondaryMinerals: [], gradePct: 1.1, confidence: 97.8,
    estimatedTonnage: 30100, safetyScore: 88, riskLevel: 'low', status: 'active', lastScan: '2026-06-07T16:20:00Z', depthMeters: 65,
  },
  {
    id: 'RW-GFW-04', name: 'Gifurwe Tungsten', district: 'Rutsiro', lat: -1.9928, lng: 29.4102,
    primaryMineral: 'Wolframite', secondaryMinerals: ['Cassiterite'], gradePct: 0.95, confidence: 91.5,
    estimatedTonnage: 18900, safetyScore: 44, riskLevel: 'high', status: 'flagged', lastScan: '2026-06-08T05:03:00Z', depthMeters: 27,
  },
  {
    id: 'RW-RWK-05', name: 'Rwinkwavu Prospect', district: 'Kayonza', lat: -2.1481, lng: 30.5892,
    primaryMineral: 'Gold', secondaryMinerals: [], gradePct: 4.2, confidence: 88.7,
    estimatedTonnage: 3400, safetyScore: 73, riskLevel: 'moderate', status: 'surveying', lastScan: '2026-06-08T10:31:00Z', depthMeters: 12,
  },
  {
    id: 'RW-NMB-06', name: 'Nemba Coltan', district: 'Gakenke', lat: -1.6892, lng: 29.7743,
    primaryMineral: 'Coltan', secondaryMinerals: ['Cassiterite'], gradePct: 0.51, confidence: 94.9,
    estimatedTonnage: 9600, safetyScore: 79, riskLevel: 'low', status: 'active', lastScan: '2026-06-07T14:55:00Z', depthMeters: 40,
  },
  {
    id: 'RW-BGR-07', name: 'Bugarama Ridge', district: 'Rusizi', lat: -2.6889, lng: 29.0031,
    primaryMineral: 'Lithium', secondaryMinerals: ['Beryl'], gradePct: 1.35, confidence: 85.2,
    estimatedTonnage: 7200, safetyScore: 58, riskLevel: 'moderate', status: 'surveying', lastScan: '2026-06-08T08:17:00Z', depthMeters: 22,
  },
  {
    id: 'RW-MSH-08', name: 'Musha Cassiterite', district: 'Rwamagana', lat: -1.9231, lng: 30.3402,
    primaryMineral: 'Cassiterite', secondaryMinerals: ['Coltan'], gradePct: 1.62, confidence: 95.6,
    estimatedTonnage: 21500, safetyScore: 34, riskLevel: 'critical', status: 'flagged', lastScan: '2026-06-08T11:02:00Z', depthMeters: 55,
  },
  {
    id: 'RW-KRG-09', name: 'Karongi Beryl Zone', district: 'Karongi', lat: -2.0031, lng: 29.3781,
    primaryMineral: 'Beryl', secondaryMinerals: ['Lithium'], gradePct: 0.88, confidence: 82.3,
    estimatedTonnage: 5100, safetyScore: 76, riskLevel: 'low', status: 'active', lastScan: '2026-06-06T13:40:00Z', depthMeters: 18,
  },
  {
    id: 'RW-RTS-10', name: 'Rutsiro Gold Belt', district: 'Rutsiro', lat: -1.9312, lng: 29.3312,
    primaryMineral: 'Gold', secondaryMinerals: ['Wolframite'], gradePct: 3.6, confidence: 90.1,
    estimatedTonnage: 2800, safetyScore: 67, riskLevel: 'moderate', status: 'active', lastScan: '2026-06-08T06:28:00Z', depthMeters: 15,
  },
]

export const RISK_META: Record<RiskLevel, { label: string; token: string }> = {
  low: { label: 'Low', token: 'var(--success)' },
  moderate: { label: 'Moderate', token: 'var(--primary)' },
  high: { label: 'High', token: 'oklch(0.72 0.16 55)' },
  critical: { label: 'Critical', token: 'var(--destructive)' },
}

// ---- Scans + AI classification -------------------------------------------

export type ScanMethod = 'Drone Hyperspectral' | 'Ground Penetrating Radar' | 'Electromagnetic' | 'Satellite Multispectral'

export interface Scan {
  id: string
  siteId: string
  siteName: string
  method: ScanMethod
  capturedAt: string
  operator: string
  classification: Mineral
  confidence: number
  gradePct: number
  status: 'classified' | 'processing' | 'review'
  alternatives: { mineral: Mineral; probability: number }[]
  spectralBands: number
  areaHa: number
}

export const SCANS: Scan[] = [
  {
    id: 'SCN-24810', siteId: 'RW-MSH-08', siteName: 'Musha Cassiterite', method: 'Drone Hyperspectral',
    capturedAt: '2026-06-08T11:02:00Z', operator: 'A. Uwase', classification: 'Cassiterite', confidence: 95.6,
    gradePct: 1.62, status: 'review', spectralBands: 272, areaHa: 14.2,
    alternatives: [{ mineral: 'Cassiterite', probability: 95.6 }, { mineral: 'Coltan', probability: 3.1 }, { mineral: 'Wolframite', probability: 1.3 }],
  },
  {
    id: 'SCN-24809', siteId: 'RW-RWK-05', siteName: 'Rwinkwavu Prospect', method: 'Ground Penetrating Radar',
    capturedAt: '2026-06-08T10:31:00Z', operator: 'J. Habimana', classification: 'Gold', confidence: 88.7,
    gradePct: 4.2, status: 'classified', spectralBands: 0, areaHa: 6.8,
    alternatives: [{ mineral: 'Gold', probability: 88.7 }, { mineral: 'Wolframite', probability: 7.9 }, { mineral: 'Beryl', probability: 3.4 }],
  },
  {
    id: 'SCN-24808', siteId: 'RW-RTG-01', siteName: 'Rutongo Tin Belt', method: 'Drone Hyperspectral',
    capturedAt: '2026-06-08T09:12:00Z', operator: 'A. Uwase', classification: 'Cassiterite', confidence: 96.4,
    gradePct: 1.8, status: 'classified', spectralBands: 272, areaHa: 22.5,
    alternatives: [{ mineral: 'Cassiterite', probability: 96.4 }, { mineral: 'Wolframite', probability: 2.6 }, { mineral: 'Coltan', probability: 1.0 }],
  },
  {
    id: 'SCN-24807', siteId: 'RW-BGR-07', siteName: 'Bugarama Ridge', method: 'Satellite Multispectral',
    capturedAt: '2026-06-08T08:17:00Z', operator: 'System (auto)', classification: 'Lithium', confidence: 85.2,
    gradePct: 1.35, status: 'processing', spectralBands: 13, areaHa: 41.0,
    alternatives: [{ mineral: 'Lithium', probability: 85.2 }, { mineral: 'Beryl', probability: 11.5 }, { mineral: 'Cassiterite', probability: 3.3 }],
  },
  {
    id: 'SCN-24806', siteId: 'RW-GTB-02', siteName: 'Gatumba Coltan Field', method: 'Drone Hyperspectral',
    capturedAt: '2026-06-08T07:44:00Z', operator: 'C. Mukamana', classification: 'Coltan', confidence: 93.1,
    gradePct: 0.42, status: 'classified', spectralBands: 272, areaHa: 9.1,
    alternatives: [{ mineral: 'Coltan', probability: 93.1 }, { mineral: 'Cassiterite', probability: 4.8 }, { mineral: 'Beryl', probability: 2.1 }],
  },
  {
    id: 'SCN-24805', siteId: 'RW-GFW-04', siteName: 'Gifurwe Tungsten', method: 'Electromagnetic',
    capturedAt: '2026-06-08T05:03:00Z', operator: 'System (auto)', classification: 'Wolframite', confidence: 91.5,
    gradePct: 0.95, status: 'review', spectralBands: 0, areaHa: 5.4,
    alternatives: [{ mineral: 'Wolframite', probability: 91.5 }, { mineral: 'Cassiterite', probability: 6.0 }, { mineral: 'Gold', probability: 2.5 }],
  },
  {
    id: 'SCN-24804', siteId: 'RW-NYK-03', siteName: 'Nyakabingo Mine', method: 'Ground Penetrating Radar',
    capturedAt: '2026-06-07T16:20:00Z', operator: 'J. Habimana', classification: 'Wolframite', confidence: 97.8,
    gradePct: 1.1, status: 'classified', spectralBands: 0, areaHa: 11.7,
    alternatives: [{ mineral: 'Wolframite', probability: 97.8 }, { mineral: 'Cassiterite', probability: 1.5 }, { mineral: 'Gold', probability: 0.7 }],
  },
  {
    id: 'SCN-24803', siteId: 'RW-NMB-06', siteName: 'Nemba Coltan', method: 'Drone Hyperspectral',
    capturedAt: '2026-06-07T14:55:00Z', operator: 'C. Mukamana', classification: 'Coltan', confidence: 94.9,
    gradePct: 0.51, status: 'classified', spectralBands: 272, areaHa: 8.3,
    alternatives: [{ mineral: 'Coltan', probability: 94.9 }, { mineral: 'Cassiterite', probability: 3.6 }, { mineral: 'Beryl', probability: 1.5 }],
  },
]

// ---- Traceability / chain of custody -------------------------------------

export type CustodyStage = 'Detected' | 'Extracted' | 'Tagged' | 'Transported' | 'Warehoused' | 'Exported'

export interface TraceEvent {
  stage: CustodyStage
  timestamp: string
  actor: string
  location: string
  hash: string
}

export interface Lot {
  id: string
  tagId: string
  mineral: Mineral
  siteId: string
  siteName: string
  weightKg: number
  gradePct: number
  currentStage: CustodyStage
  compliant: boolean
  events: TraceEvent[]
}

export const LOTS: Lot[] = [
  {
    id: 'LOT-88213', tagId: 'RW-TAG-0088213', mineral: 'Cassiterite', siteId: 'RW-RTG-01', siteName: 'Rutongo Tin Belt',
    weightKg: 1250, gradePct: 1.8, currentStage: 'Exported', compliant: true,
    events: [
      { stage: 'Detected', timestamp: '2026-05-20T08:00:00Z', actor: 'MDMIS Drone Unit 3', location: 'Rutongo, Rulindo', hash: '0x9f2a…c41d' },
      { stage: 'Extracted', timestamp: '2026-05-24T11:30:00Z', actor: 'Rutongo Mining Co.', location: 'Rutongo, Rulindo', hash: '0x71b8…e902' },
      { stage: 'Tagged', timestamp: '2026-05-24T15:10:00Z', actor: 'RMB Agent · K. Niyonzima', location: 'Rutongo, Rulindo', hash: '0x33cd…a7f0' },
      { stage: 'Transported', timestamp: '2026-05-26T06:45:00Z', actor: 'Convoy TRK-204', location: 'Rulindo → Kigali', hash: '0x0ab1…9d22' },
      { stage: 'Warehoused', timestamp: '2026-05-26T13:20:00Z', actor: 'Kigali Logistics Hub', location: 'Kigali', hash: '0xf4e7…1c88' },
      { stage: 'Exported', timestamp: '2026-06-02T09:00:00Z', actor: 'Gasabo Smelting Ltd', location: 'Port of Mombasa (transit)', hash: '0x8c90…b3aa' },
    ],
  },
  {
    id: 'LOT-88401', tagId: 'RW-TAG-0088401', mineral: 'Coltan', siteId: 'RW-NMB-06', siteName: 'Nemba Coltan',
    weightKg: 640, gradePct: 0.51, currentStage: 'Warehoused', compliant: true,
    events: [
      { stage: 'Detected', timestamp: '2026-06-01T09:20:00Z', actor: 'MDMIS Drone Unit 1', location: 'Nemba, Gakenke', hash: '0x21aa…4410' },
      { stage: 'Extracted', timestamp: '2026-06-03T10:00:00Z', actor: 'Nemba Coop', location: 'Nemba, Gakenke', hash: '0x77dd…8821' },
      { stage: 'Tagged', timestamp: '2026-06-03T14:00:00Z', actor: 'RMB Agent · P. Ingabire', location: 'Nemba, Gakenke', hash: '0x9b0f…22ce' },
      { stage: 'Transported', timestamp: '2026-06-05T07:15:00Z', actor: 'Convoy TRK-118', location: 'Gakenke → Kigali', hash: '0xa4c2…77e1' },
      { stage: 'Warehoused', timestamp: '2026-06-05T16:40:00Z', actor: 'Kigali Logistics Hub', location: 'Kigali', hash: '0xcd31…04b9' },
    ],
  },
  {
    id: 'LOT-88555', tagId: 'RW-TAG-0088555', mineral: 'Wolframite', siteId: 'RW-GFW-04', siteName: 'Gifurwe Tungsten',
    weightKg: 980, gradePct: 0.95, currentStage: 'Tagged', compliant: false,
    events: [
      { stage: 'Detected', timestamp: '2026-06-04T05:03:00Z', actor: 'MDMIS EM Sensor Array', location: 'Gifurwe, Rutsiro', hash: '0x50ee…3312' },
      { stage: 'Extracted', timestamp: '2026-06-06T09:45:00Z', actor: 'Unregistered operator', location: 'Gifurwe, Rutsiro', hash: '0x1290…ffca' },
      { stage: 'Tagged', timestamp: '2026-06-06T12:00:00Z', actor: 'RMB Agent · (disputed)', location: 'Gifurwe, Rutsiro', hash: '0x0000…flag' },
    ],
  },
  {
    id: 'LOT-88610', tagId: 'RW-TAG-0088610', mineral: 'Gold', siteId: 'RW-RTS-10', siteName: 'Rutsiro Gold Belt',
    weightKg: 42, gradePct: 3.6, currentStage: 'Transported', compliant: true,
    events: [
      { stage: 'Detected', timestamp: '2026-06-02T06:28:00Z', actor: 'MDMIS Drone Unit 2', location: 'Rutsiro', hash: '0x66aa…9021' },
      { stage: 'Extracted', timestamp: '2026-06-05T08:00:00Z', actor: 'Rutsiro Gold Coop', location: 'Rutsiro', hash: '0x8f1c…2b34' },
      { stage: 'Tagged', timestamp: '2026-06-05T11:20:00Z', actor: 'RMB Agent · E. Mutoni', location: 'Rutsiro', hash: '0xbb42…7d10' },
      { stage: 'Transported', timestamp: '2026-06-07T07:00:00Z', actor: 'Secure Convoy SEC-07', location: 'Rutsiro → Kigali', hash: '0xd0a9…5e6f' },
    ],
  },
]

export const CUSTODY_ORDER: CustodyStage[] = ['Detected', 'Extracted', 'Tagged', 'Transported', 'Warehoused', 'Exported']

// ---- Transportation ------------------------------------------------------

export interface Shipment {
  id: string
  lotId: string
  mineral: Mineral
  origin: { name: string; lat: number; lng: number }
  destination: { name: string; lat: number; lng: number }
  driver: string
  vehicle: string
  status: 'in-transit' | 'delivered' | 'delayed' | 'loading'
  progress: number // 0-100
  etaHours: number
  weightKg: number
  gpsIntegrity: boolean
}

const KIGALI = { name: 'Kigali Logistics Hub', lat: -1.9441, lng: 30.0619 }
const MOMBASA = { name: 'Port of Mombasa', lat: -4.0435, lng: 39.6682 }
const DAR = { name: 'Port of Dar es Salaam', lat: -6.7924, lng: 39.2083 }

export const SHIPMENTS: Shipment[] = [
  {
    id: 'SHP-4021', lotId: 'LOT-88213', mineral: 'Cassiterite', origin: KIGALI, destination: MOMBASA,
    driver: 'D. Nsengimana', vehicle: 'TRK-204', status: 'in-transit', progress: 62, etaHours: 18, weightKg: 1250, gpsIntegrity: true,
  },
  {
    id: 'SHP-4022', lotId: 'LOT-88610', mineral: 'Gold', origin: { name: 'Rutsiro', lat: -1.9312, lng: 29.3312 }, destination: KIGALI,
    driver: 'S. Uwimana', vehicle: 'SEC-07', status: 'in-transit', progress: 78, etaHours: 3, weightKg: 42, gpsIntegrity: true,
  },
  {
    id: 'SHP-4023', lotId: 'LOT-88401', mineral: 'Coltan', origin: KIGALI, destination: DAR,
    driver: 'F. Bizimana', vehicle: 'TRK-118', status: 'delayed', progress: 34, etaHours: 41, weightKg: 640, gpsIntegrity: false,
  },
  {
    id: 'SHP-4024', lotId: 'LOT-88555', mineral: 'Wolframite', origin: { name: 'Gifurwe, Rutsiro', lat: -1.9928, lng: 29.4102 }, destination: KIGALI,
    driver: '(unassigned)', vehicle: 'TRK-330', status: 'loading', progress: 0, etaHours: 6, weightKg: 980, gpsIntegrity: true,
  },
]

// ---- Compliance ----------------------------------------------------------

export interface ComplianceReport {
  id: string
  title: string
  framework: 'OECD Due Diligence' | 'ITSCI' | 'RMB Licensing' | 'EU Conflict Minerals'
  period: string
  status: 'submitted' | 'draft' | 'overdue' | 'approved'
  coveragePct: number
  flaggedLots: number
  submittedTo: string
}

export const REPORTS: ComplianceReport[] = [
  { id: 'RPT-2026-Q2-01', title: 'OECD Due Diligence — Q2 Supply Chain', framework: 'OECD Due Diligence', period: 'Q2 2026', status: 'submitted', coveragePct: 97.2, flaggedLots: 1, submittedTo: 'OECD Secretariat' },
  { id: 'RPT-2026-06-RMB', title: 'RMB Monthly Production Return', framework: 'RMB Licensing', period: 'June 2026', status: 'draft', coveragePct: 88.0, flaggedLots: 1, submittedTo: 'Rwanda Mines Board' },
  { id: 'RPT-2026-EU-05', title: 'EU Conflict Minerals Declaration', framework: 'EU Conflict Minerals', period: 'May 2026', status: 'approved', coveragePct: 99.1, flaggedLots: 0, submittedTo: 'EU Importer Registry' },
  { id: 'RPT-2026-ITSCI-06', title: 'ITSCI Tag Reconciliation', framework: 'ITSCI', period: 'June 2026', status: 'overdue', coveragePct: 74.5, flaggedLots: 2, submittedTo: 'ITRI / iTSCi' },
]

// ---- Live commodity prices ----------------------------------------------

export interface PriceTick {
  commodity: string
  unit: string
  price: number
  changePct: number
}

export const PRICES: PriceTick[] = [
  { commodity: 'Tin', unit: 'USD/t', price: 31480, changePct: 1.4 },
  { commodity: 'Tantalum', unit: 'USD/kg', price: 172, changePct: -0.6 },
  { commodity: 'Tungsten (APT)', unit: 'USD/mtu', price: 345, changePct: 0.9 },
  { commodity: 'Gold', unit: 'USD/oz', price: 2338, changePct: 0.3 },
  { commodity: 'Lithium (Li₂CO₃)', unit: 'USD/t', price: 13850, changePct: -2.1 },
]

// ---- Dashboard KPIs + activity + timeseries ------------------------------

export const KPIS = {
  activeSites: SITES.filter((s) => s.status === 'active').length,
  totalSites: SITES.length,
  scansToday: 6,
  avgConfidence: Number((SCANS.reduce((a, s) => a + s.confidence, 0) / SCANS.length).toFixed(1)),
  estimatedReserveTonnes: SITES.reduce((a, s) => a + s.estimatedTonnage, 0),
  flaggedSites: SITES.filter((s) => s.status === 'flagged').length,
  compliantLotsPct: Number(((LOTS.filter((l) => l.compliant).length / LOTS.length) * 100).toFixed(0)),
  activeShipments: SHIPMENTS.filter((s) => s.status !== 'delivered').length,
}

export interface DetectionTrendPoint {
  month: string
  detections: number
  confidence: number
}

export const DETECTION_TREND: DetectionTrendPoint[] = [
  { month: 'Jan', detections: 18, confidence: 89.1 },
  { month: 'Feb', detections: 24, confidence: 90.4 },
  { month: 'Mar', detections: 31, confidence: 91.8 },
  { month: 'Apr', detections: 29, confidence: 92.6 },
  { month: 'May', detections: 42, confidence: 93.9 },
  { month: 'Jun', detections: 51, confidence: 94.5 },
]

export interface MineralShare {
  mineral: Mineral
  detections: number
}

export const MINERAL_DISTRIBUTION: MineralShare[] = [
  { mineral: 'Cassiterite', detections: 64 },
  { mineral: 'Coltan', detections: 48 },
  { mineral: 'Wolframite', detections: 37 },
  { mineral: 'Gold', detections: 21 },
  { mineral: 'Beryl', detections: 14 },
  { mineral: 'Lithium', detections: 11 },
]

export type ActivityKind = 'scan' | 'alert' | 'shipment' | 'compliance' | 'trace'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  timestamp: string
}

export const ACTIVITY: ActivityItem[] = [
  { id: 'A1', kind: 'alert', title: 'Critical safety score at Musha Cassiterite', detail: 'Subsurface instability detected — score dropped to 34', timestamp: '2026-06-08T11:05:00Z' },
  { id: 'A2', kind: 'scan', title: 'New hyperspectral scan classified', detail: 'SCN-24810 · Cassiterite · 95.6% confidence', timestamp: '2026-06-08T11:02:00Z' },
  { id: 'A3', kind: 'shipment', title: 'GPS integrity lost on SHP-4023', detail: 'Coltan convoy TRK-118 — signal gap on Dar route', timestamp: '2026-06-08T10:40:00Z' },
  { id: 'A4', kind: 'scan', title: 'GPR scan completed', detail: 'SCN-24809 · Gold · Rwinkwavu Prospect', timestamp: '2026-06-08T10:31:00Z' },
  { id: 'A5', kind: 'trace', title: 'Chain-of-custody flag', detail: 'LOT-88555 tagged by disputed agent at Gifurwe', timestamp: '2026-06-08T09:50:00Z' },
  { id: 'A6', kind: 'compliance', title: 'OECD Q2 report submitted', detail: 'RPT-2026-Q2-01 · 97.2% coverage', timestamp: '2026-06-08T09:20:00Z' },
]

// ---- helpers -------------------------------------------------------------

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}
