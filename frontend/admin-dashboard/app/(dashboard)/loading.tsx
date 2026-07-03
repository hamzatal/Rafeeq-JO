import { PageSkeleton } from '../../src/components/Skeleton';

/**
 * Instant placeholder shown while a dashboard route segment loads — replaces the
 * blank flash between navigations with an on-brand skeleton.
 */
export default function DashboardLoading() {
  return <PageSkeleton />;
}
