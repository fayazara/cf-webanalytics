import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"

const CF_GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql"

async function queryGraphQL(query: string, variables: Record<string, unknown>) {
  const response = await fetch(CF_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`)
  }

  const json = (await response.json()) as {
    data: unknown
    errors?: Array<{ message: string }>
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(", "))
  }
  return json.data
}

// Types for analytics responses
export interface PageviewData {
  date: string
  visits: number
  pageviews: number
}

export interface TopPath {
  path: string
  visits: number
  pageviews: number
}

export interface TopReferrer {
  referrer: string
  visits: number
}

export interface TopCountry {
  country: string
  visits: number
}

export interface TopBrowser {
  browser: string
  visits: number
}

export interface TopOS {
  os: string
  visits: number
}

export interface TopDevice {
  device: string
  visits: number
}

export interface WebVitalsData {
  lcpP75: number
  fidP75: number
  clsP75: number
  inpP75: number
  ttfbP75: number
}

export interface AnalyticsSummary {
  siteName: string
  totalVisits: number
  totalPageviews: number
  timeseries: PageviewData[]
  topPaths: TopPath[]
  topReferrers: TopReferrer[]
  topCountries: TopCountry[]
  topBrowsers: TopBrowser[]
  topOS: TopOS[]
  topDevices: TopDevice[]
  webVitals: WebVitalsData | null
}

// GQL response types
interface GQLTimeseries {
  count: number
  sum: { visits: number }
  dimensions: { date: string }
}
interface GQLTotals {
  count: number
  sum: { visits: number }
}
interface GQLDimensionRow {
  count?: number
  sum: { visits: number }
  dimensions: { metric: string }
}
interface GQLWebVitals {
  count: number
  quantiles: {
    largestContentfulPaintP75: number
    firstInputDelayP75: number
    cumulativeLayoutShiftP75: number
    interactionToNextPaintP75: number
    timeToFirstByteP75: number
  }
}
interface GQLResponse {
  viewer: {
    accounts: Array<{
      timeseries: GQLTimeseries[]
      totals: GQLTotals[]
      topPaths: GQLDimensionRow[]
      topReferrers: GQLDimensionRow[]
      topCountries: GQLDimensionRow[]
      topBrowsers: GQLDimensionRow[]
      topOS: GQLDimensionRow[]
      topDevices: GQLDimensionRow[]
      webVitals: GQLWebVitals[]
    }>
  }
}

const QUERY = `
  query WebAnalytics(
    $accountTag: string!
    $siteTag: string!
    $datetimeStart: Time!
    $datetimeEnd: Time!
    $dateStart: Date!
    $dateEnd: Date!
  ) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        timeseries: rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
              { siteTag: $siteTag }
            ]
          }
          limit: 100
          orderBy: [date_ASC]
        ) {
          count
          sum { visits }
          dimensions { date: date }
        }

        totals: rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
              { siteTag: $siteTag }
            ]
          }
          limit: 1
        ) {
          count
          sum { visits }
        }

        topPaths: rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
              { siteTag: $siteTag }
            ]
          }
          limit: 10
          orderBy: [sum_visits_DESC]
        ) {
          count
          sum { visits }
          dimensions { metric: requestPath }
        }

        topReferrers: rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
              { siteTag: $siteTag }
              { refererHost_neq: "" }
            ]
          }
          limit: 10
          orderBy: [sum_visits_DESC]
        ) {
          sum { visits }
          dimensions { metric: refererHost }
        }

        topCountries: rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
              { siteTag: $siteTag }
            ]
          }
          limit: 10
          orderBy: [sum_visits_DESC]
        ) {
          sum { visits }
          dimensions { metric: countryName }
        }

        topBrowsers: rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
              { siteTag: $siteTag }
            ]
          }
          limit: 10
          orderBy: [sum_visits_DESC]
        ) {
          sum { visits }
          dimensions { metric: userAgentBrowser }
        }

        topOS: rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
              { siteTag: $siteTag }
            ]
          }
          limit: 10
          orderBy: [sum_visits_DESC]
        ) {
          sum { visits }
          dimensions { metric: userAgentOS }
        }

        topDevices: rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
              { siteTag: $siteTag }
            ]
          }
          limit: 10
          orderBy: [sum_visits_DESC]
        ) {
          sum { visits }
          dimensions { metric: deviceType }
        }

        webVitals: rumWebVitalsEventsAdaptiveGroups(
          filter: {
            AND: [
              { date_geq: $dateStart, date_leq: $dateEnd }
              { siteTag: $siteTag }
            ]
          }
          limit: 1
        ) {
          count
          quantiles {
            largestContentfulPaintP75
            firstInputDelayP75
            cumulativeLayoutShiftP75
            interactionToNextPaintP75
            timeToFirstByteP75
          }
        }
      }
    }
  }
`

export const getAnalytics = createServerFn({
  method: "GET",
})
  .inputValidator((input: { days?: number }) => input)
  .handler(async ({ data }): Promise<AnalyticsSummary> => {
    const days = data.days ?? 7

    const accountId = env.CF_ACCOUNT_ID
    const siteTag = env.CF_SITE_TAG

    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - days)

    const datetimeStart = start.toISOString()
    const datetimeEnd = now.toISOString()
    const dateStart = datetimeStart.split("T")[0]
    const dateEnd = datetimeEnd.split("T")[0]

    const result = (await queryGraphQL(QUERY, {
      accountTag: accountId,
      siteTag,
      datetimeStart,
      datetimeEnd,
      dateStart,
      dateEnd,
    })) as GQLResponse

    const account = result.viewer.accounts[0]

    const totals = account?.totals?.[0]
    const timeseries = (account?.timeseries ?? []).map((t) => ({
      date: t.dimensions.date,
      visits: t.sum.visits,
      pageviews: t.count,
    }))

    return {
      siteName: env.SITE_NAME || "Web Analytics",
      totalVisits: totals?.sum?.visits ?? 0,
      totalPageviews: totals?.count ?? 0,
      timeseries,
      topPaths: (account?.topPaths ?? []).map((p) => ({
        path: p.dimensions.metric || "/",
        visits: p.sum.visits,
        pageviews: p.count ?? 0,
      })),
      topReferrers: (account?.topReferrers ?? []).map((r) => ({
        referrer: r.dimensions.metric || "(direct)",
        visits: r.sum.visits,
      })),
      topCountries: (account?.topCountries ?? []).map((c) => ({
        country: c.dimensions.metric || "Unknown",
        visits: c.sum.visits,
      })),
      topBrowsers: (account?.topBrowsers ?? []).map((b) => ({
        browser: b.dimensions.metric || "Unknown",
        visits: b.sum.visits,
      })),
      topOS: (account?.topOS ?? []).map((o) => ({
        os: o.dimensions.metric || "Unknown",
        visits: o.sum.visits,
      })),
      topDevices: (account?.topDevices ?? []).map((d) => ({
        device: d.dimensions.metric || "Unknown",
        visits: d.sum.visits,
      })),
      webVitals: account?.webVitals?.[0]
        ? {
            lcpP75:
              account.webVitals[0].quantiles.largestContentfulPaintP75 / 1000,
            fidP75: account.webVitals[0].quantiles.firstInputDelayP75 / 1000,
            clsP75: account.webVitals[0].quantiles.cumulativeLayoutShiftP75,
            inpP75:
              account.webVitals[0].quantiles.interactionToNextPaintP75 / 1000,
            ttfbP75: account.webVitals[0].quantiles.timeToFirstByteP75 / 1000,
          }
        : null,
    }
  })
