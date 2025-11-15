<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialLedger extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'description',
        'balance_after',
        'cleared'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'cleared' => 'boolean',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Type constants
    const TYPE_FINE = 'fine';
    const TYPE_PAYMENT = 'payment';
    const TYPE_DUE = 'due';

    // Check if entry is a fine
    public function getIsFineAttribute()
    {
        return $this->type === self::TYPE_FINE;
    }

    // Check if entry is a payment
    public function getIsPaymentAttribute()
    {
        return $this->type === self::TYPE_PAYMENT;
    }

    // Check if entry is a due
    public function getIsDueAttribute()
    {
        return $this->type === self::TYPE_DUE;
    }

    // Get amount with sign (for display)
    public function getAmountWithSignAttribute()
    {
        return $this->is_payment ? -$this->amount : $this->amount;
    }

    // Get type badge color (for frontend)
    public function getTypeBadgeAttribute()
    {
        return match($this->type) {
            'fine' => 'danger',
            'payment' => 'success',
            'due' => 'info',
            default => 'secondary'
        };
    }

    // Scope for fines
    public function scopeFines($query)
    {
        return $query->where('type', self::TYPE_FINE);
    }

    // Scope for payments
    public function scopePayments($query)
    {
        return $query->where('type', self::TYPE_PAYMENT);
    }

    // Scope for dues
    public function scopeDues($query)
    {
        return $query->where('type', self::TYPE_DUE);
    }
}