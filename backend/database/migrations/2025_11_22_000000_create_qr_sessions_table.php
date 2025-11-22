<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('qr_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('qr_code')->unique(); // Unique QR code
            $table->string('qr_hash'); // Hash for validation
            $table->timestamp('expires_at'); // QR expiration time
            $table->boolean('is_used')->default(false); // Track if QR was scanned
            $table->timestamp('used_at')->nullable(); // When QR was used
            $table->timestamps();

            // Index for quick lookup
            $table->index(['user_id', 'expires_at']);
            $table->index('qr_code');
        });
    }

    public function down()
    {
        Schema::dropIfExists('qr_sessions');
    }
};
