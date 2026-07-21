// FlowMat의 canvas_component_contracts.md 에 정의된 WorkflowCanvasResponse DTO 형태를 그대로 흉내낸
// 샘플 데이터입니다. 실제 서비스에서는 이 값을
// `GET /api/workflows/{workflowId}/canvas` 같은 REST 호출 결과로 대체하면 됩니다.
//
// 구성: 원자재 입고 -> 가공 -> 품질검사 -> 완제품 출고 로 이어지는 4개 공정 예시.

export const sampleWorkflowCanvasResponse = {
  workflow: {
    workflowId: 'wf-001',
    projectId: 'proj-001',
    workflowName: '알루미늄 브라켓 생산 흐름',
    workflowDesc: '원자재 입고부터 완제품 출고까지의 기본 생산 공정',
    workflowType: 'PRODUCTION',
    workflowStatus: 'ACTIVE',
  },

  processes: [
    {
      processId: 'proc-1',
      projectId: 'proj-001',
      workflowId: 'wf-001',
      processName: '원자재 입고',
      processType: 'INBOUND',
      nodeType: 'default',
      processStatus: 'READY',
      colorScheme: 'blue',
      posX: 60,
      posY: 160,
      width: 220,
      height: 140,
      processDesc: '알루미늄 원자재 입고 및 검수',
    },
    {
      processId: 'proc-2',
      projectId: 'proj-001',
      workflowId: 'wf-001',
      processName: 'CNC 가공',
      processType: 'MANUFACTURING',
      nodeType: 'default',
      processStatus: 'RUNNING',
      colorScheme: 'amber',
      posX: 400,
      posY: 60,
      width: 220,
      height: 160,
      processDesc: 'CNC 절삭 가공 공정',
    },
    {
      processId: 'proc-3',
      projectId: 'proj-001',
      workflowId: 'wf-001',
      processName: '품질 검사',
      processType: 'QUALITY',
      nodeType: 'default',
      processStatus: 'READY',
      colorScheme: 'violet',
      posX: 740,
      posY: 160,
      width: 220,
      height: 140,
      processDesc: '치수/외관 품질 검사',
    },
    {
      processId: 'proc-4',
      projectId: 'proj-001',
      workflowId: 'wf-001',
      processName: '완제품 출고',
      processType: 'OUTBOUND',
      nodeType: 'default',
      processStatus: 'READY',
      colorScheme: 'emerald',
      posX: 1080,
      posY: 160,
      width: 220,
      height: 140,
      processDesc: '완제품 포장 및 출고',
    },
  ],

  processIos: [
    // proc-1 원자재 입고
    { processIoId: 'io-1-out', processId: 'proc-1', itemId: 'item-al-bar', ioName: '알루미늄 바', direction: 'output', ioType: 'MATERIAL', quantity: '500', unit: 'kg', formula: null, colorScheme: 'blue', requiredYn: 'Y', allowShortageYn: 'N' },

    // proc-2 CNC 가공
    { processIoId: 'io-2-in', processId: 'proc-2', itemId: 'item-al-bar', ioName: '알루미늄 바', direction: 'input', ioType: 'MATERIAL', quantity: '500', unit: 'kg', formula: null, colorScheme: 'blue', requiredYn: 'Y', allowShortageYn: 'N' },
    { processIoId: 'io-2-out', processId: 'proc-2', itemId: 'item-bracket-raw', ioName: '가공 브라켓', direction: 'output', ioType: 'WIP', quantity: '480', unit: 'ea', formula: 'input * 0.96', colorScheme: 'amber', requiredYn: 'Y', allowShortageYn: 'Y' },

    // proc-3 품질 검사
    { processIoId: 'io-3-in', processId: 'proc-3', itemId: 'item-bracket-raw', ioName: '가공 브라켓', direction: 'input', ioType: 'WIP', quantity: '480', unit: 'ea', formula: null, colorScheme: 'amber', requiredYn: 'Y', allowShortageYn: 'Y' },
    { processIoId: 'io-3-out', processId: 'proc-3', itemId: 'item-bracket-ok', ioName: '합격 브라켓', direction: 'output', ioType: 'PRODUCT', quantity: '460', unit: 'ea', formula: null, colorScheme: 'violet', requiredYn: 'Y', allowShortageYn: 'N' },

    // proc-4 완제품 출고
    { processIoId: 'io-4-in', processId: 'proc-4', itemId: 'item-bracket-ok', ioName: '합격 브라켓', direction: 'input', ioType: 'PRODUCT', quantity: '460', unit: 'ea', formula: null, colorScheme: 'violet', requiredYn: 'Y', allowShortageYn: 'N' },
  ],

  connections: [
    {
      connectionId: 'conn-1',
      fromProcessId: 'proc-1',
      toProcessId: 'proc-2',
      fromIoId: 'io-1-out',
      toIoId: 'io-2-in',
      itemId: 'item-al-bar',
      sourceHandle: 'io-1-out',
      targetHandle: 'io-2-in',
      connectionType: 'MATERIAL_FLOW',
      connectionLabel: '원자재 공급',
      flowRate: '500',
      unit: 'kg/day',
      delayTimeSec: '0',
      lossRate: '0',
      priority: 1,
    },
    {
      connectionId: 'conn-2',
      fromProcessId: 'proc-2',
      toProcessId: 'proc-3',
      fromIoId: 'io-2-out',
      toIoId: 'io-3-in',
      itemId: 'item-bracket-raw',
      sourceHandle: 'io-2-out',
      targetHandle: 'io-3-in',
      connectionType: 'WIP_FLOW',
      connectionLabel: '가공 완료품 이동',
      flowRate: '480',
      unit: 'ea/day',
      delayTimeSec: '120',
      lossRate: '4',
      priority: 1,
    },
    {
      connectionId: 'conn-3',
      fromProcessId: 'proc-3',
      toProcessId: 'proc-4',
      fromIoId: 'io-3-out',
      toIoId: 'io-4-in',
      itemId: 'item-bracket-ok',
      sourceHandle: 'io-3-out',
      targetHandle: 'io-4-in',
      connectionType: 'PRODUCT_FLOW',
      connectionLabel: '합격품 출고 이동',
      flowRate: '460',
      unit: 'ea/day',
      delayTimeSec: '60',
      lossRate: '0',
      priority: 1,
    },
  ],
}
