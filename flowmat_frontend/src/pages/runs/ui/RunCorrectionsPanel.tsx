import { useState, type FormEvent } from 'react'
import { useLotsQuery } from '../../../entities/inventory/api/useLots'
import {
  useDecideRunCorrectionMutation,
  useRequestRunCorrectionMutation,
  useRunCorrectionsQuery,
} from '../../../entities/production/api/useRunCorrections'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { InventoryDto, ItemDto, ProductionRunDto, ProductionRunItemDto } from '../../../shared/types/api'
import {
  buildCorrectionRequest,
  correctionStatusLabel,
  describeCorrectionLine,
  orderStockForPick,
  voidableRecordings,
  type CorrectionAddDraft,
  type CorrectionDraft,
} from '../model/correctionModel'
import { formatQty } from './runDisplay'

const EMPTY_DRAFT: CorrectionDraft = { reason: '', voidRunItemIds: [], adds: [], outputQty: '' }
const EMPTY_ADD: CorrectionAddDraft = { direction: 'input', itemId: '', inventoryId: '', qty: '', unit: '' }

interface Props {
  projectId: string
  run: ProductionRunDto
  runItems: ProductionRunItemDto[]
  items: ItemDto[]
  inventories: InventoryDto[]
  itemLabel: (itemId: string) => string
  inventoryLabel: (inventoryId: string) => string
  itemUnitCode: (itemId: string) => string | undefined
}

/**
 * Corrections of a finished run (docs/domain/production-run-correction.md): anyone who can edit requests one with a
 * reason; the project owner approves it (which applies it) or rejects it.
 */
