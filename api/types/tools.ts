// ─── Tool parameter types ─────────────────────────────────────────────────────

export interface SearchSchoolsParams {
	school_name: string;
	region_code?: string;
	page: number;
	page_size: number;
}

export interface GetSchoolMealsParams {
	region_code: string;
	school_code: string;
	date?: string;
	start_date?: string;
	end_date?: string;
	meal_code?: string;
	page: number;
	page_size: number;
}

export interface GetSchoolTimetableParams {
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

export interface GetAcademicScheduleParams {
	region_code: string;
	school_code: string;
	date?: string;
	start_date?: string;
	end_date?: string;
	page: number;
	page_size: number;
}
