/* eslint-disable @typescript-eslint/no-unused-vars */

export interface AnalysisInput {
  imageUrl: string
  previousImageUrl?: string
  sensorData?: {
    temperature: number
    humidity: number
    co2: number
  }
}

export interface AnalysisResult {
  confidence: number
  observation: string
  growthStage?: string
  growthProgress?: number
  contaminationDetected: boolean
  anomaliesDetected: boolean
  comparedToPrevious: boolean
}

export async function analyzeImage(_input: AnalysisInput): Promise<AnalysisResult> {
  throw new Error("AI analysis engine not initialized")
}

export async function compareImages(
  _current: AnalysisInput,
  _previous: AnalysisInput,
): Promise<AnalysisResult> {
  throw new Error("AI comparison engine not initialized")
}

export async function predictGrowth(_inputs: AnalysisInput[]): Promise<{
  estimatedHarvest: string
  confidence: number
  trajectory: Array<{ day: number; progress: number }>
}> {
  throw new Error("AI prediction engine not initialized")
}

export async function detectContamination(_input: AnalysisInput): Promise<{
  detected: boolean
  confidence: number
  regions: string[]
}> {
  throw new Error("AI contamination detection not initialized")
}
