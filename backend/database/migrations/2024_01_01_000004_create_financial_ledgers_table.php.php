<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('financial_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['fine', 'payment', 'due']);
            $table->decimal('amount', 8, 2);
            $table->text('description');
            $table->decimal('balance_after', 8, 2)->default(0);
            $table->boolean('cleared')->default(false);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('financial_ledgers');
    }
};