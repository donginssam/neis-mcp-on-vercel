export type NeisRow = Record<string, string | string[]>

export interface NeisResultInfo {
  CODE: string
  MESSAGE?: string
}

export interface NeisHeadEntry {
  list_total_count?: number
  RESULT?: NeisResultInfo
}

export interface NeisDataset {
  head?: NeisHeadEntry[]
  row?: NeisRow[]
}

export interface NeisApiResponse {
  [key: string]: NeisDataset[] | NeisResultInfo | undefined
  RESULT?: NeisResultInfo
}

export type NeisParams = Record<string, string | number | undefined>
