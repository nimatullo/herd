import { useCallback, useEffect, useState } from "react"
import { getHerd } from "./barn"
import { watch } from "./wrangler"
import { Cow } from "./breeds"

export function useHerd() {
  const [herd, setHerd] = useState<Cow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await getHerd()
    setHerd(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { herd, isLoading, refresh }
}

export function usePulse() {
  const [, setTick] = useState(0)

  useEffect(() => {
    return watch(() => setTick((t) => t + 1))
  }, [])
}
