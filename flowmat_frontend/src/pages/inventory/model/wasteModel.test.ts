import { describe, expect, it } from 'vitest'
import { wasteCsv } from './wasteModel'

describe('wasteCsv', () => {
  it('writes one line per item with each reason, the total and the value', () => {
    const csv = wasteCsv([
      { itemId: 'c', itemCode: 'CRM', itemName: 'Cream, fresh', unit: 'kg', expired: 3, defect: 0, countLoss: 0, total: 3, value: 6 },
      { itemId: 's', itemCode: 'SUG', itemName: 'Sugar', unit: 'kg', expired: 0, defect: 1, countLoss: 2, total: 3, value: null },
    ])
    expect(csv.split('\r\n')).toEqual([
      '\ufeffitem_code,item_name,unit,expired,defects,count_losses,total,value',
      'CRM,"Cream, fresh",kg,3,0,0,3,6',
      'SUG,Sugar,kg,0,1,2,3,',
      '',
    ])
  })
})
