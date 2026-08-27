<?php

namespace Tests\Unit;

use Illuminate\Console\Command;
use PHPUnit\Framework\TestCase;
use Rafeeq\Core\Console\ExpireStaleCommand;
use Rafeeq\Core\Console\FundTreasuryCommand;
use ReflectionClass;
use SplFileInfo;
use Symfony\Component\Finder\Finder;

/**
 * A console command must be constructible without the container.
 *
 * ── The build this rule exists to protect ─────────────────────────────────────
 *
 * Composer runs `php artisan package:discover` as a post-autoload hook, which happens
 * during `composer install` — BEFORE the CI workflow copies `.env.example` to `.env`.
 * So at that moment there is no `APP_ENV`, Laravel defaults to `production`, and
 * `SMS_DRIVER` defaults to `log`.
 *
 * `InfrastructureServiceProvider` deliberately THROWS on exactly that combination:
 * the log SMS driver outside local/testing would discard real messages, so refusing to
 * boot is correct. It is a good guard.
 *
 * Registered commands are instantiated when Artisan starts, `package:discover`
 * included. So the moment a console command constructor-injects something that reaches
 * `NotificationService`, resolving it reaches `SmsGateway`, the guard fires, and
 * `composer install` fails — with an error message about SMS drivers that says nothing
 * about the command that caused it.
 *
 * That is what happened: `ExpireStaleCommand` injected `TripService`, and a correct
 * safety guard became a red build with a misleading message. The dependency is only
 * needed when the command RUNS, so it belongs in `handle()`.
 *
 * ── Why reflection over the filesystem and not the container ──────────────────
 *
 * Booting the app to enumerate registered commands would resolve them, which is the
 * very thing under test. Reading the constructors statically asks the question without
 * triggering it, and it also catches a command that is written but not yet registered —
 * which is the moment to catch it, not after it is wired in.
 */
class ConsoleCommandBootTest extends TestCase
{
    /**
     * Every `Command` subclass in the codebase, by class name.
     *
     * @return list<array{0:string}>
     */
    public static function commands(): array
    {
        $root = dirname(__DIR__, 2);
        $finder = (new Finder)
            ->files()
            ->in([$root.'/Core', $root.'/Modules'])
            ->name('*Command.php')
            ->name('Prune*.php')
            ->name('Expire*.php')
            ->name('Match*.php')
            ->name('Fraud*.php');

        $out = [];
        /** @var SplFileInfo $file */
        foreach ($finder as $file) {
            // Only files under a Console/ directory are commands; the name filters
            // above are deliberately loose and would otherwise catch services.
            if (! str_contains(str_replace('\\', '/', $file->getPathname()), '/Console/')) {
                continue;
            }

            $relative = str_replace([$root.'/', '.php'], '', $file->getPathname());
            $class = 'Rafeeq\\'.str_replace('/', '\\', $relative);

            if (class_exists($class) && is_subclass_of($class, Command::class)) {
                $out[$class] = [$class];
            }
        }

        return array_values($out);
    }

    /**
     * @dataProvider commands
     */
    public function test_a_console_command_takes_no_constructor_dependencies(string $class): void
    {
        $constructor = (new ReflectionClass($class))->getConstructor();

        if ($constructor === null || $constructor->getDeclaringClass()->getName() !== $class) {
            // No constructor of its own — nothing to resolve. This is the norm.
            $this->assertTrue(true);

            return;
        }

        $required = array_filter(
            $constructor->getParameters(),
            fn (\ReflectionParameter $p) => ! $p->isOptional(),
        );

        $names = implode(', ', array_map(
            fn (\ReflectionParameter $p) => (string) $p->getType().' $'.$p->getName(),
            $required,
        ));

        $this->assertSame(
            [],
            array_values($required),
            "{$class} constructor-injects [{$names}]. Registered commands are instantiated during "
            .'`php artisan package:discover`, which Composer runs before .env exists — so a '
            .'dependency that reaches NotificationService/SmsGateway fails `composer install`. '
            .'Resolve it inside handle() with app() instead.',
        );
    }

    /** The two commands the rule was learned from, named so the intent is obvious. */
    public function test_the_sweeper_and_the_treasury_funder_are_both_construct_safe(): void
    {
        foreach ([
            ExpireStaleCommand::class,
            FundTreasuryCommand::class,
        ] as $class) {
            $constructor = (new ReflectionClass($class))->getConstructor();
            $own = $constructor !== null && $constructor->getDeclaringClass()->getName() === $class;

            $this->assertFalse(
                $own && $constructor->getNumberOfRequiredParameters() > 0,
                "{$class} must not require constructor arguments.",
            );
        }
    }
}
