import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ExternalLink,
  FileClock,
  Filter,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/risk-badge";
import { api } from "@/lib/api";
import type {
  PredictionFilters,
  PredictionRecord,
  RiskTier,
} from "@/lib/api";
import {
  FEATURE_LABELS,
  FEATURE_ORDER,
  formatFeatureValue,
} from "@/lib/feature-display";
import { cn } from "@/lib/utils";

const ALL_RISKS: RiskTier[] = ["Thấp", "Trung bình", "Cao"];
const SORT_OPTIONS: { value: NonNullable<PredictionFilters["sort"]>; label: string }[] = [
  { value: "created_at_desc", label: "Mới nhất → Cũ nhất" },
  { value: "created_at_asc", label: "Cũ nhất → Mới nhất" },
  { value: "prob_desc", label: "Xác suất cao → thấp" },
  { value: "prob_asc", label: "Xác suất thấp → cao" },
];

export function HistoryPage() {
  const [filters, setFilters] = useState<PredictionFilters>({
    sort: "created_at_desc",
    limit: 100,
    offset: 0,
  });
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const query = useQuery({
    queryKey: ["history", filters],
    queryFn: () => api.listPredictions(filters),
  });

  const records = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, offset: 0 }));
  };

  const toggleRisk = (r: RiskTier) => {
    setFilters((f) => {
      const cur = new Set(f.risk ?? []);
      cur.has(r) ? cur.delete(r) : cur.add(r);
      return { ...f, risk: cur.size ? Array.from(cur) : undefined, offset: 0 };
    });
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search) n++;
    if (filters.risk && filters.risk.length > 0) n++;
    if (filters.has_ogtt !== undefined) n++;
    if (filters.date_from) n++;
    if (filters.date_to) n++;
    if (filters.prob_min !== undefined) n++;
    if (filters.prob_max !== undefined) n++;
    return n;
  }, [filters]);

  const resetFilters = () => {
    setSearchInput("");
    setFilters({ sort: "created_at_desc", limit: 100, offset: 0 });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Lịch sử dự đoán"
        description="Tất cả các lần khám đã chạy — có thể lọc, tìm kiếm, sắp xếp."
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")}
            />
            Làm mới
          </Button>
        }
      />

      <Panel
        icon={FileClock}
        title={`${total} bản ghi${total > records.length ? ` (hiển thị ${records.length})` : ""}`}
        description="Bấm vào dòng để xem chi tiết input"
        right={
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                placeholder="Tìm theo tên / mã BN..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                className="h-8 pl-8 text-[13px]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setFilters((f) => ({ ...f, search: undefined, offset: 0 }));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Xoá tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter className="h-3.5 w-3.5" />
              Bộ lọc
              {activeFilterCount > 0 && (
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 text-[10px] font-bold",
                    showFilters
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-accent text-accent-foreground",
                  )}
                >
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        }
      >
        {showFilters && (
          <div className="mb-3 space-y-3 rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Mức nguy cơ
                </Label>
                <div className="flex flex-wrap gap-1">
                  {ALL_RISKS.map((r) => {
                    const active = filters.risk?.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRisk(r)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  OGTT
                </Label>
                <div className="flex gap-1">
                  {[
                    { v: undefined, l: "Tất cả" },
                    { v: true, l: "Có" },
                    { v: false, l: "Không" },
                  ].map((opt) => (
                    <button
                      key={String(opt.v)}
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          has_ogtt: opt.v as boolean | undefined,
                          offset: 0,
                        }))
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition-colors",
                        filters.has_ogtt === opt.v
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Từ ngày
                </Label>
                <Input
                  type="date"
                  value={filters.date_from?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      date_from: e.target.value || undefined,
                      offset: 0,
                    }))
                  }
                  className="h-8 text-[13px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Đến ngày
                </Label>
                <Input
                  type="date"
                  value={filters.date_to?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      date_to: e.target.value
                        ? `${e.target.value}T23:59:59`
                        : undefined,
                      offset: 0,
                    }))
                  }
                  className="h-8 text-[13px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Xác suất tối thiểu (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={
                    filters.prob_min !== undefined
                      ? Math.round(filters.prob_min * 100)
                      : ""
                  }
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      prob_min: e.target.value
                        ? Number(e.target.value) / 100
                        : undefined,
                      offset: 0,
                    }))
                  }
                  placeholder="0"
                  className="h-8 text-[13px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Xác suất tối đa (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={
                    filters.prob_max !== undefined
                      ? Math.round(filters.prob_max * 100)
                      : ""
                  }
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      prob_max: e.target.value
                        ? Number(e.target.value) / 100
                        : undefined,
                      offset: 0,
                    }))
                  }
                  placeholder="100"
                  className="h-8 text-[13px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Sắp xếp
                </Label>
                <select
                  value={filters.sort ?? "created_at_desc"}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      sort: e.target.value as PredictionFilters["sort"],
                    }))
                  }
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" />
                Xoá bộ lọc
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <th className="w-8 border-b border-border/60 px-2 pb-2" />
                <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                  Thời gian
                </th>
                <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                  Mã BN
                </th>
                <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                  Bệnh nhân
                </th>
                <th className="border-b border-border/60 px-2 pb-2 text-right font-semibold">
                  Xác suất
                </th>
                <th className="border-b border-border/60 px-2 pb-2 text-center font-semibold">
                  OGTT
                </th>
                <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                  Mức nguy cơ
                </th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td colSpan={7} className="px-2 py-2">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : query.error ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-sm text-destructive">
                    {query.error instanceof Error
                      ? query.error.message
                      : "Không tải được lịch sử"}
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6">
                    <EmptyHistory hasFilters={activeFilterCount > 0} />
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <FragmentRow
                    key={r.id}
                    record={r}
                    open={expanded.has(r.id)}
                    onToggle={() => toggle(r.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FragmentRow({
  open,
  onToggle,
  record,
}: {
  open: boolean;
  onToggle: () => void;
  record: PredictionRecord;
}) {
  const features = record.input_features;
  const hasFeatures = features && Object.keys(features).length > 0;
  return (
    <>
      <tr
        className={cn(
          "border-b border-border/40 transition-colors last:border-0",
          hasFeatures && "cursor-pointer hover:bg-accent-soft/40",
          open && "bg-accent-soft/30",
        )}
        onClick={onToggle}
      >
        <td className="px-2 py-2 text-muted-foreground">
          {hasFeatures && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                open && "rotate-180",
              )}
            />
          )}
        </td>
        <td className="px-2 py-2 text-muted-foreground">
          {record.created_at
            ? new Date(record.created_at).toLocaleString("vi-VN")
            : "—"}
        </td>
        <td className="px-2 py-2 font-mono text-[11px]">
          {record.patient_code ?? <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-2 py-2">
          {record.patient_id ? (
            <Link
              to={`/patients/${record.patient_id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {record.patient_name ?? "Bệnh nhân"}
              <ExternalLink className="h-3 w-3" />
            </Link>
          ) : (
            <span className="text-foreground">
              {record.patient_name ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          )}
        </td>
        <td className="px-2 py-2 text-right font-mono tabular-nums">
          {(record.gdm_probability * 100).toFixed(1)}%
        </td>
        <td className="px-2 py-2 text-center text-[11px]">
          {record.has_ogtt ? (
            <span className="text-emerald-600">Có</span>
          ) : (
            <span className="text-muted-foreground">Không</span>
          )}
        </td>
        <td className="px-2 py-2">
          <RiskBadge tier={record.risk_level} />
        </td>
      </tr>
      {open && features && (
        <tr className="border-b border-border/40 bg-muted/30">
          <td />
          <td colSpan={6} className="px-2 py-3">
            <PatientFeatures features={features} />
          </td>
        </tr>
      )}
    </>
  );
}

function PatientFeatures({ features }: { features: Record<string, unknown> }) {
  const ordered = FEATURE_ORDER.filter((k) => k in features);
  const extras = Object.keys(features).filter((k) => !FEATURE_ORDER.includes(k));
  const keys = [...ordered, ...extras];
  return (
    <div>
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Thông tin bệnh nhân đã nhập
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {keys.map((k) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-2 border-b border-dashed border-border/40 py-0.5"
          >
            <span className="text-[11px] text-muted-foreground">
              {FEATURE_LABELS[k] ?? k}
            </span>
            <span className="text-[12px] font-medium tabular-nums text-primary">
              {formatFeatureValue(k, features[k])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyHistory({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <FileClock className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium text-primary">
        {hasFilters
          ? "Không có bản ghi nào khớp bộ lọc"
          : "Chưa có bản ghi nào"}
      </div>
      <p className="max-w-[280px] text-[12px] text-muted-foreground">
        {hasFilters
          ? "Thử nới rộng điều kiện lọc hoặc bấm 'Xoá bộ lọc' để xem tất cả."
          : 'Hãy chạy thử dự đoán ở trang "Dự đoán" để bắt đầu xây dựng lịch sử.'}
      </p>
    </div>
  );
}
