/**
 * NEIS OpenAPI 응답 데이터의 단일 행(Row)을 나타내는 type
 */
export type NeisRow = Record<string, string | string[]>

/**
 * NEIS OpenAPI 응답의 결과(코드, 메시지) 정보를 담는 interface
 */
export interface NeisResultInfo {
  CODE: string
  MESSAGE?: string
}

/**
 * NEIS OpenAPI 응답의 head 영역 항목을 나타내는 interface
 */
export interface NeisHeadEntry {
  list_total_count?: number
  RESULT?: NeisResultInfo
}

/**
 * NEIS OpenAPI 응답의 전체 데이터 세트(head, row)를 나타내는 interface
 */
export interface NeisDataset {
  head?: NeisHeadEntry[]
  row?: NeisRow[]
}

/**
 * NEIS OpenAPI 최상위 응답 객체를 나타내는 interface
 */
export interface NeisApiResponse {
  [key: string]: NeisDataset[] | NeisResultInfo | undefined
  RESULT?: NeisResultInfo
}

/**
 * NEIS OpenAPI에 전달할 요청 파라미터를 나타내는 type
 */
export type NeisParams = Record<string, string | number | undefined>

/**
 * 내부 로직에서 처리 및 반환할 가공된 NEIS OpenAPI 결과를 나타내는 interface
 */
export interface NeisResult {
  rows: NeisRow[]
  total: number
}
