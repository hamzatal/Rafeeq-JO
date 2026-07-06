<?php

namespace Rafeeq\Core\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams CSV downloads without buffering the whole dataset in memory.
 * Prepends a UTF-8 BOM so Arabic text renders correctly in Excel.
 */
class Csv
{
    /**
     * @param  array<int, string>  $headers
     * @param  iterable<int, array<int, mixed>>|callable  $rows  Rows to write, or a
     *                                                           callable that receives a writer `fn(array $row): void` for streaming.
     */
    public static function download(string $filename, array $headers, iterable|callable $rows): StreamedResponse
    {
        $callback = function () use ($headers, $rows): void {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
            fputcsv($out, $headers);

            if (is_callable($rows)) {
                $rows(function (array $row) use ($out): void {
                    fputcsv($out, $row);
                });
            } else {
                foreach ($rows as $row) {
                    fputcsv($out, $row);
                }
            }

            fclose($out);
        };

        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
