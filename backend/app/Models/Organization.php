<?php
// app/Models/Organization.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
// REMOVE this line: use Illuminate\Database\Eloquent\SoftDeletes;

class Organization extends Model
{
    use HasFactory; // REMOVE: , SoftDeletes

    protected $fillable = [
        'name', 
        'code', 
        'attendance_fine',
        'description'
    ];

    protected $casts = [
        'attendance_fine' => 'decimal:2',
    ];

    protected $appends = [
        'total_members',
        'total_officers',
        'total_events'
    ];

    // Relationships
    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function events()
    {
        return $this->hasMany(Event::class);
    }

    public function officers()
    {
        return $this->hasMany(User::class)->where('is_officer', true);
    }

    public function members()
    {
        return $this->hasMany(User::class)->where('is_officer', false);
    }

    // Accessors
    public function getTotalMembersAttribute()
    {
        return $this->users()->count();
    }

    public function getTotalOfficersAttribute()
    {
        return $this->officers()->count();
    }

    public function getTotalEventsAttribute()
    {
        return $this->events()->count();
    }

    public function getActiveEventsAttribute()
    {
        return $this->events()->where('is_active', true)->get();
    }

    // Methods
    public function getAttendanceFineAmount(): float
    {
        return (float) $this->attendance_fine;
    }

    // Validation rules
    public static function validationRules($id = null): array
    {
        return [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:organizations,code,' . $id,
            'attendance_fine' => 'required|numeric|min:0|max:10000',
            'description' => 'nullable|string|max:500'
        ];
    }
}