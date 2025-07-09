import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Badge from "../components/ui/badge/Badge";
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

      const response = await fetch(`http://localhost/eligtasmo/api/log-activity.php?${params}`, {
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

      const response = await fetch(`http://localhost/eligtasmo/api/export-logs.php?${params}`, {
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
        return <Badge color="success">Success</Badge>;
      case 'error':
        return <Badge color="error">Error</Badge>;
      case 'warning':
        return <Badge color="warning">Warning</Badge>;
      default:
        return <Badge color="light">{status}</Badge>;
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
      <PageBreadcrumb pageTitle="System Logs" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              System Activity Logs
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor system activities and user actions for security and compliance
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
            <Button
              size="sm"
              onClick={exportLogs}
              disabled={exporting}
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <h4 className="mb-4 text-sm font-medium text-gray-800 dark:text-white/90">
            Filter Logs
          </h4>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div>
              <Label>Action Type</Label>
              <Select
                options={[{ value: "", label: "All Actions" }, ...actionTypes.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) }))]}
                selected={filters.action_type}
                onChange={value => handleFilterChange("action_type", value)}
              />
            </div>

            <div>
              <Label>User Role</Label>
              <Select
                options={[{ value: "", label: "All Roles" }, ...userRoles.map(role => ({ value: role, label: role === 'brgy' ? 'Barangay' : 'Admin' }))]}
                selected={filters.user_role}
                onChange={value => handleFilterChange("user_role", value)}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                options={[{ value: "", label: "All Status" }, ...statuses.map(status => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }))]}
                selected={filters.status}
                onChange={value => handleFilterChange("status", value)}
              />
            </div>

            <div>
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange("date_from", e.target.value)}
              />
            </div>

            <div>
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
              />
            </div>

            <div>
              <Label>Records per Page</Label>
              <Select
                options={[{ value: "25", label: "25" }, { value: "50", label: "50" }, { value: "100", label: "100" }, { value: "200", label: "200" }]}
                selected={filters.limit.toString()}
                onChange={value => handleFilterChange("limit", value)}
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">Loading logs...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">No logs found</div>
            </div>
          ) : (
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-900 dark:text-white/90 uppercase tracking-wider sm:text-sm">
                        Timestamp
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-900 dark:text-white/90 uppercase tracking-wider sm:text-sm">
                        User
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-900 dark:text-white/90 uppercase tracking-wider sm:text-sm">
                        Action
                      </th>
                      <th className="hidden md:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-900 dark:text-white/90 uppercase tracking-wider sm:text-sm">
                        Description
                      </th>
                      <th className="hidden lg:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-900 dark:text-white/90 uppercase tracking-wider sm:text-sm">
                        Resource
                      </th>
                      <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-900 dark:text-white/90 uppercase tracking-wider sm:text-sm">
                        Status
                      </th>
                      <th className="hidden xl:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-900 dark:text-white/90 uppercase tracking-wider sm:text-sm">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="px-3 py-4 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                          <div className="whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white/90">{log.username || 'Anonymous'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{log.user_role || 'Unknown'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                          <span className="font-medium capitalize text-gray-900 dark:text-white/90">{log.action_type}</span>
                        </td>
                        <td className="hidden md:table-cell px-3 py-4 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                          <div className="max-w-xs">
                            <div className="truncate" title={log.action_description}>
                              {log.action_description}
                            </div>
                            {log.error_message && (
                              <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                                Error: {log.error_message}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-3 py-4 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                          {log.resource_type && (
                            <div>
                              <div className="font-medium capitalize text-gray-900 dark:text-white/90">{log.resource_type}</div>
                              {log.resource_id && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">ID: {log.resource_id}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 text-xs sm:text-sm">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="hidden xl:table-cell px-3 py-4 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                          <div className="whitespace-nowrap">
                            {log.ip_address || 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.current_page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.current_page * pagination.limit, pagination.total_records)} of{' '}
              {pagination.total_records} records
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.current_page} of {pagination.total_pages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.total_pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 