export const CASE_STATUSES = ["open", "in_review", "closed"] as const;
export const FILING_STATUSES = ["draft", "submitted", "amended", "closed"] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];
export type FilingStatus = (typeof FILING_STATUSES)[number];

export interface CaseJson {
  id: number;
  title: string;
  status: string;
}

export interface FilingJson {
  id: number;
  caseId: number;
  title: string;
  status: string;
}

export interface CaseExport {
  case: CaseJson;
  filings: FilingJson[];
  generatedAt: string;
}

export interface WorkloadRow {
  examinerId: string;
  filingCount: number;
}

export interface WorkloadReport {
  examiners: WorkloadRow[];
}

export interface CaseListQuery {
  status?: string;
  title?: string;
}

export function isCaseStatus(value: string): value is CaseStatus {
  return (CASE_STATUSES as readonly string[]).includes(value);
}

export function isFilingStatus(value: string): value is FilingStatus {
  return (FILING_STATUSES as readonly string[]).includes(value);
}

declare global {
  namespace Express {
    interface Request {
      // Set by auth middleware after the bearer token is verified.
      examinerId: string;
    }
  }
}

export {};
