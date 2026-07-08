<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Living API contract test (Phase 5 — integration health).
 *
 * Guarantees the three frontend apps (student / driver / admin) never call an
 * endpoint the backend does not expose. It parses the shared `ENDPOINTS` map
 * and every `api-client` HTTP call, then asserts each resolved (method, path)
 * pair exists in the registered Laravel routes. This catches integration
 * regressions (a renamed/removed route, a wrong HTTP verb) at test time instead
 * of as a runtime 404/405 in a shipped app.
 *
 * Skips gracefully when the frontend workspace is not checked out alongside the
 * backend (e.g. an isolated backend-only checkout).
 */
class ApiContractTest extends TestCase
{
    private function frontendPath(string $rel): string
    {
        return base_path('../frontend/'.$rel);
    }

    /** normalized backend path => set of HTTP methods */
    private function backendRoutes(): array
    {
        $map = [];
        /** @var iterable<\Illuminate\Routing\Route> $routes */
        $routes = Route::getRoutes();
        foreach ($routes as $route) {
            $uri = $route->uri();
            if (! str_starts_with($uri, 'api/')) {
                continue;
            }
            $path = '/'.preg_replace('/\{[^}]+\??\}/', '{}', $uri);
            foreach ($route->methods() as $m) {
                $map[$path][$m] = true;
            }
        }

        return $map;
    }

    /** Resolve the shared ENDPOINTS object into  dotted.key => /api/v1/normalized/path */
    private function endpointMap(string $constantsSrc): array
    {
        $start = strpos($constantsSrc, 'export const ENDPOINTS');
        $body = substr($constantsSrc, $start);

        $stack = [];
        $full = [];
        foreach (preg_split('/\r?\n/', $body) as $raw) {
            $line = trim($raw);

            if (preg_match('/^(\w+):\s*\{/', $line, $mm)) {
                $stack[] = $mm[1];

                continue;
            }
            if (preg_match("/^(\w+):\s*'(\/[^']*)'/", $line, $mm)) {
                $dotted = implode('.', array_merge($stack, [$mm[1]]));
                $full[$dotted] = '/api/v1'.preg_replace('/\$\{[^}]+\}/', '{}', $mm[2]);

                continue;
            }
            if (preg_match('/^(\w+):\s*\([^)]*\)\s*=>\s*`(\/[^`]*)`/', $line, $mm)) {
                $dotted = implode('.', array_merge($stack, [$mm[1]]));
                $full[$dotted] = '/api/v1'.preg_replace('/\$\{[^}]+\}/', '{}', $mm[2]);

                continue;
            }
            // pop one level per closing brace on the line
            foreach (str_split($line) as $ch) {
                if ($ch === '}' && $stack) {
                    array_pop($stack);
                }
            }
        }

        return $full;
    }

    public function test_every_frontend_endpoint_has_a_backend_route(): void
    {
        $constants = $this->frontendPath('packages/shared/src/constants.ts');
        if (! is_file($constants)) {
            $this->markTestSkipped('frontend workspace not present');
        }

        $backend = $this->backendRoutes();
        $endpoints = $this->endpointMap(file_get_contents($constants));
        $this->assertNotEmpty($endpoints, 'failed to parse ENDPOINTS');

        $missing = [];
        foreach ($endpoints as $key => $path) {
            if (! isset($backend[$path]) && ! isset($backend[preg_replace('#^/api/v1#', '/api', $path)])) {
                $missing[] = "$key -> $path";
            }
        }

        $this->assertSame([], $missing, "Frontend endpoints without a backend route:\n".implode("\n", $missing));
    }

    public function test_api_client_calls_match_backend_method_and_path(): void
    {
        $constants = $this->frontendPath('packages/shared/src/constants.ts');
        $clientDir = $this->frontendPath('packages/api-client/src');
        if (! is_file($constants) || ! is_dir($clientDir)) {
            $this->markTestSkipped('frontend workspace not present');
        }

        $backend = $this->backendRoutes();
        $endpoints = $this->endpointMap(file_get_contents($constants));

        $methodMap = ['get' => 'GET', 'post' => 'POST', 'patch' => 'PATCH', 'put' => 'PUT', 'delete' => 'DELETE'];
        $problems = [];
        $checked = 0;

        foreach (glob($clientDir.'/*.ts') as $file) {
            $code = file_get_contents($file);
            if (! preg_match_all(
                '/this\.http\.(get|post|patch|put|delete)(?:<[^(]*)?\(\s*ENDPOINTS\.([\w.]+)/',
                $code,
                $matches,
                PREG_SET_ORDER
            )) {
                continue;
            }

            foreach ($matches as $m) {
                $method = $methodMap[$m[1]];
                $ref = $m[2];
                if (! isset($endpoints[$ref])) {
                    continue; // dynamically built path — not statically resolvable
                }
                $path = $endpoints[$ref];
                $checked++;
                $methods = $backend[$path] ?? null;
                if ($methods === null) {
                    $problems[] = basename($file).": $method ENDPOINTS.$ref -> $path :: NO ROUTE";
                } elseif (! isset($methods[$method])) {
                    $have = implode(',', array_keys(array_diff_key($methods, ['HEAD' => true])));
                    $problems[] = basename($file).": $method ENDPOINTS.$ref -> $path :: backend has [$have]";
                }
            }
        }

        $this->assertGreaterThan(100, $checked, 'expected to resolve many api-client calls');
        $this->assertSame([], $problems, "api-client / backend contract mismatches:\n".implode("\n", $problems));
    }
}
