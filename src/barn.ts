import { LocalStorage } from "@raycast/api"
import { Cow } from "./breeds"

const HERD_KEY = "herd"

export async function getHerd(): Promise<Cow[]> {
  const raw = await LocalStorage.getItem<string>(HERD_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Cow[]
  } catch {
    return []
  }
}

export async function saveHerd(herd: Cow[]): Promise<void> {
  await LocalStorage.setItem(HERD_KEY, JSON.stringify(herd))
}

export async function addCow(cow: Cow): Promise<void> {
  const herd = await getHerd()
  herd.push(cow)
  await saveHerd(herd)
}

export async function cullCow(tag: string): Promise<void> {
  const herd = await getHerd()
  await saveHerd(herd.filter((c) => c.tag !== tag))
}

export async function rebrandCow(
  tag: string,
  updates: Partial<Cow>,
): Promise<void> {
  const herd = await getHerd()
  const idx = herd.findIndex((c) => c.tag === tag)
  if (idx === -1) return
  herd[idx] = { ...herd[idx], ...updates }
  await saveHerd(herd)
}
