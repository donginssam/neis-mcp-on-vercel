/**
 * NEIS Open API 기본 URL
 */
export const NEIS_BASE_URL = "https://open.neis.go.kr/hub"

/**
 * 학교 급별 시간표 API 엔드포인트 매핑
 */
export const TIMETABLE_ENDPOINTS: Record<string, string> = {
  elementary: "elsTimetable",
  middle: "misTimetable",
  high: "hisTimetable",
  special: "spsTimetable",
}

/**
 * 시도교육청별 코드 매핑
 */
export const OFFICE_OF_EDUCATION_CODES: Record<string, string> = {
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
  전북특별자치도교육청: "P10",
  전라남도교육청: "Q10",
  경상북도교육청: "R10",
  경상남도교육청: "S10",
  제주특별자치도교육청: "T10",
}
