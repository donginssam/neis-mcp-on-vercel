import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import type {
	NeisRow,
	NeisResultInfo,
	NeisHeadEntry,
	NeisDataset,
	NeisApiResponse,
	NeisParams,
} from "./types/neis.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const NEIS_BASE_URL = "https://open.neis.go.kr/hub";

const TIMETABLE_ENDPOINTS: Record<string, string> = {
	elementary: "elsTimetable",
	middle: "misTimetable",
	high: "hisTimetable",
	special: "spsTimetable",
};

const OFFICE_OF_EDUCATION_CODES: Record<string, string> = {
	서울특별시교육청: "B10",
	부산광역시교육청: "C10",
	대구광역시교육청: "D10",
	인천광역시교육청: "E10",
	광주광역시교육청: "F10",
	대전광역시교육청: "G10",
	울산광역시교육청: "H10",
	세종특별자치시교육청: "I10",
	경기도교육청: "J10",
	강원특별자치도교육청: "K10",
	충청북도교육청: "M10",
	충청남도교육청: "N10",
	전라북도교육청: "P10",
	전라남도교육청: "Q10",
	경상북도교육청: "R10",
	경상남도교육청: "S10",
	제주특별자치도교육청: "T10",
};

// ─── NEIS API Client ──────────────────────────────────────────────────────────

async function neisRequest(
	endpoint: string,
	params: NeisParams = {}
): Promise<NeisRow[]> {
	const apiKey = process.env.NEIS_API_KEY;
	if (!apiKey) {
		throw new Error(
			"NEIS API key is required. Set the NEIS_API_KEY environment variable."
		);
	}

	const query = new URLSearchParams({ KEY: apiKey, Type: "json" });
	for (const [k, v] of Object.entries(params)) {
		if (v !== null && v !== undefined) query.set(k, String(v));
	}

	const url = `${NEIS_BASE_URL}/${endpoint}?${query}`;

	let response: Response;
	try {
		response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	} catch (err) {
		throw new Error(
			`Failed to reach NEIS API: ${err instanceof Error ? err.message : String(err)}`
		);
	}

	if (!response.ok) {
		throw new Error(
			`NEIS API HTTP error ${response.status}: ${response.statusText}`
		);
	}

	let data: NeisApiResponse;
	try {
		data = (await response.json()) as NeisApiResponse;
	} catch {
		throw new Error("Failed to parse NEIS API response as JSON.");
	}

	return extractRows(endpoint, data);
}

function extractRows(endpoint: string, data: NeisApiResponse): NeisRow[] {
	const dataset = data[endpoint] as NeisDataset[] | undefined;
	if (!dataset) {
		const result = data.RESULT;
		if (result && typeof result === "object") {
			const code = result.CODE ?? "UNKNOWN";
			const message = result.MESSAGE ?? "No message provided.";
			throw new Error(`NEIS API error ${code}: ${message}`);
		}
		throw new Error("NEIS API returned an unexpected response structure.");
	}

	const head = dataset[0]?.head ?? [];
	const resultInfo =
		head.find(
			(e): e is NeisHeadEntry & { RESULT: NeisResultInfo } =>
				e != null && "RESULT" in e
		)?.RESULT ?? null;

	if (resultInfo) {
		const { CODE: code, MESSAGE: message = "" } = resultInfo;
		if (code === "INFO-000") {
			// success
		} else if (code === "INFO-200") {
			return [];
		} else {
			throw new Error(`NEIS API error ${code}: ${message}`);
		}
	}

	const rows: NeisRow[] = [];
	for (const section of dataset) {
		if (Array.isArray(section.row)) rows.push(...section.row);
	}
	return rows;
}

function parseDishes(raw: string | undefined): string[] {
	if (!raw) return [];
	const separators = ["<br/>", "<br>", "\\n", "\n"];
	let parts = [raw];
	for (const sep of separators) {
		parts = parts.flatMap((p) => p.split(sep));
	}
	return parts.map((p) => p.trim()).filter(Boolean);
}

// ─── Tool parameter types ─────────────────────────────────────────────────────

interface SearchSchoolsParams {
	school_name: string;
	region_code?: string;
	page: number;
	page_size: number;
}

interface GetSchoolMealsParams {
	region_code: string;
	school_code: string;
	date?: string;
	start_date?: string;
	end_date?: string;
	meal_code?: string;
	page: number;
	page_size: number;
}

interface GetSchoolTimetableParams {
	school_level: string;
	region_code: string;
	school_code: string;
	grade: string;
	class_name: string;
	date?: string;
	start_date?: string;
	end_date?: string;
	page: number;
	page_size: number;
}

