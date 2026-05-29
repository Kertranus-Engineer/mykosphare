import type { SystemConfig, ConfigVersion } from "@/lib/config/types"

let activeConfig: SystemConfig = {
  targetTemp: 24,
  targetHumidity: 65,
  tempTolerance: 2,
  humTolerance: 10,
  autoFan: true,
  autoHumidifier: true,
  autoFailsafe: true,
  recoveryMode: true,
  fanOnTemp: 28,
  fanOffTemp: 26,
  criticalTemp: 32,
  emergencyTemp: 35,
  telemetryInterval: 3000,
  confidenceRecovery: "normal",
  reconnectStrategy: "adaptive",
}

const versions: ConfigVersion[] = []
let versionId = 0

export async function POST(req: Request) {
  const body = await req.json()
  const action = body.action as string

  if (action === "deploy" && body.config) {
    const newConfig: SystemConfig = {
      targetTemp: body.config.targetTemp ?? activeConfig.targetTemp,
      targetHumidity: body.config.targetHumidity ?? activeConfig.targetHumidity,
      tempTolerance: body.config.tempTolerance ?? activeConfig.tempTolerance,
      humTolerance: body.config.humTolerance ?? activeConfig.humTolerance,
      autoFan: body.config.autoFan ?? activeConfig.autoFan,
      autoHumidifier: body.config.autoHumidifier ?? activeConfig.autoHumidifier,
      autoFailsafe: body.config.autoFailsafe ?? activeConfig.autoFailsafe,
      recoveryMode: body.config.recoveryMode ?? activeConfig.recoveryMode,
      fanOnTemp: body.config.fanOnTemp ?? activeConfig.fanOnTemp,
      fanOffTemp: body.config.fanOffTemp ?? activeConfig.fanOffTemp,
      criticalTemp: body.config.criticalTemp ?? activeConfig.criticalTemp,
      emergencyTemp: body.config.emergencyTemp ?? activeConfig.emergencyTemp,
      telemetryInterval: body.config.telemetryInterval ?? activeConfig.telemetryInterval,
      confidenceRecovery: body.config.confidenceRecovery ?? activeConfig.confidenceRecovery,
      reconnectStrategy: body.config.reconnectStrategy ?? activeConfig.reconnectStrategy,
    }

    const prev = activeConfig
    activeConfig = newConfig
    versionId++

    const version: ConfigVersion = {
      id: versionId,
      config: newConfig,
      state: "deployed",
      createdAt: new Date().toISOString(),
      deployedAt: new Date().toISOString(),
    }
    versions.push(version)

    console.log(`CONFIG DEPLOYED: CFG-${String(versionId).padStart(4, "0")}`)
    return Response.json({
      success: true,
      versionId,
      versionLabel: `CFG-${String(versionId).padStart(4, "0")}`,
    })
  }

  if (action === "rollback" && versions.length > 1) {
    versions.pop()
    const prev = versions[versions.length - 1]
    activeConfig = { ...prev.config }
    versionId++

    const version: ConfigVersion = {
      id: versionId,
      config: activeConfig,
      state: "rollback",
      createdAt: new Date().toISOString(),
      deployedAt: new Date().toISOString(),
    }
    versions.push(version)

    console.log(`CONFIG ROLLBACK: CFG-${String(versionId).padStart(4, "0")}`)
    return Response.json({
      success: true,
      versionId,
      versionLabel: `CFG-${String(versionId).padStart(4, "0")}`,
    })
  }

  return Response.json({ error: "Invalid action" }, { status: 400 })
}

export async function GET() {
  return Response.json({
    config: activeConfig,
    versions: versions.slice(-10).reverse(),
    currentVersion: versions.length > 0
      ? `CFG-${String(versions[versions.length - 1].id).padStart(4, "0")}`
      : "CFG-DEFAULT",
  })
}
