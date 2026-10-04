import { ClusterContext } from '@/context/clusterContext'
import { useResource } from '@/hooks/useResource'
import { getCluster } from '@/services/cluster'

const REFRESH_MS = 10_000

// Stan klastra (węzły, pula, alerty) wspólny dla panelu bocznego i stron — odświeżany co 10 s
export function ClusterProvider({ children }) {
  const cluster = useResource(getCluster, [], { interval: REFRESH_MS })
  return <ClusterContext.Provider value={cluster}>{children}</ClusterContext.Provider>
}
