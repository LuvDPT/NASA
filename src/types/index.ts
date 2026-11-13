export type SoilType =
  | 'sand'
  | 'loam'
  | 'clay'
  | 'alluvial'
  | 'basalt'
  | 'acid_sulfate'
  | 'saline'
  | 'unknown';

export type WaterSourceType =
  | 'river'
  | 'pond'
  | 'well'
  | 'tap'
  | 'rain'
  | 'other';

export type CropCategory =
  | 'rice'
  | 'vegetable'
  | 'maize'
  | 'fruit'
  | 'industrial';

export interface NasaGridCell {
  cellId: string;
  lat: number;
  lon: number;
  region: string;
  subRegion: string;
  climatology21Yr: {
    avgTemp: number;
    minTempAnnual: number;
    maxTempAnnual: number;
    annualRainfallMm: number;
    avgGwetroot: number;
    avgGwettop: number;
    avgRh2m: number;
    avgSolarDwn: number;
    riskMonthsCold: number[]; // e.g. [12, 1, 2]
    riskMonthsDrought: number[]; // e.g. [3, 4]
    riskMonthsFlood: number[]; // e.g. [8, 9, 10]
  };
}

export interface FieldProfile {
  id: string;
  name: string;
  province: string;
  district: string;
  lat: number;
  lon: number;
  areaHa: number;
  // Soil
  soilType: SoilType;
  soilCharacteristics: {
    drainage: 'fast' | 'moderate' | 'slow';
    holdsWater: boolean;
    proneToFlooding: boolean;
    ph?: number;
    customNote?: string;
  };
  // Water
  waterSource: {
    type: WaterSourceType;
    isStable: boolean;
    observation: 'clear' | 'turbid' | 'odor' | 'normal';
    hasTestResult: boolean;
    salinityRisk: boolean;
    notes?: string;
  };
  // Crop
  crop: {
    name: string;
    category: CropCategory;
    variety: string;
    plantingDate: string;
    currentStage: string;
    stageIndex: number;
    farmingMethod: string;
    irrigationMethod: string;
    lastFertilizerDate?: string;
    healthStatus: 'healthy' | 'stressed' | 'pest_risk' | 'unknown';
  };
  // Goals
  primaryGoal: 'save_water' | 'minimize_risk' | 'stabilize_yield' | 'optimize_cost';
  inspectTime: 'morning' | 'afternoon' | 'anytime';
  notificationMethod: 'in_app' | 'email' | 'push';
  // Associated NASA Grid
  nasaGrid: {
    cellId: string;
    lat: number;
    lon: number;
    distanceKm: number;
  };
  // Learned farmer behavioral adjustments
  adaptiveMemory?: {
    soilAdjustment?: string;
    irrigationSensitivity?: 'higher' | 'normal' | 'lower';
    consecutiveDryAlerts?: number;
    lastFeedbackDate?: string;
  };
}

export type DataProvenanceType =
  | 'NASA_HISTORICAL'
  | 'NASA_CURRENT'
  | 'EXTERNAL_FORECAST'
  | 'USER_OBSERVATION'
  | 'AI_INFERENCE'
  | 'UNVERIFIED';

export interface ProvenanceBadge {
  label: string;
  type: DataProvenanceType;
  description: string;
}

export interface WeatherObservation {
  temp: number;
  minTemp: number;
  maxTemp: number;
  rain: number;
  humidity: number;
  gwettop: number;
  gwetroot: number;
  solarRadiation: number;
  windSpeed: number;
  observationDate: string;
  isRealtimeAvailable: boolean;
  source: 'NASA_POWER_UPDATED' | 'USER_OBSERVATION' | 'WEATHER_STATION' | 'ESTIMATED_CLIMATE';
  historicalBaseline: {
    avgTemp: number;
    avgRain: number;
    avgHumidity: number;
    avgGwettop: number;
    avgGwetroot: number;
    avgSolar: number;
    sampleYears: number; // 21 years (2005-2025)
  };
}

export interface RecommendationAction {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  dataBasis: string;
}

export interface DailyAgronomicBrief {
  id: string;
  fieldId: string;
  timestamp: string;
  headline: string;
  riskLevel: 'LOW' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  situation: string;
  analysis: string;
  topActions: RecommendationAction[];
  postponeActions: string[];
  explanation: string;
  uncertainties: string;
  nextCheckTime: string;
  provenances: ProvenanceBadge[];
}

export interface FarmTask {
  id: string;
  fieldId: string;
  title: string;
  scheduledTime: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  triggerData: string;
  status: 'pending' | 'completed' | 'postponed' | 'skipped';
  createdAt: string;
  farmerNote?: string;
}

export type FeedbackType =
  | 'helpful'
  | 'not_suitable'
  | 'followed'
  | 'not_followed'
  | 'soil_still_dry'
  | 'soil_too_wet'
  | 'crop_healthy'
  | 'crop_abnormal';

export interface FeedbackRecord {
  id: string;
  fieldId: string;
  timestamp: string;
  feedbackType: FeedbackType;
  userComment?: string;
  systemActionTaken?: string;
  appliedToProfile: boolean;
}

export interface PlantingRiskEvaluation {
  cropName: string;
  variety: string;
  month: number;
  status: 'optimal' | 'caution' | 'risk' | 'insufficient';
  score: number; // 0-100
  yearsSurveyed: number; // 21
  adverseYearsCount: number;
  adverseDaysAvg: number;
  thresholdCondition: string;
  summaryExplanation: string;
}

export interface DataImportRecord {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  storagePath?: string;
  recordCount: number;
  cellCount: number;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  version: string;
  importedBy: string;
  errorSummary?: string;
  createdAt: string;
}

export interface SyncLogRecord {
  id: string;
  syncType: 'NASA_POWER_API' | 'CSV_UPLOAD' | 'MANUAL_SYNC';
  targetCellsCount: number;
  recordsSynced: number;
  startTime: string;
  endTime?: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  latestNasaDate?: string;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface CentralDataStatus {
  isConnectedToSupabase: boolean;
  supabaseUrl?: string;
  latestNasaDate: string;
  lastSyncTime: string;
  dataSource: string;
  status: 'LATEST' | 'SYNCING' | 'MISSING_DATA' | 'ERROR';
  activeVersion: string;
  totalRecords: number;
  autoSyncEnabled: boolean;
  storageBucketReady: boolean;
  affectedFarmsCount: number;
}

export interface CsvPreviewResult {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  uniqueCells: number;
  startDate: string;
  endDate: string;
  indicatorsDetected: string[];
  sampleRows: Array<Record<string, any>>;
  errors: string[];
  duplicateCount: number;
}
