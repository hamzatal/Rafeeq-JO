<?php

namespace Rafeeq\Modules\Ads\Services;

use Illuminate\Support\Collection;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Modules\Ads\Models\AdBanner;
use Rafeeq\Modules\Auth\Models\User;

class AdBannerService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Live banners for a placement, ordered for display.
     *
     * @return Collection<int, AdBanner>
     */
    public function activeFor(string $placement): Collection
    {
        return AdBanner::query()
            ->live()
            ->where('placement', $placement)
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get();
    }

    /** @return Collection<int, AdBanner> */
    public function all(?string $placement = null): Collection
    {
        return AdBanner::query()
            ->when($placement, fn ($q) => $q->where('placement', $placement))
            ->orderBy('placement')
            ->orderBy('sort_order')
            ->get();
    }

    public function create(array $data, ?User $actor): AdBanner
    {
        $banner = AdBanner::create($data);
        $this->audit->log('ad_banner.created', $actor, auditable: $banner);

        // Reload so DB-level defaults (is_active, sort_order) are reflected.
        return $banner->refresh();
    }

    public function update(AdBanner $banner, array $data, ?User $actor): AdBanner
    {
        $banner->fill($data)->save();
        $this->audit->log('ad_banner.updated', $actor, auditable: $banner);

        return $banner->fresh();
    }

    public function delete(AdBanner $banner, ?User $actor): void
    {
        $this->audit->log('ad_banner.deleted', $actor, auditable: $banner);
        $banner->delete();
    }
}
