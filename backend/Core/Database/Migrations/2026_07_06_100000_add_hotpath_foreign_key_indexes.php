<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Performance: Postgres does NOT auto-index foreign-key columns. This adds
 * indexes for the FK/composite columns actually used in hot query paths
 * (joins, matching, listings, per-user checks) so those queries stay O(log n)
 * as data grows — without over-indexing rarely-filtered admin columns
 * (reviewed_by/handled_by/resolved_by…), which would only add write cost.
 *
 * Every index below was verified absent by static analysis of all migrations.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $t) {
            $t->index('driver_id', 'trips_driver_id_index');                                   // captain's trips
            $t->index('route_id', 'trips_route_id_index');                                     // trips on a route
            $t->index(['university_id', 'status', 'scheduled_at'], 'trips_univ_status_sched_index'); // listings/matching
        });

        Schema::table('ride_requests', function (Blueprint $t) {
            $t->index('trip_id', 'ride_requests_trip_id_index');                 // end()/cancel() bulk updates
            $t->index('subscription_id', 'ride_requests_subscription_id_index'); // subscription usage
        });

        Schema::table('trip_passengers', function (Blueprint $t) {
            $t->index('subscription_id', 'trip_passengers_subscription_id_index'); // consume/finalization
        });

        Schema::table('subscriptions', function (Blueprint $t) {
            $t->index('plan_id', 'subscriptions_plan_id_index');
            $t->index('route_id', 'subscriptions_route_id_index');
        });

        Schema::table('subscription_plans', function (Blueprint $t) {
            $t->index('university_id', 'subscription_plans_university_id_index'); // student plan listing
            $t->index('route_id', 'subscription_plans_route_id_index');
        });

        Schema::table('pickup_points', function (Blueprint $t) {
            $t->index('university_id', 'pickup_points_university_id_index');
        });

        Schema::table('routes', function (Blueprint $t) {
            $t->index('university_id', 'routes_university_id_index');
        });

        Schema::table('vehicles', function (Blueprint $t) {
            $t->index('driver_id', 'vehicles_driver_id_index'); // a captain's vehicles
        });

        Schema::table('cancellation_logs', function (Blueprint $t) {
            $t->index('trip_id', 'cancellation_logs_trip_id_index');
        });

        Schema::table('ghost_trip_watches', function (Blueprint $t) {
            $t->index('trip_id', 'ghost_trip_watches_trip_id_index'); // safety sweep
        });

        Schema::table('sos_incidents', function (Blueprint $t) {
            $t->index('user_id', 'sos_incidents_user_id_index');
            $t->index('trip_id', 'sos_incidents_trip_id_index');
        });

        Schema::table('ratings', function (Blueprint $t) {
            $t->index('rater_id', 'ratings_rater_id_index');
        });

        Schema::table('coupon_redemptions', function (Blueprint $t) {
            // Exact-match support for the locked per-user redemption re-check.
            $t->index(['coupon_id', 'user_id'], 'coupon_redemptions_coupon_user_index');
        });

        Schema::table('role_user', function (Blueprint $t) {
            $t->index('user_id', 'role_user_user_id_index'); // resolve a user's roles/permissions
        });

        Schema::table('permission_role', function (Blueprint $t) {
            $t->index('role_id', 'permission_role_role_id_index'); // resolve a role's permissions
        });

        Schema::table('audit_logs', function (Blueprint $t) {
            $t->index('user_id', 'audit_logs_user_id_index'); // audit filtering by actor
        });
    }

    public function down(): void
    {
        Schema::table('trips', fn (Blueprint $t) => $t->dropIndex('trips_driver_id_index'));
        Schema::table('trips', fn (Blueprint $t) => $t->dropIndex('trips_route_id_index'));
        Schema::table('trips', fn (Blueprint $t) => $t->dropIndex('trips_univ_status_sched_index'));
        Schema::table('ride_requests', fn (Blueprint $t) => $t->dropIndex('ride_requests_trip_id_index'));
        Schema::table('ride_requests', fn (Blueprint $t) => $t->dropIndex('ride_requests_subscription_id_index'));
        Schema::table('trip_passengers', fn (Blueprint $t) => $t->dropIndex('trip_passengers_subscription_id_index'));
        Schema::table('subscriptions', fn (Blueprint $t) => $t->dropIndex('subscriptions_plan_id_index'));
        Schema::table('subscriptions', fn (Blueprint $t) => $t->dropIndex('subscriptions_route_id_index'));
        Schema::table('subscription_plans', fn (Blueprint $t) => $t->dropIndex('subscription_plans_university_id_index'));
        Schema::table('subscription_plans', fn (Blueprint $t) => $t->dropIndex('subscription_plans_route_id_index'));
        Schema::table('pickup_points', fn (Blueprint $t) => $t->dropIndex('pickup_points_university_id_index'));
        Schema::table('routes', fn (Blueprint $t) => $t->dropIndex('routes_university_id_index'));
        Schema::table('vehicles', fn (Blueprint $t) => $t->dropIndex('vehicles_driver_id_index'));
        Schema::table('cancellation_logs', fn (Blueprint $t) => $t->dropIndex('cancellation_logs_trip_id_index'));
        Schema::table('ghost_trip_watches', fn (Blueprint $t) => $t->dropIndex('ghost_trip_watches_trip_id_index'));
        Schema::table('sos_incidents', fn (Blueprint $t) => $t->dropIndex('sos_incidents_user_id_index'));
        Schema::table('sos_incidents', fn (Blueprint $t) => $t->dropIndex('sos_incidents_trip_id_index'));
        Schema::table('ratings', fn (Blueprint $t) => $t->dropIndex('ratings_rater_id_index'));
        Schema::table('coupon_redemptions', fn (Blueprint $t) => $t->dropIndex('coupon_redemptions_coupon_user_index'));
        Schema::table('role_user', fn (Blueprint $t) => $t->dropIndex('role_user_user_id_index'));
        Schema::table('permission_role', fn (Blueprint $t) => $t->dropIndex('permission_role_role_id_index'));
        Schema::table('audit_logs', fn (Blueprint $t) => $t->dropIndex('audit_logs_user_id_index'));
    }
};
