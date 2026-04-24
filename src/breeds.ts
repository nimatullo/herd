export interface Cow {
  tag: string
  name: string
  call: string
  pasture: string
  setup?: string
}

export type CowMood = "penned" | "grazing" | "stirring" | "lame"

export interface CowState {
  mood: CowMood
  brand?: number
  releasedAt?: number
  tracks: string[]
}
