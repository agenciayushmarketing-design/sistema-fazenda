// Tema de gráficos (paleta categórica validada p/ superfície clara)
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
export const GRID = '#e1e0d9'
export const AXIS = '#c3c2b7'
export const MUTED_INK = '#898781'
export const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' }

export const axisProps = {
  stroke: AXIS,
  tick: { fill: MUTED_INK, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: AXIS },
} as const

export const tooltipStyle = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid #e1e0d9',
    background: '#fcfcfb',
    padding: '6px 10px',
  },
  labelStyle: { color: '#52514e', fontWeight: 600 },
} as const
