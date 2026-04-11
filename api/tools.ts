import { TIMETABLE_ENDPOINTS } from "./constants.js";
import { neisRequest, trimmer } from "./neis-client.js";
import type { NeisParams } from "./types/neis.js";
import type {
	SearchSchoolsParams,
	GetSchoolMealsParams,
	GetSchoolTimetableParams,
	GetAcademicScheduleParams,
} from "./types/tools.js";

// ─── Tool implementations ─────────────────────────────────────────────────────

export async function searchSchools({
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

export async function getSchoolMeals({
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
		dishes: trimmer(row.DDISH_NM),
		origin_info: trimmer(row.ORPLC_INFO),
		nutrition_info: trimmer(row.NTR_INFO),
		school_name: row.SCHUL_NM,
	}));
}

export async function getSchoolTimetable({
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
		params.ALL_TI_YMD = date;
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
		grade: row.GRADE
	}));
}

export async function getAcademicSchedule({
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
		event_content: row.EVENT_CNTNT
	}));
}