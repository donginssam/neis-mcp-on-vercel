import { TIMETABLE_ENDPOINTS } from "./constants.js"
import { neisRequest } from "./neis-client.js"
import type { NeisParams } from "./types/neis.js"
import type { DateRangeParams, PaginationParams } from "./types/tools.js"
import type {
  SearchSchoolsParams,
  GetSchoolMealsParams,
  GetSchoolTimetableParams,
  GetAcademicScheduleParams,
  DayTimetable,
} from "./types/tools.js"

/**
 * 페이징 파라미터를 NEIS API 파라미터 형식으로 변환합니다.
 * @param params 페이징 파라미터 (page, page_size)
 * @returns NEIS API 형식의 페이징 파라미터 객체
 */
function buildPaginationParams({
  page,
  page_size,
}: PaginationParams): NeisParams {
  return { pIndex: page, pSize: page_size }
}

/**
 * 날짜 파라미터를 NEIS API 파라미터 형식으로 변환합니다.
 * @param params 날짜 범위 파라미터 (date, start_date, end_date)
 * @param keys 변환할 NEIS API의 키 매핑 (exact, from, to)
 * @returns NEIS API 형식의 날짜 파라미터 객체
 */
function buildDateParams(
  { date, start_date, end_date }: DateRangeParams,
  keys: { exact: string; from: string; to: string },
): NeisParams {
  if (date) return { [keys.exact]: date }
  return {
    ...(start_date && { [keys.from]: start_date }),
    ...(end_date && { [keys.to]: end_date }),
  }
}

/**
 * 학교명과 (선택적으로) 교육청 코드를 사용하여 학교 기본정보를 검색합니다.
 * @param params 검색 파라미터 (학교명, 교육청 코드, 페이징 정보)
 * @returns 검색된 학교 정보 목록
 */
export async function searchSchools({
  school_name,
  region_code,
  ...pagination
}: SearchSchoolsParams) {
  const rows = await neisRequest("schoolInfo", {
    SCHUL_NM: school_name,
    ATPT_OFCDC_SC_CODE: region_code,
    ...buildPaginationParams(pagination),
  })
  return rows.map(row => ({
    education_office_code: row.ATPT_OFCDC_SC_CODE,
    education_office_name: row.ATPT_OFCDC_SC_NM,
    school_code: row.SD_SCHUL_CODE,
    school_name: row.SCHUL_NM,
    english_name: row.ENG_SCHUL_NM,
    school_type: row.SCHUL_KND_SC_NM,
    region_name: row.LCTN_SC_NM,
    foundation: row.FOND_SC_NM,
    coeducation: row.COEDU_SC_NM,
    address: row.ORG_RDNMA,
    address_detail: row.ORG_RDNDA ?? row.ORG_RDNMA,
    postal_code: row.ORG_RDNZC,
    telephone: row.ORG_TELNO,
    fax: row.ORG_FAXNO,
    homepage: row.HMPG_ADRES,
    established_date: row.FOND_YMD,
  }))
}

/**
 * 특정 학교의 급식 메뉴를 조회합니다.
 * @param params 조회 파라미터 (교육청/학교/급식 코드, 조회 일자/기간 등)
 * @returns 급식 메뉴 정보 목록
 */
export async function getSchoolMeals({
  region_code,
  school_code,
  meal_code,
  date,
  start_date,
  end_date,
  ...pagination
}: GetSchoolMealsParams) {
  const rows = await neisRequest("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: region_code,
    SD_SCHUL_CODE: school_code,
    MMEAL_SC_CODE: meal_code,
    ...buildDateParams(
      { date, start_date, end_date },
      { exact: "MLSV_YMD", from: "MLSV_FROM_YMD", to: "MLSV_TO_YMD" },
    ),
    ...buildPaginationParams(pagination),
  })
  return rows.map(row => ({
    date: row.MLSV_YMD,
    meal_code: row.MMEAL_SC_CODE,
    meal_name: row.MMEAL_SC_NM,
    calories: row.CAL_INFO,
    dishes: trimmer(row.DDISH_NM),
    origin_info: trimmer(row.ORPLC_INFO),
    nutrition_info: trimmer(row.NTR_INFO),
    school_name: row.SCHUL_NM,
  }))
}

/**
 * 특정 학년/학급의 시간표를 조회합니다.
 * @param params 조회 파라미터 (학교 급별, 교육청/학교 코드, 학년/반, 조회 일자/기간 등)
 * @returns 일자별로 그룹화된 시간표 목록
 */
export async function getSchoolTimetable({
  school_level,
  region_code,
  school_code,
  grade,
  class_name,
  date,
  start_date,
  end_date,
  ...pagination
}: GetSchoolTimetableParams) {
  const endpoint = TIMETABLE_ENDPOINTS[school_level.toLowerCase()]
  if (!endpoint) {
    throw new Error(
      `Unsupported school_level '${school_level}'. Use one of: ${Object.keys(TIMETABLE_ENDPOINTS).sort().join(", ")}.`,
    )
  }

  const rows = await neisRequest(endpoint, {
    ATPT_OFCDC_SC_CODE: region_code,
    SD_SCHUL_CODE: school_code,
    GRADE: grade,
    CLASS_NM: class_name,
    ...buildDateParams(
      { date, start_date, end_date },
      { exact: "ALL_TI_YMD", from: "TI_FROM_YMD", to: "TI_TO_YMD" },
    ),
    ...buildPaginationParams(pagination),
  })
  const grouped = new Map<string, DayTimetable>()

  for (const row of rows) {
    if (row.ITRT_CNTNT == null) continue

    const date = row.ALL_TI_YMD as string
    const day = grouped.get(date) ?? {
      date,
      assembly_name: row.CLASS_NM as string,
      grade: row.GRADE as string,
      periods: [],
    }
    day.periods.push({
      period: row.PERIO as string,
      subject_name: row.ITRT_CNTNT as string,
    })
    grouped.set(date, day)
  }

  return Array.from(grouped.values())
}

/**
 * 학교의 학사일정을 조회합니다.
 * @param params 조회 파라미터 (교육청/학교 코드, 조회 일자/기간 등)
 * @returns 학사일정 정보 목록
 */
export async function getAcademicSchedule({
  region_code,
  school_code,
  date,
  start_date,
  end_date,
  ...pagination
}: GetAcademicScheduleParams) {
  const rows = await neisRequest("SchoolSchedule", {
    ATPT_OFCDC_SC_CODE: region_code,
    SD_SCHUL_CODE: school_code,
    ...buildDateParams(
      { date, start_date, end_date },
      { exact: "AA_YMD", from: "AA_FROM_YMD", to: "AA_TO_YMD" },
    ),
    ...buildPaginationParams(pagination),
  })
  return rows.map(row => ({
    date: row.AA_YMD,
    event_name: row.EVENT_NM,
    event_content: row.EVENT_CNTNT,
  }))
}

/**
 * 문자열 또는 배열 내의 구분자(<br/>, \n 등)를 기준으로 문자열을 분리하고 공백을 제거합니다.
 * @param raw 원본 문자열 또는 배열
 * @returns 정리된 문자열 배열
 */
function trimmer(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  const parts = Array.isArray(raw) ? raw : [raw]
  return parts
    .flatMap(p => p.split(/<br\s*\/?>|\\n|\n/i))
    .map(p => p.trim())
    .filter(Boolean)
}
