import { createMcpHandler } from "mcp-handler"
import pkg from "../package.json" with { type: "json" }
import { z } from "zod"
import { OFFICE_OF_EDUCATION_CODES } from "./constants.js"
import {
  searchSchools,
  getSchoolMeals,
  getSchoolTimetable,
  getAcademicSchedule,
} from "./tools.js"

/**
 * 페이지네이션 입력 파라미터 공통 스키마를 생성합니다.
 * @param defaultPageSize 기본 페이지당 결과 수 (기본값: 100)
 * @returns Zod 스키마 구조 객체
 */
const createPaginationSchema = (defaultPageSize = 100) => ({
  page: z.number().int().min(1).default(1).describe("페이지 번호"),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(defaultPageSize)
    .describe("페이지당 결과 수"),
})

/**
 * 날짜 검색 입력 파라미터 공통 스키마입니다.
 */
const dateRangeSchema = {
  date: z
    .string()
    .regex(/^\d{8}$/)
    .optional()
    .describe("특정 일자 (YYYYMMDD). 지정 시 기간 파라미터 무시. 예: 20260301"),
  start_date: z
    .string()
    .regex(/^\d{8}$/)
    .optional()
    .describe("시작 일자 (YYYYMMDD). 예: 20260301"),
  end_date: z
    .string()
    .regex(/^\d{8}$/)
    .optional()
    .describe("종료 일자 (YYYYMMDD). 예: 20260331"),
}

/**
 * 학교 식별자(교육청 코드, 학교 코드) 입력 파라미터 공통 스키마입니다.
 */
const schoolIdentifierSchema = {
  education_office_code: z
    .string()
    .describe(
      "교육청 코드. 코드 목록은 list_education_office_codes 리소스를 참조하세요.",
    ),
  school_code: z.string().describe("학교 코드"),
}

/**
 * 페이징 및 잘림 여부(메타데이터)를 포함한 공통 출력 스키마를 생성합니다.
 * @param resultSchema 결과 데이터 배열에 대한 Zod 스키마
 * @returns 공통 속성이 포함된 출력 스키마 객체
 */
function createOutputSchema(resultSchema: z.ZodTypeAny) {
  return {
    result: resultSchema,
    count: z.number().describe("현재 페이지 항목 수"),
    total: z.number().describe("전체 결과 수"),
    truncated: z.boolean().describe("응답이 잘렸는지 여부"),
  }
}

/**
 * LLM 에이전트의 컨텍스트 윈도우 한도를 넘지 않기 위해 응답 텍스트를 자르는 기준 글자 수
 */
const CHARACTER_LIMIT = 25_000

/**
 * MCP Tool 요청을 처리하는 공통 래퍼 함수입니다.
 * 데이터 패칭, 글자 수 제한 검사, 에러 핸들링, 응답 포맷팅을 공통으로 수행합니다.
 * @param fetcher 실제 데이터를 가져오는 비동기 함수
 * @returns MCP Tool 핸들러 (async (params) => {...})
 */
function createToolHandler<T>(
  fetcher: (params: T) => Promise<{ data: unknown[]; total: number }>,
) {
  return async (params: T) => {
    try {
      const { data, total } = await fetcher(params)
      const full = JSON.stringify(data, null, 2)
      const truncated = full.length > CHARACTER_LIMIT
      const text = truncated
        ? full.slice(0, CHARACTER_LIMIT) +
          `\n\n...(응답이 ${CHARACTER_LIMIT.toLocaleString()}자를 초과하여 잘렸습니다. page_size 또는 날짜 범위를 줄여 재시도하세요.)`
        : full
      return {
        content: [{ type: "text" as const, text }],
        structuredContent: {
          result: data,
          count: data.length,
          total,
          truncated,
        },
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: error instanceof Error ? error.message : String(error),
          },
        ],
      }
    }
  }
}

/**
 * Vercel Serverless Function
 */
