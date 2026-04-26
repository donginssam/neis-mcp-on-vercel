/**
 * 페이징을 위한 입력 파라미터 interface
 */
export interface PaginationParams {
  page: number
  page_size: number
}

/**
 * 날짜 범위를 지정하기 위한 입력 파라미터 interface
 */
export interface DateRangeParams {
  date?: string
  start_date?: string
  end_date?: string
}

/**
 * 학교 검색 시 사용되는 입력 파라미터 interface
 */
export interface SearchSchoolsParams extends PaginationParams {
  school_name: string
  education_office_code?: string
}

/**
 * 특정 학교의 급식 메뉴를 조회할 때 사용되는 입력 파라미터 interface
 */
export interface GetSchoolMealsParams
  extends PaginationParams, DateRangeParams {
  education_office_code: string
  school_code: string
  meal_code?: string
}

/**
 * 시간표를 조회할 때 사용되는 입력 파라미터 interface
 */
export interface GetSchoolTimetableParams
  extends PaginationParams, DateRangeParams {
  school_level: string
  education_office_code: string
  school_code: string
  grade: string
  class_name: string
}

/**
 * 학사일정을 조회할 때 사용되는 입력 파라미터 interface
 */
export interface GetAcademicScheduleParams
  extends PaginationParams, DateRangeParams {
  education_office_code: string
  school_code: string
}

/**
 * 일별 시간표 데이터를 나타내는 interface
 */
export interface DayTimetable {
  date: string
  assembly_name: string
  grade: string
  periods: { period: string; subject_name: string }[]
}
