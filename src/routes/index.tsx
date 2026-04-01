import {
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { getAnalytics, type AnalyticsSummary } from "@/lib/analytics"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

const VALID_PERIODS = [1, 7, 30, 90] as const

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const days = Number(search.days) || 7
    return { days: VALID_PERIODS.includes(days as 1 | 7 | 30 | 90) ? days : 7 }
  },
  loaderDeps: ({ search }) => ({ days: search.days }),
  loader: ({ deps }) => getAnalytics({ data: { days: deps.days } }),
  pendingMs: 0,
  head: () => ({
    meta: [{ title: "Web Analytics" }],
  }),
  component: Dashboard,
  pendingComponent: DashboardSkeleton,
  errorComponent: DashboardError,
})

function Dashboard() {
  const analytics = Route.useLoaderData() as AnalyticsSummary
  const { days } = Route.useSearch()
  const navigate = useNavigate()
  const loading = useRouterState({ select: (s) => s.isLoading })

  const switchPeriod = (newDays: number) => {
    navigate({ to: "/", search: { days: newDays } })
  }

  return (
    <div className="mx-auto min-h-svh max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {analytics.siteName}
          </h1>
          <p className="text-sm text-muted-foreground">Web Analytics</p>
        </div>
        <Tabs value={days} onValueChange={(v) => switchPeriod(Number(v))}>
          <TabsList>
            <TabsTrigger value={1}>24h</TabsTrigger>
            <TabsTrigger value={7}>7d</TabsTrigger>
            <TabsTrigger value={30}>30d</TabsTrigger>
            <TabsTrigger value={90}>90d</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <Separator className="my-6" />

      {loading ? (
        <ContentSkeleton />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              title="Total Visits"
              value={formatNumber(analytics.totalVisits)}
            />
            <StatCard
              title="Total Pageviews"
              value={formatNumber(analytics.totalPageviews)}
            />
            <StatCard
              title="Pages / Visit"
              value={
                analytics.totalVisits > 0
                  ? (analytics.totalPageviews / analytics.totalVisits).toFixed(
                      1
                    )
                  : "0"
              }
            />
            <StatCard
              title="Bounce Rate"
              value={
                analytics.totalVisits > 0
                  ? `${Math.round(
                      ((analytics.totalVisits -
                        (analytics.totalPageviews - analytics.totalVisits)) /
                        analytics.totalVisits) *
                        100
                    )}%`
                  : "0%"
              }
            />
          </div>

          {/* Timeseries Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic</CardTitle>
              <CardDescription>
                Daily visits and pageviews over the last {days} day
                {days > 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.timeseries.length > 0 ? (
                <TrafficChart data={analytics.timeseries} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No data for this period
                </p>
              )}
            </CardContent>
          </Card>

          {/* Web Vitals */}
          {analytics.webVitals && (
            <Card>
              <CardHeader>
                <CardTitle>Core Web Vitals</CardTitle>
                <CardDescription>
                  75th percentile performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <VitalCard
                    label="LCP"
                    value={analytics.webVitals.lcpP75}
                    unit="ms"
                    thresholds={[2500, 4000]}
                  />
                  <VitalCard
                    label="INP"
                    value={analytics.webVitals.inpP75}
                    unit="ms"
                    thresholds={[200, 500]}
                  />
                  <VitalCard
                    label="CLS"
                    value={analytics.webVitals.clsP75}
                    unit=""
                    thresholds={[0.1, 0.25]}
                    decimals={3}
                  />
                  <VitalCard
                    label="FID"
                    value={analytics.webVitals.fidP75}
                    unit="ms"
                    thresholds={[100, 300]}
                  />
                  <VitalCard
                    label="TTFB"
                    value={analytics.webVitals.ttfbP75}
                    unit="ms"
                    thresholds={[800, 1800]}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown Tables */}
          <Card>
            <CardContent>
              <Tabs defaultValue="pages">
                <TabsList>
                  <TabsTrigger value="pages">Pages</TabsTrigger>
                  <TabsTrigger value="referrers">Referrers</TabsTrigger>
                  <TabsTrigger value="countries">Countries</TabsTrigger>
                  <TabsTrigger value="browsers">Browsers</TabsTrigger>
                  <TabsTrigger value="os">OS</TabsTrigger>
                  <TabsTrigger value="devices">Devices</TabsTrigger>
                </TabsList>
                <TabsContent value="pages">
                  <RankingTable
                    items={analytics.topPaths.map((p) => ({
                      label: p.path,
                      value: p.visits,
                      secondary: `${p.pageviews} views`,
                    }))}
                    total={analytics.totalVisits}
                    emptyMessage="No page data"
                  />
                </TabsContent>
                <TabsContent value="referrers">
                  <RankingTable
                    items={analytics.topReferrers.map((r) => ({
                      label: r.referrer,
                      value: r.visits,
                    }))}
                    total={analytics.totalVisits}
                    emptyMessage="No referrer data"
                  />
                </TabsContent>
                <TabsContent value="countries">
                  <RankingTable
                    items={analytics.topCountries.map((c) => ({
                      label: c.country,
                      value: c.visits,
                    }))}
                    total={analytics.totalVisits}
                    emptyMessage="No country data"
                  />
                </TabsContent>
                <TabsContent value="browsers">
                  <RankingTable
                    items={analytics.topBrowsers.map((b) => ({
                      label: b.browser,
                      value: b.visits,
                    }))}
                    total={analytics.totalVisits}
                    emptyMessage="No browser data"
                  />
                </TabsContent>
                <TabsContent value="os">
                  <RankingTable
                    items={analytics.topOS.map((o) => ({
                      label: o.os,
                      value: o.visits,
                    }))}
                    total={analytics.totalVisits}
                    emptyMessage="No OS data"
                  />
                </TabsContent>
                <TabsContent value="devices">
                  <RankingTable
                    items={analytics.topDevices.map((d) => ({
                      label: d.device,
                      value: d.visits,
                    }))}
                    total={analytics.totalVisits}
                    emptyMessage="No device data"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      <footer className="mt-8 pb-4 text-center text-xs text-muted-foreground">
        Powered by Cloudflare Web Analytics
      </footer>
    </div>
  )
}

// -- Components --

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function VitalCard({
  label,
  value,
  unit,
  thresholds,
  decimals = 0,
}: {
  label: string
  value: number
  unit: string
  thresholds: [number, number]
  decimals?: number
}) {
  const status =
    value <= thresholds[0]
      ? "good"
      : value <= thresholds[1]
        ? "needs-improvement"
        : "poor"
  const statusColor = {
    good: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    "needs-improvement":
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    poor: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  }[status]

  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-xl font-bold tabular-nums">
        {decimals > 0 ? value.toFixed(decimals) : Math.round(value)}
        {unit && (
          <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span>
        )}
      </span>
      <Badge variant="secondary" className={`w-fit text-xs ${statusColor}`}>
        {status === "good"
          ? "Good"
          : status === "needs-improvement"
            ? "Needs work"
            : "Poor"}
      </Badge>
    </div>
  )
}

const trafficChartConfig = {
  visits: {
    label: "Visits",
    color: "oklch(0.488 0.243 264.376)",
  },
  pageviews: {
    label: "Pageviews",
    color: "oklch(0.72 0.12 264.376)",
  },
} satisfies ChartConfig

function TrafficChart({
  data,
}: {
  data: { date: string; visits: number; pageviews: number }[]
}) {
  return (
    <ChartContainer
      config={trafficChartConfig}
      className="max-h-[250px] w-full"
    >
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) =>
            new Date(value + "T00:00:00").toLocaleDateString("en", {
              month: "short",
              day: "numeric",
            })
          }
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dashed"
              labelFormatter={(value) =>
                new Date(String(value) + "T00:00:00").toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }
            />
          }
        />
        <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
        <Bar dataKey="pageviews" fill="var(--color-pageviews)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

function RankingTable({
  items,
  total,
  emptyMessage,
}: {
  items: { label: string; value: number; secondary?: string }[]
  total: number
  emptyMessage: string
}) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="divide-y overflow-hidden rounded-md">
      {items.map((item, i) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0
        return (
          <div key={i} className="relative flex items-center gap-3 px-4 py-3">
            <div
              className="absolute inset-y-0 left-0 rounded-r bg-primary/8"
              style={{ width: `${pct}%` }}
            />
            <span className="relative min-w-0 flex-1 truncate text-sm">
              {item.label}
            </span>
            <div className="relative flex items-center gap-2">
              {item.secondary && (
                <span className="text-xs text-muted-foreground">
                  {item.secondary}
                </span>
              )}
              <span className="text-sm font-medium tabular-nums">
                {formatNumber(item.value)}
              </span>
              <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                {pct.toFixed(1)}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto min-h-svh max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Separator />
        <ContentSkeleton />
      </div>
    </div>
  )
}

function DashboardError({ error }: { error: Error }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Failed to load analytics</CardTitle>
          <CardDescription>
            There was an error fetching your analytics data. Check your API
            token and configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
            {error.message}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

// -- Helpers --

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}
