<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'name' => 'Rafeeq Platform API',
    'version' => 'v1',
    'docs' => '/docs',
]));
