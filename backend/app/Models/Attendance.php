<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 
        'event_id', 
        'status', 
        'scanned_at'
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    // Status constants
    const STATUS_PRESENT = 'present';
    const STATUS_ABSENT = 'absent';
    const STATUS_LATE = 'late';

    // Check if attendance is present
    public function getIsPresentAttribute()
    {
        return $this->status === self::STATUS_PRESENT;
    }

    // Check if attendance is absent
    public function getIsAbsentAttribute()
    {
        return $this->status === self::STATUS_ABSENT;
    }

    // Check if attendance is late
    public function getIsLateAttribute()
    {
        return $this->status === self::STATUS_LATE;
    }

    // Get status with badge color (for frontend)
    public function getStatusBadgeAttribute()
    {
        return match($this->status) {
            'present' => 'success',
            'absent' => 'danger',
            'late' => 'warning',
            default => 'secondary'
        };
    }
}