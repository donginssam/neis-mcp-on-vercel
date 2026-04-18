import { createMcpHandler } from "mcp-handler";
import pkg from "../package.json" with { type: "json" };
import { z } from "zod";
import { OFFICE_OF_EDUCATION_CODES } from "./constants.js";
import {
	searchSchools,
	getSchoolMeals,
	getSchoolTimetable,
	getAcademicSchedule,
} from "./tools.js";

const paginationSchema = {
	page: z.number().int().min(1).default(1).describe("페이지 번호"),
	page_size: z
		.number()
		.int()
		.min(1)
		.max(1000)
		.default(100)
		.describe("페이지당 결과 수"),
};

const dateRangeSchema = {
	date: z
		.string()
		.optional()
		.describe("특정 일자 (YYYYMMDD). 지정 시 기간 파라미터 무시"),
	start_date: z.string().optional().describe("시작 일자 (YYYYMMDD)"),
	end_date: z.string().optional().describe("종료 일자 (YYYYMMDD)"),
};

const schoolIdentifierSchema = {
	region_code: z.string().describe("교육청 코드"),
	school_code: z.string().describe("학교 코드"),
};

function jsonContent(data: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

const handler = createMcpHandler((server) => {
	server.registerTool(
		"list_education_office_codes",
		{
			title: "교육청 코드 목록 나열",
			description: "교육청 코드 목록을 확인합니다.",
			inputSchema: {},
			annotations: {
				readOnlyHint: true,
				destructiveHint: false
			}
		},
		async () => jsonContent(OFFICE_OF_EDUCATION_CODES)
	);

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
			annotations: {
				readOnlyHint: true,
				destructiveHint: false
			}
		},
		async (params) => jsonContent(await searchSchools(params))
	);

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
			annotations: {
				readOnlyHint: true,
				destructiveHint: false
			}
		},
		async (params) => jsonContent(await getSchoolMeals(params))
	);

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
			annotations: {
				readOnlyHint: true,
				destructiveHint: false
			}
		},
		async (params) => jsonContent(await getSchoolTimetable(params))
	);

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
			annotations: {
				readOnlyHint: true,
				destructiveHint: false
			}
		},
		async (params) => jsonContent(await getAcademicSchedule(params))
	);
}, {
	serverInfo: {
		name: "NEIS MCP",
		version: pkg.version
	}
});

export { handler as GET, handler as POST };
