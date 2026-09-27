import { useStorageLocationsQuery } from '../../../entities/inventory/api/useStorageLocations'
import { stockPlaceCodes } from '../model/locationModel'

/** The id location inputs name in their `list` to be offered the project's listed places. */
export const LOCATION_OPTIONS_ID = 'storage-location-options'

/**
 * Suggests the active listed places to stock location inputs (docs/domain/storage-location.md). Empty while the project
 * lists no place, when locations stay free text.
 */
export function LocationOptions({ projectId }: { projectId: string }) {
  const codes = stockPlaceCodes(useStorageLocationsQuery(projectId).data ?? [])
  return (
    <datalist id={LOCATION_OPTIONS_ID}>
      {codes.map((code) => <option key={code} value={code} />)}
    </datalist>
  )
}
