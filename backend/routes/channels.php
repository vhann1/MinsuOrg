<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are used
| to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Private channel for user updates
Broadcast::private('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Presence channel for organization
Broadcast::presence('organization.{organizationId}', function ($user, $organizationId) {
    if ($user->organization_id == $organizationId) {
        return ['id' => $user->id, 'name' => $user->first_name . ' ' . $user->last_name];
    }
});
