import { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { CustomButton, CustomBadge } from "../components/common";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import { MobileOptimizedTable, MobileOptimizedTableHeader, MobileOptimizedTableBody, MobileOptimizedTableCell, MobileOptimizedTableHeaderCell } from "../components/common/MobileOptimizedTable";
import { MobileCard, MobileCardHeader, MobileCardTitle, MobileCardContent } from "../components/common/MobileCard";
import { MobileButton, MobileIconButton } from "../components/common/MobileButton";

interface LogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  user_role: string | null;
  action_type: string;
  action_description: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Pagination {
  current_page: number;
  total_records: number;
  total_pages: number;
  limit: number;
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [filters, setFilters] = useState({
    action_type: "",
    user_role: "",
    status: "",
    date_from: "",
    date_to: "",
    page: 1,
    limit: 50
  });

  const actionTypes = [
    "login", "logout", "create", "update", "delete", 
    "approve", "reject", "view", "export", "report"
  ];

  const userRoles = ["admin", "brgy"];
  const statuses = ["success", "error", "warning"];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/log-activity.php?${params}`, {
        credentials: "include"
      });

      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        setPagination(data.pagination);
      } else {
        console.error("Failed to fetch logs:", data.message);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'page' && key !== 'limit') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/export-logs.php?${params}`, {
        credentials: "include"
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error("Failed to export logs");
      }
    } catch (error) {
      console.error("Error exporting logs:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const clearFilters = () => {
    setFilters({
      action_type: "",
      user_role: "",
      status: "",
      date_from: "",
      date_to: "",
      page: 1,
      limit: 50
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <CustomBadge color="success">Success</CustomBadge>;
      case 'error':
        return <CustomBadge color="error">Error</CustomBadge>;
      case 'warning':
        return <CustomBadge color="warning">Warning</CustomBadge>;
      default:
        return <CustomBadge color="light">{status}</CustomBadge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  return (
    <>
      <PageMeta
        title="System Logs | E-LIGTASMO"
        description="View and manage system activity logs and audit trail"
      />
      
      <div className="w-full">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 sm:p-6 mb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                System Activity Logs
              </h1>
              <p className="text-sm text-gray-600">
                Monitor system activities and user actions for security and compliance
              </p>
            </div>
            <div className="flex gap-2">
              <CustomButton
                size="sm"
                variant="outline"
                onClick={clearFilters}
                className="text-xs px-3 py-1.5 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Clear Filters
              </CustomButton>
              <CustomButton
                size="sm"
                onClick={exportLogs}
                disabled={exporting}
                className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {exporting ? "Exporting..." : "Export CSV"}
              </CustomButton>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Filter Logs
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1">Action Type</Label>
              <Select
                options={[{ value: "", label: "All Actions" }, ...actionTypes.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) }))]}
                selected={filters.action_type}
                onChange={value => handleFilterChange("action_type", value)}
                className="text-xs border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1">User Role</Label>
              <Select
                options={[{ value: "", label: "All Roles" }, ...userRoles.map(role => ({ value: role, label: role === 'brgy' ? 'Barangay' : 'Admin' }))]}
                selected={filters.user_role}
                onChange={value => handleFilterChange("user_role", value)}
                className="text-xs border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1">Status</Label>
              <Select
                options={[{ value: "", label: "All Status" }, ...statuses.map(status => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }))]}
                selected={filters.status}
                onChange={value => handleFilterChange("status", value)}
                className="text-xs border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1">Date From</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange("date_from", e.target.value)}
                className="text-xs border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1">Date To</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
                className="text-xs border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1">Records per Page</Label>
              <Select
                options={[{ value: "25", label: "25" }, { value: "50", label: "50" }, { value: "100", label: "100" }, { value: "200", label: "200" }]}
                selected={filters.limit.toString()}
                onChange={value => handleFilterChange("limit", value)}
                className="text-xs border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Logs Table / Mobile Cards */}
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow mb-4">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Activity Logs</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-gray-500">Loading logs...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-gray-500">No logs found</div>
              </div>
            ) : isMobile ? (
              <div className="p-3 space-y-3">
                {logs.map((log) => (
                  <MobileCard key={log.id} interactive>
                    <MobileCardHeader>
                      <MobileCardTitle size="sm">
                        {formatDate(log.created_at)}
                      </MobileCardTitle>
                    </MobileCardHeader>
                    <MobileCardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.username || 'Anonymous'}</div>
                          <div className="text-xs text-gray-500">{log.user_role || 'Unknown'}</div>
                        </div>
                        <div className="text-xs font-semibold text-gray-700 capitalize">{log.action_type}</div>
                      </div>
                      {log.action_description && (
                        <div className="text-xs text-gray-600">
                          {log.action_description}
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-xs text-red-600">
                          Error: {log.error_message}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-gray-500">{log.ip_address || 'N/A'}</div>
                        <div>{getStatusBadge(log.status)}</div>
                      </div>
                    </MobileCardContent>
                  </MobileCard>
                ))}
              </div>
            ) : (
              <MobileOptimizedTable>
                <table className="min-w-full">
                  <MobileOptimizedTableHeader>
                    <tr>
                      <MobileOptimizedTableHeaderCell>Timestamp</MobileOptimizedTableHeaderCell>
                      <MobileOptimizedTableHeaderCell>User</MobileOptimizedTableHeaderCell>
                      <MobileOptimizedTableHeaderCell>Action</MobileOptimizedTableHeaderCell>
                      <MobileOptimizedTableHeaderCell className="hidden md:table-cell">Description</MobileOptimizedTableHeaderCell>
                      <MobileOptimizedTableHeaderCell className="hidden lg:table-cell">Resource</MobileOptimizedTableHeaderCell>
                      <MobileOptimizedTableHeaderCell>Status</MobileOptimizedTableHeaderCell>
                      <MobileOptimizedTableHeaderCell className="hidden xl:table-cell">IP Address</MobileOptimizedTableHeaderCell>
                    </tr>
                  </MobileOptimizedTableHeader>
                  <MobileOptimizedTableBody>
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <MobileOptimizedTableCell>
                          <div className="whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </div>
                        </MobileOptimizedTableCell>
                        <MobileOptimizedTableCell>
                          <div>
                            <div className="font-medium text-gray-900">{log.username || 'Anonymous'}</div>
                            <div className="text-xs text-gray-500">{log.user_role || 'Unknown'}</div>
                          </div>
                        </MobileOptimizedTableCell>
                        <MobileOptimizedTableCell>
                          <span className="font-medium capitalize text-gray-900">{log.action_type}</span>
                        </MobileOptimizedTableCell>
                        <MobileOptimizedTableCell className="hidden md:table-cell">
                          <div className="max-w-xs">
                            <div className="truncate" title={log.action_description}>
                              {log.action_description}
                            </div>
                            {log.error_message && (
                              <div className="mt-1 text-xs text-red-600">
                                Error: {log.error_message}
                              </div>
                            )}
                          </div>
                        </MobileOptimizedTableCell>
                        <MobileOptimizedTableCell className="hidden lg:table-cell">
                          {log.resource_type && (
                            <div>
                              <div className="font-medium capitalize text-gray-900">{log.resource_type}</div>
                              {log.resource_id && (
                                <div className="text-xs text-gray-500">ID: {log.resource_id}</div>
                              )}
                            </div>
                          )}
                        </MobileOptimizedTableCell>
                        <MobileOptimizedTableCell>
                          {getStatusBadge(log.status)}
                        </MobileOptimizedTableCell>
                        <MobileOptimizedTableCell className="hidden xl:table-cell">
                          <div className="whitespace-nowrap">
                            {log.ip_address || 'N/A'}
                          </div>
                        </MobileOptimizedTableCell>
                      </tr>
                    ))}
                  </MobileOptimizedTableBody>
                </table>
              </MobileOptimizedTable>
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-600">
                Showing {((pagination.current_page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.current_page * pagination.limit, pagination.total_records)} of{' '}
                {pagination.total_records} records
              </div>
              <div className="flex items-center gap-2">
                <CustomButton
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="text-xs px-3 py-1.5 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Previous
                </CustomButton>
                <span className="flex items-center px-3 text-xs text-gray-600">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <CustomButton
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="text-xs px-3 py-1.5 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Next
                </CustomButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
