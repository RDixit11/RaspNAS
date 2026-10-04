import { useContext } from 'react'
import { ClusterContext } from '@/context/clusterContext'

export function useCluster() {
  const context = useContext(ClusterContext)
  if (!context) throw new Error('useCluster musi być użyty wewnątrz <ClusterProvider>')
  return context
}
