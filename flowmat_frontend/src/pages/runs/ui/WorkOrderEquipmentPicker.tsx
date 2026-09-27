import { useEquipmentQuery } from '../../../entities/catalog/api/useEquipment'
import { useAssignWorkOrderEquipmentMutation } from '../../../entities/production/api/useWorkOrderEquipment'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { WorkOrderDto } from '../../../shared/types/api'
import { equipmentChoices, equipmentLabel } from '../../inventory/model/equipmentScheduleModel'

/**
 * The equipment a work order runs on (docs/domain/equipment-schedule.md). It can change until the order is completed or
 * cancelled; readiness then checks the equipment's time in the planned window.
 */
export function WorkOrderEquipmentPicker({ order, projectId }: { order: WorkOrderDto; projectId: string }) {
  const equipment = useEquipmentQuery(projectId).data ?? []
  const assign = useAssignWorkOrderEquipmentMutation(projectId)
  const current = order.equipmentId ?? null

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, marginBottom: 8 }}>
      <label>
        Equipment{' '}
        <select value={current ?? ''} disabled={assign.isPending}
          onChange={(event) => assign.mutate({ workOrderId: order.workOrderId, equipmentId: event.target.value || null })}>
          <option value="">No equipment</option>
          {equipmentChoices(equipment, current).map((one) => (
            <option key={one.equipmentId} value={one.equipmentId}>{equipmentLabel(one)}</option>
          ))}
        </select>
      </label>
      <span className="inspector-hint">Readiness checks its shifts and downtime against the planned start and end.</span>
      {assign.isError && <span role="alert" style={{ color: '#dc2626' }}>{errorMessage(assign.error)}</span>}
    </div>
  )
}
