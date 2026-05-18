import { useQuery } from "@tanstack/react-query";
import { Database, FileClock, RefreshCw } from "lucide-react";
import { PageHeader, Panel } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/risk-badge";
import { api } from "@/lib/api";

export function HistoryPage() {
  const query = useQuery({
    queryKey: ["history"],
    queryFn: () => api.history(50),
  });

  const records = query.data?.records ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Lịch sử dự đoán"
        description="Các ca đã chạy gần đây — dùng cho kiểm tra và demo."
        right={
          <div className="flex items-center gap-2">
            {query.data && (
              <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
                <Database className="h-3 w-3" />
                Nguồn:
                <Badge variant="outline" className="text-[10px]">
                  {query.data.store_type}
                </Badge>
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
          </div>
        }
      />

      <Panel
        icon={FileClock}
        title={`${records.length} bản ghi`}
        description="Sắp xếp mới nhất → cũ nhất"
      >
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : query.error ? (
          <div className="text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Không tải được lịch sử"}
          </div>
        ) : records.length === 0 ? (
          <EmptyHistory />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                    Thời gian
                  </th>
                  <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                    Mã BN
                  </th>
                  <th className="border-b border-border/60 px-2 pb-2 text-right font-semibold">
                    Xác suất
                  </th>
                  <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                    Mức nguy cơ
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={r.id ?? i}
                    className="border-b border-border/40 transition-colors hover:bg-accent-soft/40 last:border-0"
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px]">
                      {r.patient_id ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">
                      {(r.gdm_probability * 100).toFixed(1)}%
                    </td>
                    <td className="px-2 py-2">
                      <RiskBadge tier={r.risk_level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <FileClock className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium text-primary">
        Chưa có bản ghi nào
      </div>
      <p className="max-w-[260px] text-[12px] text-muted-foreground">
        Hãy chạy thử dự đoán ở trang "Dự đoán" để bắt đầu xây dựng lịch sử.
      </p>
    </div>
  );
}
