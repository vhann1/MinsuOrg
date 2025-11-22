<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'student_id',
        'first_name',
        'last_name',
        'email',
        'password',
        'qr_code',
        'is_officer',
        'organization_member',
        'can_scan',
        'organization_id'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_officer' => 'boolean',
        'organization_member' => 'boolean',
        'can_scan' => 'boolean',
    ];

    // Relationships
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function financialLedgers()
    {
        return $this->hasMany(FinancialLedger::class);
    }

    // Get full name
    public function getFullNameAttribute()
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    // Get current balance
    public function getCurrentBalanceAttribute()
    {
        $lastLedger = $this->financialLedgers()->latest()->first();
        return $lastLedger ? $lastLedger->balance_after : 0;
    }

    // Check if cleared
    public function getIsClearedAttribute()
    {
        return $this->current_balance <= 0;
    }

    // app/Models/User.php - Add these methods
public function isAdmin()
{
    return $this->is_officer && $this->email === 'admin@gmail.com';
}

public function canScanQR()
{
    return $this->is_officer || $this->organization_member; // Add organization_member to users table
}
}