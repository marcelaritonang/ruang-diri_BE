export interface IPagination {
  totalData: number;
  totalPage: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
