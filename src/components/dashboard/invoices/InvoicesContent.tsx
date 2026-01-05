"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useHttp } from "@/hooks/useHttp";
import { useDebounce } from "@/hooks/useDebounce";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { invoicesActions } from "@/store/redux/invoices/invoices-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { InvoiceHeader } from "@/components/dashboard/invoices/InvoiceHeader";
import { InvoiceTabs } from "@/components/dashboard/invoices/InvoiceTabs";
import { InvoiceStats } from "@/components/dashboard/invoices/InvoiceStats";
import { InvoiceFilters } from "@/components/dashboard/invoices/InvoiceFilters";
import { InvoiceList } from "@/components/dashboard/invoices/InvoiceList";
import { InvoiceSummaryTab } from "@/components/dashboard/invoices/InvoiceSummaryTab";
import { InvoiceFormModal } from "@/components/dashboard/invoices/InvoiceFormModal";
import { SortField, SortOrderType, StatusFilter } from "@/components/dashboard/invoices/utils";
import { InvoiceStatus } from "@/components/dashboard/invoices/statusUtils";
import { InvoiceSortField, SortOrder, InvoiceTabType, FilterAll } from "@/lib/utils/client-enums";
import { FormMode } from "@/lib/utils/form-mode";
import { InvoiceFilterStatus } from "@/lib/utils/invoice-filter-status";
import { InvoiceDetailsModal } from "@/components/dashboard/invoices/InvoiceDetailsModal";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { NextStepCard } from "@/components/shared/NextStepCard";

import { InvoicesGuideModal } from "@/components/dashboard/invoices/InvoicesGuideModal";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

interface InvoicesContentProps {
  entityId: string;
  accountType: AccountType;
}

