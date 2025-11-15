<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 
        'description', 
        'start_time', 
        'end_time', 
        'is_active', 
        'organization_id'
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'is_active' => 'boolean',
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

    // Check if event is currently active
    public function isActiveNow()
    {
        $now = now();
        return $this->is_active && 
               $this->start_time <= $now && 
               $this->end_time >= $now;
    }

    // Check if event has ended
    public function hasEnded()
    {
        return $this->end_time < now();
    }

    // Get present count
    public function getPresentCountAttribute()
    {
        return $this->attendances()->where('status', 'present')->count();
    }

    // Get absent count
    public function getAbsentCountAttribute()
    {
        return $this->attendances()->where('status', 'absent')->count();
    }

    // Get attendance rate
    public function getAttendanceRateAttribute()
    {
        $totalMembers = $this->organization->users()->where('organization_member', true)->count();
        if ($totalMembers === 0) return 0;
        
        return ($this->present_count / $totalMembers) * 100;
    }

    // Get total members in organization
    public function getTotalMembersAttribute()
    {
        return $this->organization->users()->where('organization_member', true)->count();
    }

    // Auto-mark absent students for expired events
    public function markAbsentStudents()
    {
        // Only mark absent if event has ended and not already processed
        if (!$this->hasEnded() || $this->absent_count > 0) {
            return 0;
        }

        $organizationMembers = $this->organization->users()
            ->where('organization_member', true)
            ->get();

        $absentCount = 0;

        foreach ($organizationMembers as $member) {
            // Check if member already has attendance record
            $existingAttendance = $this->attendances()
                ->where('user_id', $member->id)
                ->exists();

            if (!$existingAttendance) {
                // Mark as absent
                Attendance::create([
                    'user_id' => $member->id,
                    'event_id' => $this->id,
                    'status' => 'absent',
                    'marked_at' => now()
                ]);

                // Apply attendance fine if configured
                if ($this->organization->attendance_fine > 0) {
                    $this->applyAbsenceFine($member);
                }

                $absentCount++;
            }
        }

        return $absentCount;
    }

    // Apply fine for absence
    protected function applyAbsenceFine(User $user)
    {
        $fineAmount = $this->organization->attendance_fine;

        // Get current balance
        $lastLedger = $user->financialLedgers()->latest()->first();
        $currentBalance = $lastLedger ? $lastLedger->balance_after : 0;

        // Create fine entry
        FinancialLedger::create([
            'user_id' => $user->id,
            'description' => "Absence fine - {$this->title}",
            'amount' => -$fineAmount, // Negative amount for fine
            'balance_before' => $currentBalance,
            'balance_after' => $currentBalance - $fineAmount,
            'type' => 'fine',
            'recorded_at' => now()
        ]);
    }

    // Get students who attended
    public function getPresentStudents()
    {
        return $this->attendances()
            ->where('status', 'present')
            ->with('user')
            ->get()
            ->pluck('user');
    }

    // Get students who were absent
    public function getAbsentStudents()
    {
        return $this->attendances()
            ->where('status', 'absent')
            ->with('user')
            ->get()
            ->pluck('user');
    }

    // Check if a specific student attended
    public function didStudentAttend($userId)
    {
        return $this->attendances()
            ->where('user_id', $userId)
            ->where('status', 'present')
            ->exists();
    }

    // Scope for active events
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Scope for upcoming events
    public function scopeUpcoming($query)
    {
        return $query->where('start_time', '>', now());
    }

    // Scope for past events
    public function scopePast($query)
    {
        return $query->where('end_time', '<', now());
    }

    // Scope for events that need absent marking
    public function scopeNeedAbsentMarking($query)
    {
        return $query->where('end_time', '<', now())
                    ->whereHas('attendances', function($q) {
                        $q->where('status', 'absent');
                    }, '<', 1); // Events with no absent records
    }
}