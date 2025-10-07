// Utility functions for pagination

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Paginate an array of data
 * @param data - Array of data to paginate
 * @param page - Current page (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated data with metadata
 */
export function paginateArray<T>(data: T[], page: number = 1, pageSize: number = 10): PaginatedResponse<T> {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: paginatedData,
    totalCount,
    page,
    pageSize,
    totalPages
  };
}

/**
 * Apply pagination to Supabase query
 * @param query - Supabase query builder
 * @param options - Pagination options
 * @returns Query with pagination applied
 */
export function applyPaginationToQuery(query: any, options: PaginationOptions) {
  const { page = 1, pageSize = 10, sortBy, sortOrder = 'desc' } = options;
  
  let paginatedQuery = query
    .range((page - 1) * pageSize, page * pageSize - 1);
  
  if (sortBy) {
    paginatedQuery = paginatedQuery.order(sortBy, { ascending: sortOrder === 'asc' });
  } else {
    // Default sorting
    paginatedQuery = paginatedQuery.order('created_at', { ascending: false });
  }
  
  return paginatedQuery;
}

/**
 * Get pagination parameters from URL search params
 * @param searchParams - URL search parameters
 * @returns Pagination options
 */
export function getPaginationFromSearchParams(searchParams: URLSearchParams): PaginationOptions {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;
  
  return {
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? 10 : pageSize,
    sortBy,
    sortOrder
  };
}

/**
 * Create URL search params for pagination
 * @param options - Pagination options
 * @returns URL search params string
 */
export function createPaginationSearchParams(options: PaginationOptions): string {
  const params = new URLSearchParams();
  
  if (options.page && options.page > 1) {
    params.set('page', options.page.toString());
  }
  
  if (options.pageSize && options.pageSize !== 10) {
    params.set('pageSize', options.pageSize.toString());
  }
  
  if (options.sortBy) {
    params.set('sortBy', options.sortBy);
  }
  
  if (options.sortOrder) {
    params.set('sortOrder', options.sortOrder);
  }
  
  return params.toString();
}