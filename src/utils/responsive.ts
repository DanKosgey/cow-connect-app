// Responsive breakpoints
export const breakpoints = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Media query helpers
export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,
};

// Common responsive classes
export const responsiveGridClasses = {
  // For summary cards
  summaryCards: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6",
  
  // For chart sections
  chartSection: "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6",
  
  // For data tables
  dataTable: "grid grid-cols-1 gap-4 md:gap-6",
  
  // For quick actions
  quickActions: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4",
  
  // For form sections
  formSection: "grid grid-cols-1 md:grid-cols-2 gap-4",
  
  // For filter sections
  filterSection: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4",
};

// Responsive text sizes
export const responsiveText = {
  heading1: "text-2xl sm:text-3xl md:text-4xl font-bold",
  heading2: "text-xl sm:text-2xl md:text-3xl font-bold",
  heading3: "text-lg sm:text-xl md:text-2xl font-bold",
  body: "text-sm sm:text-base",
  small: "text-xs sm:text-sm",
};

// Responsive padding and margin
export const responsiveSpacing = {
  sectionPadding: "p-3 sm:p-4 md:p-6",
  cardPadding: "p-3 sm:p-4 md:p-5",
  elementPadding: "p-2 sm:p-3 md:p-4",
  sectionMargin: "m-3 sm:m-4 md:m-6",
  cardMargin: "m-2 sm:m-3 md:m-4",
};

// Responsive button sizes
export const responsiveButtons = {
  primary: "px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base",
  secondary: "px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm",
  icon: "p-1.5 sm:p-2",
};

// Responsive card classes
export const responsiveCards = {
  base: "rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md",
  withHover: "rounded-lg border shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
  compact: "rounded-md border shadow-sm",
};

// Responsive table classes
export const responsiveTables = {
  container: "overflow-x-auto rounded-lg border",
  table: "min-w-full divide-y divide-gray-200",
  header: "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-4 sm:py-3 sm:text-sm",
  cell: "px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm whitespace-nowrap",
};

// Responsive chart containers
export const responsiveCharts = {
  container: "h-64 sm:h-72 md:h-80 w-full",
  smallContainer: "h-48 sm:h-56 md:h-64 w-full",
};