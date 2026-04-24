import { environment } from "@raycast/api"
import { ChildProcess, execSync, spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import treeKill from "tree-kill"
import { Cow, CowState } from "./breeds"

const MAX_TRACK_LINES = 2000

function getUserShell(): string {
  // bc raycast doesn't inherit the shell from parent, we have to do this weird thing to get the appropriate shell
  // or maybe i cant figure it out
  if (process.env.SHELL) return process.env.SHELL

  try {
    const out = execSync("dscl . -read ~ UserShell", { encoding: "utf-8" })
    const shell = out.split(":").pop()?.trim()
    if (shell) return shell
  } catch {
    console.error("Failed to get user shell")
  }

  return "/bin/zsh"
}

interface TendedCow {
  process: ChildProcess
  state: CowState
  trackFile: string
}

const pasture = new Map<string, TendedCow>()
const watchers = new Set<() => void>()

function tracksDir(): string {
  const dir = path.join(environment.supportPath, "tracks")
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function trackFilePath(tag: string): string {
  return path.join(tracksDir(), `${tag}.log`)
}

// --- PID persistence: survives extension reloads ---

interface PersistedBrand {
  pid: number
  releasedAt: number
}

function brandsFilePath(): string {
  fs.mkdirSync(environment.supportPath, { recursive: true })
  return path.join(environment.supportPath, "brands.json")
}

function loadBrands(): Record<string, PersistedBrand> {
  try {
    return JSON.parse(fs.readFileSync(brandsFilePath(), "utf-8"))
  } catch {
    return {}
  }
}

function saveBrands(brands: Record<string, PersistedBrand>) {
  fs.writeFileSync(brandsFilePath(), JSON.stringify(brands))
}

function persistBrand(tag: string, pid: number, releasedAt: number) {
  const brands = loadBrands()
  brands[tag] = { pid, releasedAt }
  saveBrands(brands)
}

function clearBrand(tag: string) {
  const brands = loadBrands()
  delete brands[tag]
  saveBrands(brands)
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function watch(fn: () => void): () => void {
  watchers.add(fn)
  return () => watchers.delete(fn)
}

function signal() {
  watchers.forEach((fn) => fn())
}

function leaveTrack(tended: TendedCow, line: string) {
  tended.state.tracks.push(line)
  if (tended.state.tracks.length > MAX_TRACK_LINES) {
    tended.state.tracks = tended.state.tracks.slice(-MAX_TRACK_LINES)
  }
  try {
    fs.appendFileSync(tended.trackFile, line + "\n")
  } catch {
    console.error("Failed to write track file", tended.trackFile)
  }
  signal()
}

export function getCowState(tag: string): CowState {
  const tended = pasture.get(tag)
  if (tended) return tended.state

  const brands = loadBrands()
  const brand = brands[tag]
  if (brand && isProcessAlive(brand.pid)) {
    return {
      mood: "grazing",
      brand: brand.pid,
      releasedAt: brand.releasedAt,
      tracks: loadPersistedTracks(tag),
    }
  }

  if (brand) clearBrand(tag)
  return { mood: "penned", tracks: loadPersistedTracks(tag) }
}

function loadPersistedTracks(tag: string): string[] {
  const file = trackFilePath(tag)
  try {
    if (!fs.existsSync(file)) return []
    const content = fs.readFileSync(file, "utf-8")
    const lines = content.split("\n").filter(Boolean)
    return lines.slice(-MAX_TRACK_LINES)
  } catch {
    return []
  }
}

export function unleash(cow: Cow): CowState {
  const existing = pasture.get(cow.tag)
  if (existing && existing.state.mood === "grazing") {
    return existing.state
  }

  const brands = loadBrands()
  const brand = brands[cow.tag]
  if (brand && isProcessAlive(brand.pid)) {
    return {
      mood: "grazing",
      brand: brand.pid,
      releasedAt: brand.releasedAt,
      tracks: loadPersistedTracks(cow.tag),
    }
  }

  const trackFile = trackFilePath(cow.tag)
  try {
    fs.writeFileSync(trackFile, "")
  } catch {
    console.error("Failed to write track file", trackFile)
  }

  const command = cow.setup ? `${cow.setup} && ${cow.call}` : cow.call
  const shell = getUserShell()

  const child = spawn(shell, ["-l", "-c", command], {
    cwd: cow.pasture,
    env: {
      ...process.env,
      TERM: "xterm-256color",
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  })

  const state: CowState = {
    mood: "grazing",
    brand: child.pid,
    releasedAt: Date.now(),
    tracks: [],
  }

  const tended: TendedCow = { process: child, state, trackFile }
  pasture.set(cow.tag, tended)

  if (child.pid) persistBrand(cow.tag, child.pid, state.releasedAt!)

  const handleData = (data: Buffer) => {
    const lines = data.toString("utf-8").split("\n").filter(Boolean)
    lines.forEach((line) => leaveTrack(tended, line))
  }

  child.stdout?.on("data", handleData)
  child.stderr?.on("data", handleData)

  child.on("error", (err) => {
    tended.state.mood = "lame"
    leaveTrack(tended, `[herd] Process error: ${err.message}`)
    clearBrand(cow.tag)
    signal()
  })

  child.on("close", (code) => {
    if (tended.state.mood !== "lame") {
      tended.state.mood = "penned"
    }
    leaveTrack(tended, `[herd] Exited with code ${code}`)
    clearBrand(cow.tag)
    signal()
  })

  signal()
  return state
}

export async function pen(tag: string): Promise<void> {
  const tended = pasture.get(tag)

  if (tended && tended.state.mood === "grazing") {
    const pid = tended.process.pid
    if (!pid) return

    return new Promise<void>((resolve) => {
      treeKill(pid, "SIGTERM", (err) => {
        if (err) {
          try {
            treeKill(pid, "SIGKILL")
          } catch {
            console.error("Failed to kill process", pid)
          }
        }
        tended.state.mood = "penned"
        tended.state.brand = undefined
        leaveTrack(tended, "[herd] Server stopped")
        clearBrand(tag)
        signal()
        resolve()
      })
    })
  }

  const brands = loadBrands()
  const brand = brands[tag]
  if (brand && isProcessAlive(brand.pid)) {
    return new Promise<void>((resolve) => {
      treeKill(brand.pid, "SIGTERM", (err) => {
        if (err) {
          try {
            treeKill(brand.pid, "SIGKILL")
          } catch {
            console.error("Failed to kill process", brand.pid)
          }
        }
        clearBrand(tag)
        signal()
        resolve()
      })
    })
  }

  clearBrand(tag)
}

export async function wrangle(cow: Cow): Promise<CowState> {
  return pen(cow.tag).then(() => unleash(cow))
}

export function clearTracks(tag: string): void {
  const tended = pasture.get(tag)
  if (tended) {
    tended.state.tracks = []
  }
  const file = trackFilePath(tag)
  try {
    fs.writeFileSync(file, "")
  } catch {
    console.error("Failed to clear tracks", file)
  }
  signal()
}

export function isGrazing(tag: string): boolean {
  return getCowState(tag).mood === "grazing"
}
