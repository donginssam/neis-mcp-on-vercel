import { NEIS_BASE_URL } from "./constants.js"
import type {
  NeisRow,
  NeisResult,
  NeisResultInfo,
  NeisHeadEntry,
  NeisDataset,
  NeisApiResponse,
  NeisParams,
} from "./types/neis.js"

/**
 * NEIS OpenAPI에 HTTP 요청을 보내고 응답 데이터를 파싱하여 반환합니다.
 * @param endpoint API 엔드포인트 문자열
 * @param params API에 전달할 파라미터 객체
 * @returns NEIS OpenAPI 응답의 결과 행(row) 배열
 */
export async function neisRequest(
  endpoint: string,
  params: NeisParams = {},
): Promise<NeisResult> {
  const apiKey = process.env.NEIS_API_KEY
  if (!apiKey) {
    throw new Error(
      "NEIS OpenAPI 키가 필요합니다. NEIS_API_KEY 환경변수를 설정하세요.",
    )
  }

  const query = new URLSearchParams({ KEY: apiKey, Type: "json" })
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) query.set(k, String(v))
  }

  const url = `${NEIS_BASE_URL}/${endpoint}?${query}`

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error("NEIS OpenAPI가 응답하지 않습니다.")
    }
    throw new Error(
      `NEIS OpenAPI에 연결할 수 없습니다: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!response.ok) {
    throw new Error(
      `NEIS OpenAPI HTTP error ${response.status}: ${response.statusText}`,
    )
  }

  let data: NeisApiResponse
  try {
    data = (await response.json()) as NeisApiResponse
  } catch {
    throw new Error("NEIS OpenAPI 응답을 JSON으로 파싱할 수 없습니다.")
  }

  return extractRows(endpoint, data)
}

/**
 * NEIS OpenAPI 응답 데이터에서 결과 행(row) 데이터만 추출하여 반환합니다.
 * 오류가 포함된 경우 예외를 발생시킵니다.
 * @param endpoint 요청한 API 엔드포인트 문자열
 * @param data NEIS OpenAPI 전체 응답 객체
 * @returns 추출된 행(row) 배열
 */
function extractRows(endpoint: string, data: NeisApiResponse): NeisResult {
  const dataset = data[endpoint] as NeisDataset[] | undefined
  if (!dataset) {
    const result = data.RESULT
    if (result && typeof result === "object") {
      const code = result.CODE ?? "UNKNOWN"
      const message = result.MESSAGE ?? "오류 메시지 없음"
      throw new Error(`NEIS OpenAPI 오류 ${code}: ${message}`)
    }
    throw new Error("NEIS OpenAPI 응답 구조가 예상과 다릅니다.")
  }

  const head = dataset[0]?.head ?? []
  const totalEntry = head.find(e => e != null && "list_total_count" in e)
  const total = totalEntry?.list_total_count ?? 0

  const resultInfo =
    head.find(
      (e): e is NeisHeadEntry & { RESULT: NeisResultInfo } =>
        e != null && "RESULT" in e,
    )?.RESULT ?? null

  if (resultInfo) {
    const { CODE: code, MESSAGE: message = "" } = resultInfo
    if (code === "INFO-000") {
      // success
    } else if (code === "INFO-200") {
      return { rows: [], total: 0 }
    } else {
      const errorMessages: Record<string, string> = {
        "ERROR-290": "인증키가 유효하지 않습니다.",
        "INFO-300": "관리자에 의해 인증키 사용이 제한되었습니다.",
        "ERROR-337": "일별 트래픽 제한을 초과했습니다. 내일 다시 시도하세요.",
        "ERROR-500": "NEIS OpenAPI 서버 오류입니다.",
        "ERROR-600": "NEIS OpenAPI 데이터베이스 오류입니다.",
        "ERROR-601": "NEIS OpenAPI SQL 오류입니다.",
      }
      throw new Error(
        errorMessages[code] ?? `NEIS OpenAPI 오류 ${code}: ${message}`,
      )
    }
  }

  const rows: NeisRow[] = []
  for (const section of dataset) {
    if (Array.isArray(section.row)) rows.push(...section.row)
  }
  return { rows, total }
}
