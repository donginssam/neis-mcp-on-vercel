import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { OFFICE_OF_EDUCATION_CODES } from "./constants.js";
import {
	searchSchools,
	getSchoolMeals,
	getSchoolTimetable,
	getAcademicSchedule,
} from "./tools.js";

// ─── MCP Handler ─────────────────────────────────────────────────────────────

const handler = createMcpHandler((server) => {
	server.registerTool(
		"list_education_office_codes",
		{
			description: "교육청 코드 목록을 확인합니다.",
			inputSchema: {},
		},
		async () => ({
			content: [
				{
					type: "text",
					text: JSON.stringify(OFFICE_OF_EDUCATION_CODES),
				},
			],
		})
	);

	server.registerTool(
		"search_schools",
		{
			description:
				"학교 이름과 (선택적으로) 교육청 코드를 사용해 NEIS에서 학교 기본정보를 검색합니다.",
			inputSchema: {
				school_name: z.string().describe("검색할 학교 이름"),
				region_code: z
					.string()
					.optional()
					.describe("교육청 코드 (선택)"),
				page: z
					.number()
					.int()
					.min(1)
					.default(1)
					.describe("페이지 번호"),
				page_size: z
					.number()
					.int()
					.min(1)
					.max(1000)
					.default(20)
					.describe("페이지당 결과 수"),
			},
		},
		async (params) => {
			const result = await searchSchools(params);
			return {
				content: [{ type: "text", text: JSON.stringify(result) }],
			};
		}
	);

	server.registerTool(
		"get_school_meals",
		{
			description:
				"NEIS 급식 API를 통해 특정 학교의 급식 메뉴를 조회합니다. 날짜는 YYYYMMDD 형식입니다.",
			inputSchema: {
				region_code: z.string().describe("교육청 코드"),
				school_code: z.string().describe("학교 코드"),
				date: z
					.string()
					.optional()
					.describe(
						"특정 일자 (YYYYMMDD). 지정 시 기간 파라미터 무시"
					),
				start_date: z
					.string()
					.optional()
					.describe("시작 일자 (YYYYMMDD)"),
				end_date: z
					.string()
					.optional()
					.describe("종료 일자 (YYYYMMDD)"),
				meal_code: z
					.string()
					.optional()
					.describe("급식 코드: 1(조식), 2(중식), 3(석식)"),
				page: z
					.number()
					.int()
					.min(1)
					.default(1)
					.describe("페이지 번호"),
				page_size: z
					.number()
					.int()
					.min(1)
					.max(1000)
					.default(100)
					.describe("페이지당 결과 수"),
			},
		},
		async (params) => {
			const result = await getSchoolMeals(params);
			return {
				content: [{ type: "text", text: JSON.stringify(result) }],
			};
		}
	);

	server.registerTool(
		"get_school_timetable",
		{
			description:
				"NEIS 시간표 API를 통해 특정 학년/학급의 시간표를 조회합니다. 날짜는 YYYYMMDD 형식입니다.",
			inputSchema: {
				school_level: z
					.enum(["elementary", "middle", "high", "special"])
					.describe(
						"학교 급별: elementary, middle, high, special"
					),
				region_code: z.string().describe("교육청 코드"),
				school_code: z.string().describe("학교 코드"),
				grade: z.string().describe("학년"),
				class_name: z.string().describe("학급명"),
				date: z
					.string()
					.optional()
					.describe(
						"특정 일자 (YYYYMMDD). 지정 시 기간 파라미터 무시"
					),
				start_date: z
					.string()
					.optional()
					.describe("시작 일자 (YYYYMMDD)"),
				end_date: z
					.string()
					.optional()
					.describe("종료 일자 (YYYYMMDD)"),
				page: z
					.number()
					.int()
					.min(1)
					.default(1)
					.describe("페이지 번호"),
				page_size: z
					.number()
					.int()
					.min(1)
					.max(1000)
					.default(100)
					.describe("페이지당 결과 수"),
			},
		},
		async (params) => {
			const result = await getSchoolTimetable(params);
			return {
				content: [{ type: "text", text: JSON.stringify(result) }],
			};
		}
	);

	server.registerTool(
		"get_academic_schedule",
		{
			description:
				"학사일정 API를 통해 학교 행사 및 일정을 조회합니다. 날짜는 YYYYMMDD 형식입니다.",
			inputSchema: {
				region_code: z.string().describe("교육청 코드"),
				school_code: z.string().describe("학교 코드"),
				date: z
					.string()
					.optional()
					.describe(
						"특정 일자 (YYYYMMDD). 지정 시 기간 파라미터 무시"
					),
				start_date: z
					.string()
					.optional()
					.describe("시작 일자 (YYYYMMDD)"),
				end_date: z
					.string()
					.optional()
					.describe("종료 일자 (YYYYMMDD)"),
				page: z
					.number()
					.int()
					.min(1)
					.default(1)
					.describe("페이지 번호"),
				page_size: z
					.number()
					.int()
					.min(1)
					.max(1000)
					.default(100)
					.describe("페이지당 결과 수"),
			},
		},
		async (params) => {
			const result = await getAcademicSchedule(params);
			return {
				content: [{ type: "text", text: JSON.stringify(result) }],
			};
		}
	);
});

export { handler as GET, handler as POST, handler as DELETE };
