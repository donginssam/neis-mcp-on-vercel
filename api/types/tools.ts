export interface PaginationParams {
	page: number;
	page_size: number;
}

export interface DateRangeParams {
	date?: string;
	start_date?: string;
	end_date?: string;
}

export interface SearchSchoolsParams extends PaginationParams {
	school_name: string;
	region_code?: string;
}

export interface GetSchoolMealsParams extends PaginationParams, DateRangeParams {
	region_code: string;
	school_code: string;
	meal_code?: string;
}

export interface GetSchoolTimetableParams extends PaginationParams, DateRangeParams {
	school_level: string;
	region_code: string;
	school_code: string;
	grade: string;
	class_name: string;
}

export interface GetAcademicScheduleParams extends PaginationParams, DateRangeParams {
	region_code: string;
	school_code: string;
}
