<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * Add URIs that should be excluded from CSRF verification.
     * For a Sanctum SPA flow, DO NOT exclude /sanctum/csrf-cookie or /api/login.
     */
    protected $except = [
        //'sanctum/csrf-cookie',
       // 'api/*', // ✅ Add this line to disable CSRF for all API routes
       
    ];
}