export function InvoicesContent({ entityId, accountType }: InvoicesContentProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Guide Modal State
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // CRITICAL: Validate entityId prop - fail loudly if missing
  if (!entityId) {
    throw new Error("InvoicesContent: entityId prop is required.");
  }

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>(FormMode.Create);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | undefined>(undefined);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | undefined>(undefined);

  // Tab State
  const [activeTab, setActiveTab] = useState<InvoiceTabType>(InvoiceTabType.Invoices);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(InvoiceFilterStatus.All);
  const [yearFilter, setYearFilter] = useState<number | FilterAll>(FilterAll.All);
  const [monthFilter, setMonthFilter] = useState<number | FilterAll>(FilterAll.All);
  
  // Pagination & Sort States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>(InvoiceSortField.IssueDate);
  const [sortOrder, setSortOrder] = useState<SortOrderType>(SortOrder.Desc);

  // Summary Tab State
  const [summaryYear, setSummaryYear] = useState<number | FilterAll>(new Date().getFullYear());
  const [summaryMonth, setSummaryMonth] = useState<number | FilterAll>(new Date().getMonth() + 1);

  // Redux & Data Fetching
  const { invoices, pagination, isLoading: loading, hasFetched } = useAppSelector((state: any) => state.invoices);
  const { sendHttpRequest: fetchInvoices, isLoading } = useHttp();
  const { downloadPDF, isDownloading, downloadingId } = useInvoiceDownload();

  // Derived State
  const total = pagination?.total || 0;
  const pages = pagination?.pages || 0;

  // Compute stats safely from available data
  const stats = useMemo(() => {
    const currentInvoices = invoices || [];
    const totalCount = pagination?.total || 0;
    
    // Note: These calculations are based on the current page of invoices
    // Ideally, the backend should provide these global stats
    const totalValue = currentInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    const paidInvoices = currentInvoices.filter((inv: any) => inv.status === InvoiceStatus.Paid);
    const pendingInvoices = currentInvoices.filter((inv: any) => inv.status === InvoiceStatus.Pending);
    const paidValue = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

    return {
      total: totalCount,
      totalAmount: totalValue,
      paid: paidInvoices.length,
      pending: pendingInvoices.length,
      paidAmount: paidValue
    };
  }, [invoices, pagination]);

  // Fetch Invoices
  const fetchInvoicesData = () => {
    // Only fetch if we have an entityId
    if (!entityId) return;

    fetchInvoices({
      requestConfig: {
        url: "/invoices",
        method: HttpMethod.GET,
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearchTerm,
          status: statusFilter !== InvoiceFilterStatus.All ? statusFilter : undefined,
          year: yearFilter !== FilterAll.All ? yearFilter : undefined,
          month: monthFilter !== FilterAll.All ? monthFilter : undefined,
          sort: sortField,
          order: sortOrder,
          // CRITICAL: Send companyId or businessId based on account type
          ...(accountType === AccountType.Business ? { businessId: entityId } : { companyId: entityId }),
        },
      },
      successRes: (response: any) => {
        if (response?.data?.data) {
          dispatch(invoicesActions.setInvoices(response.data.data));
        }
      },
    });
  };

  // Initial Fetch & Refetch on Dependencies
  useEffect(() => {
    fetchInvoicesData();
  }, [
    currentPage, 
    itemsPerPage, 
    debouncedSearchTerm, 
    statusFilter, 
    yearFilter, 
    monthFilter, 
    sortField, 
    sortOrder, 
    entityId
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, yearFilter, monthFilter]);

  // Update search state
  useEffect(() => {
    setIsSearching(false);
  }, [debouncedSearchTerm]);

  // Handlers
  const handleCreateClick = () => {
    setModalMode(FormMode.Create);
    setEditingInvoiceId(undefined);
    setIsModalOpen(true);
  };

  const handleEditClick = (invoiceId: string) => {
    setModalMode(FormMode.Edit);
    setEditingInvoiceId(invoiceId);
    setIsModalOpen(true);
  };

  const handleViewClick = (invoiceId: string) => {
    setViewingInvoiceId(invoiceId);
    setIsViewModalOpen(true);
  };

  const handleDownloadClick = (invoiceId: string) => {
    // Find invoice to get number
    const invoice = invoices.find((inv: any) => inv._id === invoiceId || inv.id === invoiceId);
    if (invoice) {
      downloadPDF(invoiceId, invoice.invoiceNumber);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
  };

  const handleYearFilterChange = (year: number | FilterAll) => {
    setYearFilter(year);
  };

  const handleMonthFilterChange = (month: number | FilterAll) => {
    setMonthFilter(month);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc);
    } else {
      setSortField(field);
      setSortOrder(SortOrder.Desc);
    }
  };

  // Derived State
  const sortedInvoices = invoices || []; // Sorting is handled on backend
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingInvoiceId(undefined);
  };

  const handleViewModalClose = () => {
    setIsViewModalOpen(false);
    setViewingInvoiceId(undefined);
  };

  const handleModalSuccess = () => {
    // Close the modal
    setIsModalOpen(false);
    setEditingInvoiceId(undefined);
    
    // Refetch invoices after successful create/edit
    dispatch(invoicesActions.invalidateCache());
    // CRITICAL: entityId is validated at component level, so it's guaranteed to exist here
    fetchInvoicesData();
  };

  // Only show loading if we're actually fetching AND don't have data yet
  // If data is already fetched (hasFetched is true), show it immediately
  const shouldShowLoading = (loading || isLoading) && !hasFetched;
  
  if (shouldShowLoading) {
    return <LoadingState message="Loading your invoices..." />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <InvoiceHeader 
        onCreateClick={handleCreateClick} 
        onGuideClick={() => setIsGuideOpen(true)}
      />

      <InvoiceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content with AnimatePresence */}
      <AnimatePresence mode="wait">
        {activeTab === InvoiceTabType.Invoices && (
          <motion.div
            key="invoices-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Statistics Cards - Only show in Invoices tab */}
            <InvoiceStats
              total={stats.total}
              totalAmount={stats.totalAmount}
              paid={stats.paid}
              pending={stats.pending}
              paidAmount={stats.paidAmount}
            />

            <InvoiceFilters
              searchTerm={searchTerm}
              isSearching={isSearching}
              onSearchChange={(value) => {
                setSearchTerm(value);
                setIsSearching(true);
              }}
              statusFilter={statusFilter}
              yearFilter={yearFilter}
              monthFilter={monthFilter}
              itemsPerPage={itemsPerPage}
              sortField={sortField}
              sortOrder={sortOrder}
              onStatusFilterChange={handleStatusFilterChange}
              onYearFilterChange={handleYearFilterChange}
              onMonthFilterChange={handleMonthFilterChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              onSort={handleSort}
              onRefresh={fetchInvoicesData}
            />

            <InvoiceList
              invoices={sortedInvoices}
              pagination={pagination}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              debouncedSearchTerm={debouncedSearchTerm}
              statusFilter={statusFilter}
              onPageChange={handlePageChange}
              onEditClick={handleEditClick}
              onViewClick={handleViewClick}
              onDownloadClick={handleDownloadClick}
              downloadingId={downloadingId}
            />
          </motion.div>
        )}

        {activeTab === InvoiceTabType.Summary && (
          <motion.div
            key="summary-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <InvoiceSummaryTab
              summaryYear={summaryYear}
              summaryMonth={summaryMonth}
              onSummaryYearChange={setSummaryYear}
              onSummaryMonthChange={setSummaryMonth}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Form Modal */}
      <InvoiceFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        mode={modalMode}
        invoiceId={editingInvoiceId}
        onSuccess={handleModalSuccess}
        entityId={entityId}
        accountType={accountType}
      />

      {/* Invoice Details View Modal */}
      <InvoiceDetailsModal 
        isOpen={isViewModalOpen}
        onClose={handleViewModalClose}
        invoiceId={viewingInvoiceId}
      />

      {/* Guide Modal */}
      <InvoicesGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />

      {/* Next Step Navigation */}
      <NextStepCard
        title="Next Step: Record Expenses"
        description="After invoicing your clients, don't forget to track your business expenses to lower your tax liability."
        href={accountType === AccountType.Business ? "/dashboard/business/expenses" : "/dashboard/expenses"}
        actionLabel="Go to Expenses"
      />
    </motion.div>
  );
}



