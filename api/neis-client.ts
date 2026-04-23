import { NEIS_BASE_URL } from "./constants.js"
import type {
  NeisRow,
  NeisResultInfo,
  NeisHeadEntry,
  NeisDataset,
  NeisApiResponse,
  NeisParams,
} from "./types/neis.js"

/**
 * NEIS API에 HTTP 요청을 보내고 응답 데이터를 파싱하여 반환합니다.
 * @param endpoint API 엔드포인트 문자열
 * @param params API에 전달할 파라미터 객체
 * @returns NEIS API 응답의 결과 행(row) 배열
 */
export async function neisRequest(
  endpoint: string,
  params: NeisParams = {},
): Promise<NeisRow[]> {
  const apiKey = process.env.NEIS_API_KEY
  if (!apiKey) {
    throw new Error(
      "NEIS API key is required. Set the NEIS_API_KEY environment variable.",
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
    throw new Error(
      `Failed to reach NEIS API: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!response.ok) {
    throw new Error(
      `NEIS API HTTP error ${response.status}: ${response.statusText}`,
    )
  }

  let data: NeisApiResponse
  try {
    data = (await response.json()) as NeisApiResponse
  } catch {
    throw new Error("Failed to parse NEIS API response as JSON.")
  }

  return extractRows(endpoint, data)
}

/**
 * NEIS API 응답 데이터에서 결과 행(row) 데이터만 추출하여 반환합니다.
 * 오류가 포함된 경우 예외를 발생시킵니다.
 * @param endpoint 요청한 API 엔드포인트 문자열
 * @param data NEIS API 전체 응답 객체
 * @returns 추출된 행(row) 배열
 */
function extractRows(endpoint: string, data: NeisApiResponse): NeisRow[] {
  const dataset = data[endpoint] as NeisDataset[] | undefined
  if (!dataset) {
    const result = data.RESULT
    if (result && typeof result === "object") {
      const code = result.CODE ?? "UNKNOWN"
      const message = result.MESSAGE ?? "No message provided."
      throw new Error(`NEIS API error ${code}: ${message}`)
    }
    throw new Error("NEIS API returned an unexpected response structure.")
  }

  const head = dataset[0]?.head ?? []
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
      return []
    } else {
      throw new Error(`NEIS API error ${code}: ${message}`)
    }
  }

  const rows: NeisRow[] = []
  for (const section of dataset) {
    if (Array.isArray(section.row)) rows.push(...section.row)
  }
  return rows
}
