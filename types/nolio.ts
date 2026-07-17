/** Séance réalisée Nolio (champs utiles pour LogiCycle) */
export interface NolioTraining {
  id: number;
  name?: string;
  date_start: string;
  duration?: number;
  distance?: number;
  elevation_gain?: number;
  sport_id?: number;
  rpe?: number;
}

export interface WeeklyTrainingSummary {
  weekStart: string;
  weekLabel: string;
  sessionCount: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalElevationMeters: number;
}

export interface NolioConnectionInfo {
  connected: boolean;
  connectedAt?: string;
  nolioUserId?: number;
}

export interface NolioTrainingsResponse {
  trainings: NolioTraining[];
  from: string;
  to: string;
}