const handler = createMcpHandler(
  server => {
    server.registerResource(
      "list_education_office_codes",
      "neis://education-office-codes",
      {
        title: "교육청 코드 목록",
        description: "교육청 코드 목록입니다.",
        mimeType: "application/json",
      },
      async () => ({
        contents: [
          {
            uri: "neis://education-office-codes",
            text: JSON.stringify(OFFICE_OF_EDUCATION_CODES),
            mimeType: "application/json",
          },
        ],
      }),
    )

    server.registerTool(
      "search_schools",
      {
        title: "학교 찾기",
        description:
          "학교 이름으로 NEIS OpenAPI에서 학교를 검색하고 학교 코드와 교육청 코드를 반환합니다.\n" +
          "get_school_meals, get_school_timetable, get_academic_schedule 호출 전에 반드시 이 tool로 school_code를 먼저 조회하세요.\n" +
          "동명이교가 있을 수 있으므로 education_office_code로 시도를 좁히거나 school_type을 확인해 올바른 학교를 선택하세요.",
        inputSchema: z
          .object({
            school_name: z.string().describe("검색할 학교 이름"),
            education_office_code: z
              .string()
              .optional()
              .describe(
                "교육청 코드 (선택). 코드 목록은 list_education_office_codes 리소스를 참조하세요.",
              ),
            ...createPaginationSchema(20),
          })
          .strict(),
        outputSchema: createOutputSchema(
          z
            .array(
              z.object({
                education_office_code: z.string().describe("교육청 코드"),
                education_office_name: z.string().describe("교육청 이름"),
                school_code: z.string().describe("학교 코드"),
                school_name: z.string().describe("학교 이름"),
                english_name: z.string().describe("학교 영문 이름"),
                school_type: z.string().describe("학교 유형"),
                region_name: z.string().describe("지역 이름"),
                foundation: z.string().describe("설립 구분"),
                coeducation: z.string().describe("남녀공학 구분"),
                address: z.string().describe("주소"),
                address_detail: z.string().describe("상세 주소"),
                postal_code: z.string().describe("우편번호"),
                telephone: z.string().describe("전화번호"),
                fax: z.string().describe("팩스번호"),
                homepage: z.string().describe("홈페이지"),
                established_date: z.string().describe("설립일자"),
              }),
            )
            .describe("학교 목록"),
        ),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      createToolHandler(searchSchools),
    )

    server.registerTool(
      "get_school_meals",
      {
        title: "급식 메뉴 조회",
        description:
          "특정 학교의 급식 메뉴(요리명, 칼로리, 원산지, 영양소)를 조회합니다.\n" +
          "school_code와 education_office_code는 search_schools로 먼저 조회하세요.\n" +
          "날짜를 지정하지 않으면 오늘 날짜 기준으로 조회됩니다.\n" +
          "meal_code를 생략하면 당일 전체 급식(조·중·석식)이 반환됩니다.",
        inputSchema: z
          .object({
            ...schoolIdentifierSchema,
            ...dateRangeSchema,
            meal_code: z
              .enum(["1", "2", "3"])
              .optional()
              .describe("급식 코드: 1(조식), 2(중식), 3(석식)"),
            ...createPaginationSchema(),
          })
          .strict(),
        outputSchema: createOutputSchema(
          z
            .array(
              z.object({
                date: z.string().describe("급식 일자 (YYYYMMDD)"),
                meal_code: z.string().describe("급식 코드"),
                meal_name: z.string().describe("급식명"),
                calories: z.string().describe("칼로리"),
                dishes: z.array(z.string()).describe("요리명 목록"),
                origin_info: z.array(z.string()).describe("원산지 정보 목록"),
                nutrition_info: z
                  .array(z.string())
                  .describe("영양소 정보 목록"),
                school_name: z.string().describe("학교명"),
              }),
            )
            .describe("급식 목록"),
        ),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      createToolHandler(getSchoolMeals),
    )

    server.registerTool(
      "get_school_timetable",
      {
        title: "시간표 조회",
        description:
          "특정 학년·학급의 시간표를 일별로 묶어 반환합니다.\n" +
          "school_code와 education_office_code는 search_schools로 먼저 조회하세요.\n" +
          "school_level은 학교 유형에 따라 elementary(초), middle(중), high(고), special(특수)을 선택하세요.\n" +
          "grade는 숫자 문자열(예: '1'), class_name은 학급명(예: '1')을 사용합니다.",
        inputSchema: z
          .object({
            school_level: z
              .enum(["elementary", "middle", "high", "special"])
              .describe("학교 급별: elementary, middle, high, special"),
            ...schoolIdentifierSchema,
            grade: z.string().describe("학년"),
            class_name: z.string().describe("학급명"),
            ...dateRangeSchema,
            ...createPaginationSchema(),
          })
          .strict(),
        outputSchema: createOutputSchema(
          z
            .array(
              z.object({
                date: z.string().describe("날짜 (YYYYMMDD)"),
                assembly_name: z.string().describe("학급명"),
                grade: z.string().describe("학년"),
                periods: z
                  .array(
                    z.object({
                      period: z.string().describe("교시"),
                      subject_name: z.string().describe("과목명"),
                    }),
                  )
                  .describe("교시 목록"),
              }),
            )
            .describe("시간표 목록"),
        ),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      createToolHandler(getSchoolTimetable),
    )

    server.registerTool(
      "get_academic_schedule",
      {
        title: "학사일정 조회",
        description:
          "학교의 학사일정(시험, 방학, 행사 등)을 조회합니다.\n" +
          "school_code와 education_office_code는 search_schools로 먼저 조회하세요.\n" +
          "start_date~end_date로 학기 전체를 조회하거나, date로 특정 날의 일정만 조회할 수 있습니다.",
        inputSchema: z
          .object({
            ...schoolIdentifierSchema,
            ...dateRangeSchema,
            ...createPaginationSchema(),
          })
          .strict(),
        outputSchema: createOutputSchema(
          z
            .array(
              z.object({
                date: z.string().describe("일자 (YYYYMMDD)"),
                event_name: z.string().describe("행사명"),
                event_content: z.string().describe("행사 내용"),
              }),
            )
            .describe("학사일정 목록"),
        ),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      createToolHandler(getAcademicSchedule),
    )
  },
  {
    serverInfo: {
      name: "NEIS MCP",
      version: pkg.version,
    },
  },
)

export { handler as GET, handler as POST }
