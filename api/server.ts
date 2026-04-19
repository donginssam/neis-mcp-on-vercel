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

const paginationSchema = {
  page: z.number().int().min(1).default(1).describe("페이지 번호"),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe("페이지당 결과 수"),
}

const dateRangeSchema = {
  date: z
    .string()
    .optional()
    .describe("특정 일자 (YYYYMMDD). 지정 시 기간 파라미터 무시"),
  start_date: z.string().optional().describe("시작 일자 (YYYYMMDD)"),
  end_date: z.string().optional().describe("종료 일자 (YYYYMMDD)"),
}

const schoolIdentifierSchema = {
  region_code: z.string().describe("교육청 코드"),
  school_code: z.string().describe("학교 코드"),
}

function responseData(data: unknown[]) {
  return {
    content: data.map(row => ({
      type: "text" as const,
      text: JSON.stringify(row),
    })),
    structuredContent: { items: data },
  }
}

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
          "학교 이름과 (선택적으로) 교육청 코드를 사용해 NEIS에서 학교 기본정보를 검색합니다.",
        inputSchema: {
          school_name: z.string().describe("검색할 학교 이름"),
          region_code: z.string().optional().describe("교육청 코드 (선택)"),
          ...paginationSchema,
          page_size: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .default(20)
            .describe("페이지당 결과 수"),
        },
        outputSchema: {
          items: z
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
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
      },
      async params => responseData(await searchSchools(params)),
    )

    server.registerTool(
      "get_school_meals",
      {
        title: "급식 메뉴 조회",
        description:
          "NEIS 급식 API를 통해 특정 학교의 급식 메뉴를 조회합니다. 날짜는 YYYYMMDD 형식입니다.",
        inputSchema: {
          ...schoolIdentifierSchema,
          ...dateRangeSchema,
          meal_code: z
            .string()
            .optional()
            .describe("급식 코드: 1(조식), 2(중식), 3(석식)"),
          ...paginationSchema,
        },
        outputSchema: {
          items: z
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
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
      },
      async params => responseData(await getSchoolMeals(params)),
    )

    server.registerTool(
      "get_school_timetable",
      {
        title: "시간표 조회",
        description:
          "NEIS 시간표 API를 통해 특정 학년/학급의 시간표를 조회합니다. 날짜는 YYYYMMDD 형식입니다.",
        inputSchema: {
          school_level: z
            .enum(["elementary", "middle", "high", "special"])
            .describe("학교 급별: elementary, middle, high, special"),
          ...schoolIdentifierSchema,
          grade: z.string().describe("학년"),
          class_name: z.string().describe("학급명"),
          ...dateRangeSchema,
          ...paginationSchema,
        },
        outputSchema: {
          items: z
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
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
      },
      async params => responseData(await getSchoolTimetable(params)),
    )

    server.registerTool(
      "get_academic_schedule",
      {
        title: "학사일정 조회",
        description:
          "학사일정 API를 통해 학교 행사 및 일정을 조회합니다. 날짜는 YYYYMMDD 형식입니다.",
        inputSchema: {
          ...schoolIdentifierSchema,
          ...dateRangeSchema,
          ...paginationSchema,
        },
        outputSchema: {
          items: z
            .array(
              z.object({
                date: z.string().describe("일자 (YYYYMMDD)"),
                event_name: z.string().describe("행사명"),
                event_content: z.string().describe("행사 내용"),
              }),
            )
            .describe("학사일정 목록"),
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
      },
      async params => responseData(await getAcademicSchedule(params)),
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
