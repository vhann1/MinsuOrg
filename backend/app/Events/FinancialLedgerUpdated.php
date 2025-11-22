<?php

namespace App\Events;

use App\Models\FinancialLedger;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithBroadcasting;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FinancialLedgerUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithBroadcasting, SerializesModels;

    public $ledger;
    public $user;

    /**
     * Create a new event instance.
     */
    public function __construct(FinancialLedger $ledger)
    {
        $this->ledger = $ledger;
        $this->user = $ledger->user;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Broadcast to the user's private channel
        return [
            new PrivateChannel('user.' . $this->user->id),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->ledger->id,
            'user_id' => $this->user->id,
            'type' => $this->ledger->type,
            'amount' => $this->ledger->amount,
            'description' => $this->ledger->description,
            'balance_after' => $this->ledger->balance_after,
            'cleared' => $this->ledger->cleared,
            'created_at' => $this->ledger->created_at,
            'message' => "{$this->ledger->type}: ₱" . number_format($this->ledger->amount, 2) . " - {$this->ledger->description}",
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'financial.updated';
    }
}
