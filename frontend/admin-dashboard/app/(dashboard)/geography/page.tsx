'use client';

import { TabbedPage } from '../../../src/components/TabbedPage';
import { ZonesView } from '../../../src/views/ZonesView';
import { ZonePricesView } from '../../../src/views/ZonePricesView';
import { RoutesView } from '../../../src/views/RoutesView';
import { UniversitiesView } from '../../../src/views/UniversitiesView';

/**
 * الجغرافيا والمسارات — zones, their prices, routes and universities.
 *
 * These were four sidebar entries, and an operator opening a new corridor had to walk
 * all four to do one job: draw the zone, price the (zone ↔ university) pair, add the
 * route, confirm the university exists. The price matrix is meaningless without the
 * zone and the university, so separating them was separating a task from itself.
 */
export default function GeographyPage() {
  return (
    <TabbedPage
      href="/geography"
      render={(tab) =>
        tab === 'prices' ? (
          <ZonePricesView />
        ) : tab === 'routes' ? (
          <RoutesView />
        ) : tab === 'universities' ? (
          <UniversitiesView />
        ) : (
          <ZonesView />
        )
      }
    />
  );
}
