export const orderStatuses = {
  submitted: { label: '待确认', tone: 'neutral' },
  reviewing: { label: '模型审核中', tone: 'blue' },
  quoted: { label: '待确认报价', tone: 'amber' },
  printing: { label: '打印中', tone: 'green' },
  finished: { label: '待取件', tone: 'green' },
  picked_up: { label: '已取件', tone: 'neutral' },
  cancelled: { label: '已取消', tone: 'neutral' },
}

export const statusSequence = ['submitted', 'reviewing', 'quoted', 'printing', 'finished', 'picked_up']