export function RunCorrectionsPanel({ projectId, run, runItems, items, inventories, itemLabel, inventoryLabel, itemUnitCode }: Props) {
  const runId = run.productionRunId
  const correctionsQuery = useRunCorrectionsQuery(runId)
  const requestMutation = useRequestRunCorrectionMutation(runId)
  const decideMutation = useDecideRunCorrectionMutation(runId, projectId)
  const lotsQuery = useLotsQuery(projectId)
  const [draft, setDraft] = useState<CorrectionDraft>(EMPTY_DRAFT)
  const [formError, setFormError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const corrections = correctionsQuery.data ?? []
  const pending = corrections.find((correction) => correction.status === 'pending_approval')
  const voidable = voidableRecordings(runItems)

  function updateAdd(index: number, patch: Partial<CorrectionAddDraft>) {
    setDraft((d) => ({ ...d, adds: d.adds.map((add, i) => (i === index ? { ...add, ...patch } : add)) }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = buildCorrectionRequest(draft, run.actualOutputQty)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setFormError(null)
    try {
      await requestMutation.mutateAsync(result.body)
      setDraft(EMPTY_DRAFT)
      setOpen(false)
    } catch {
      // Shown below the form.
    }
  }

  return (
    <section aria-label="Corrections" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <h3 style={{ marginTop: 0 }}>Corrections</h3>
      <p className="inspector-hint" style={{ marginTop: 0 }}>
        This run is finished. Wrong recordings are corrected here: the original rows stay, and stock, recordings and LOT
        genealogy change together once the project owner approves.
      </p>

      {correctionsQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(correctionsQuery.error, 'Failed to load corrections.')}</p>
      )}
      {corrections.length > 0 && (
        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'grid', gap: 10 }}>
          {corrections.map((correction) => (
            <li
              key={correction.productionRunCorrectionId}
              aria-label={`Correction #${correction.correctionNo}`}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontSize: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>#{correction.correctionNo}</strong>
                <span>{correctionStatusLabel(correction.status)}</span>
              </div>
              <div style={{ margin: '4px 0' }}>{correction.reason}</div>
              <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                {correction.lines.map((line) => (
                  <li key={line.lineNo}>{describeCorrectionLine(line, runItems, itemLabel, formatQty)}</li>
                ))}
              </ul>
              <div style={{ opacity: 0.7 }}>
                Requested by {correction.requestedBy} on {new Date(correction.requestedAt).toLocaleString()}
                {correction.decidedBy && correction.decidedAt && (
                  <>
                    <br />
                    {correction.status === 'applied' ? 'Approved' : 'Rejected'} by {correction.decidedBy} on{' '}
                    {new Date(correction.decidedAt).toLocaleString()}
                    {correction.decisionNote ? `: ${correction.decisionNote}` : ''}
                  </>
                )}
              </div>
              {correction.status === 'pending_approval' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    disabled={decideMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Apply correction #${correction.correctionNo}? Stock and LOT genealogy change now.`)) {
                        decideMutation.mutate({ correctionId: correction.productionRunCorrectionId, decision: 'approve' })
                      }
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={decideMutation.isPending}
                    onClick={() => {
                      const note = window.prompt('Why is this correction rejected?')
                      if (note?.trim()) {
                        decideMutation.mutate({
                          correctionId: correction.productionRunCorrectionId,
                          decision: 'reject',
                          note: note.trim(),
                        })
                      }
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {decideMutation.isError && (
        <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>
          {errorMessage(decideMutation.error, 'The correction could not be decided.')}
        </p>
      )}

      {pending ? (
        <p className="inspector-hint">Correction #{pending.correctionNo} is waiting for approval; request the next one after it.</p>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)}>Request correction</button>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10, fontSize: 13 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Reason *</span>
            <input
              value={draft.reason}
              maxLength={500}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
            />
          </label>

          <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
            <legend>Void recordings</legend>
            {voidable.length === 0 && <span className="inspector-hint">No recordings to void.</span>}
            {voidable.map((item) => (
              <label key={item.productionRunItemId} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={draft.voidRunItemIds.includes(item.productionRunItemId)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      voidRunItemIds: e.target.checked
                        ? [...d.voidRunItemIds, item.productionRunItemId]
                        : d.voidRunItemIds.filter((id) => id !== item.productionRunItemId),
                    }))
                  }
                />
                {item.direction} {itemLabel(item.itemId)} {formatQty(item.actualQty ?? item.plannedQty)} {item.unit}
                {item.inventoryId ? ` · ${inventoryLabel(item.inventoryId)}` : ''}
              </label>
            ))}
          </fieldset>

          <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, display: 'grid', gap: 8 }}>
            <legend>Add recordings</legend>
            {draft.adds.map((add, index) => {
              const lotTracked = items.find((item) => item.itemId === add.itemId)?.lotManageYn === 'Y'
              const stock = inventories.filter((inv) => inv.itemId === add.itemId)
              return (
                <div key={index} aria-label={`Added recording ${index + 1}`} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['input', 'output'] as const).map((direction) => (
                      <label key={direction} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          type="radio"
                          name={`correction-direction-${index}`}
                          checked={add.direction === direction}
                          onChange={() => updateAdd(index, { direction })}
                        />
                        {direction}
                      </label>
                    ))}
                    <button
                      type="button"
                      style={{ marginLeft: 'auto', fontSize: 11 }}
                      onClick={() => setDraft((d) => ({ ...d, adds: d.adds.filter((_, i) => i !== index) }))}
                    >
                      Remove
                    </button>
                  </div>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span>Item</span>
                    <select
                      value={add.itemId}
                      onChange={(e) =>
                        updateAdd(index, { itemId: e.target.value, inventoryId: '', unit: itemUnitCode(e.target.value) ?? add.unit })
                      }
                    >
                      <option value="" disabled>Select item</option>
                      {items.map((item) => (
                        <option key={item.itemId} value={item.itemId}>{item.itemCode} · {item.itemName}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 6 }}>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span>Quantity</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={add.qty}
                        onChange={(e) => updateAdd(index, { qty: e.target.value })}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span>Unit</span>
                      <input value={add.unit} onChange={(e) => updateAdd(index, { unit: e.target.value })} />
                    </label>
                  </div>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span>{lotTracked ? 'LOT' : 'Stock record'}</span>
                    <select
                      value={add.inventoryId}
                      disabled={!add.itemId || stock.length === 0}
                      onChange={(e) => updateAdd(index, { inventoryId: e.target.value })}
                    >
                      <option value="" disabled={lotTracked}>{lotTracked ? 'Select LOT' : "Don't adjust stock"}</option>
                      {orderStockForPick(stock, lotsQuery.data ?? []).map(({ inventory: inv, expiryDate, expired }) => (
                        <option
                          key={inv.inventoryId}
                          value={inv.inventoryId}
                          // Expired LOTs cannot go into production (docs/domain/lot-expiry.md).
                          disabled={expired && add.direction === 'input'}
                        >
                          {inventoryLabel(inv.inventoryId)} (available {formatQty(inv.availableQuantity)})
                          {expiryDate ? ` · ${expired ? 'expired' : 'exp.'} ${expiryDate}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )
            })}
            <button type="button" onClick={() => setDraft((d) => ({ ...d, adds: [...d.adds, EMPTY_ADD] }))}>
              Add a recording
            </button>
          </fieldset>

          <label style={{ display: 'grid', gap: 4 }}>
            <span>Corrected output qty</span>
            <input
              type="number"
              min="0"
              step="any"
              value={draft.outputQty}
              placeholder={`now ${formatQty(run.actualOutputQty)}`}
              onChange={(e) => setDraft((d) => ({ ...d, outputQty: e.target.value }))}
            />
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={requestMutation.isPending}>
              {requestMutation.isPending ? 'Requesting...' : 'Request'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_DRAFT)
                setFormError(null)
                setOpen(false)
              }}
            >
              Discard
            </button>
          </div>
          {(formError || requestMutation.isError) && (
            <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>
              {formError ?? errorMessage(requestMutation.error, 'The correction could not be requested.')}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