interface GetAcademicScheduleParams {
	region_code: string;
	school_code: string;
	date?: string;
	start_date?: string;
	end_date?: string;
	page: number;
	page_size: number;
}

// ─── Tool implementations ─────────────────────────────────────────────────────

async function searchSchools({
	school_name,
	region_code,
	page,
	page_size,
}: SearchSchoolsParams) {
	const rows = await neisRequest("schoolInfo", {
		SCHUL_NM: school_name,
		ATPT_OFCDC_SC_CODE: region_code,
		pIndex: page,
		pSize: page_size,
	});
	return rows.map((row) => ({
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
		postal_code: row.ORG_RDNZIP ?? row.ORG_ZIPNO ?? row.ORG_ZIP_CODE,
		telephone: row.ORG_TELNO,
		fax: row.ORG_FAXNO,
		homepage: row.HMPG_ADRES,
		established_date: row.FOND_YMD,
	}));
}

async function getSchoolMeals({
	region_code,
	school_code,
	date,
	start_date,
	end_date,
	meal_code,
	page,
	page_size,
}: GetSchoolMealsParams) {
	const params: NeisParams = {
		ATPT_OFCDC_SC_CODE: region_code,
		SD_SCHUL_CODE: school_code,
		MMEAL_SC_CODE: meal_code,
		pIndex: page,
		pSize: page_size,
	};
	if (date) {
		params.MLSV_YMD = date;
	} else {
		if (start_date) params.MLSV_FROM_YMD = start_date;
		if (end_date) params.MLSV_TO_YMD = end_date;
	}

	const rows = await neisRequest("mealServiceDietInfo", params);
	return rows.map((row) => ({
		date: row.MLSV_YMD,
		meal_code: row.MMEAL_SC_CODE,
		meal_name: row.MMEAL_SC_NM,
		calories: row.CAL_INFO,
		dishes: parseDishes(row.DDISH_NM),
		origin_info: row.ORPLC_INFO,
		nutrition_info: row.NTR_INFO,
		school_name: row.SCHUL_NM,
	}));
}

async function getSchoolTimetable({
	school_level,
	region_code,
	school_code,
	grade,
	class_name,
	date,
	start_date,
	end_date,
	page,
	page_size,
}: GetSchoolTimetableParams) {
	const endpoint = TIMETABLE_ENDPOINTS[school_level.toLowerCase()];
	if (!endpoint) {
		throw new Error(
			`Unsupported school_level '${school_level}'. Use one of: ${Object.keys(TIMETABLE_ENDPOINTS).sort().join(", ")}.`
		);
	}

	const params: NeisParams = {
		ATPT_OFCDC_SC_CODE: region_code,
		SD_SCHUL_CODE: school_code,
		GRADE: grade,
		CLASS_NM: class_name,
		pIndex: page,
		pSize: page_size,
	};
	if (date) {
		params.TI_YMD = date;
	} else {
		if (start_date) params.TI_FROM_YMD = start_date;
		if (end_date) params.TI_TO_YMD = end_date;
	}

	const rows = await neisRequest(endpoint, params);
	return rows.map((row) => ({
		date: row.ALL_TI_YMD,
		period: row.PERIO,
		subject_name: row.ITRT_CNTNT,
		assembly_name: row.CLASS_NM,
		grade: row.GRADE,
		teacher: row.TEA_NM,
	}));
}

async function getAcademicSchedule({
	region_code,
	school_code,
	date,
	start_date,
	end_date,
	page,
	page_size,
}: GetAcademicScheduleParams) {
	const params: NeisParams = {
		ATPT_OFCDC_SC_CODE: region_code,
		SD_SCHUL_CODE: school_code,
		pIndex: page,
		pSize: page_size,
	};
	if (date) {
		params.AA_YMD = date;
	} else {
		if (start_date) params.AA_FROM_YMD = start_date;
		if (end_date) params.AA_TO_YMD = end_date;
	}

	const rows = await neisRequest("SchoolSchedule", params);
	return rows.map((row) => ({
		date: row.AA_YMD,
		event_name: row.EVENT_NM,
		event_content: row.EVENT_CNTNT,
		grade: row.GRADE,
		assembly_name: row.CLASS_NM,
		event_type: row.EVENT_NM,
	}));
}

// ─── MCP Handler ─────────────────────────────────────────────────────────────
const handler = createMcpHandler(
	(server) => {
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
	}
);

export { handler as GET, handler as POST };